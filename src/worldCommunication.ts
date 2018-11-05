import * as WebSocket from 'ws'
import * as uuid from 'uuid/v4'
import { EnrichedWebSocket, V2, CommunicationArea } from './utils'
import {
  FlowStatus,
  MessageType,
  GenericMessage,
  ChatMessage,
  PositionMessage,
  ClientDisconnectedFromServerMessage,
  ProfileMessage,
  ClockSkewMessage,
  FlowStatusMessage
} from 'dcl-comm-protocol'
import { WorldCommunicationConfig } from './config'
import { MetricsAgent } from './agent'
import * as Logger from 'bunyan'

export function decodeMessageHeader(data: Uint8Array): [MessageType, number] {
  try {
    const msg = GenericMessage.deserializeBinary(data)
    const msgType = msg.getType()
    const timestamp = msg.getTime()
    return [msgType, timestamp]
  } catch (e) {
    return [MessageType.UNKNOWN_MESSAGE_TYPE, 0]
  }
}

export class EventLogger {
  constructor(private logger) {}

  log(ws: EnrichedWebSocket, event: string) {
    const id = ws.id
    this.logger.info({ id, event: event }, 'Socket event')
  }

  error(ws: EnrichedWebSocket, event: string, error: Error) {
    const id = ws.id
    this.logger.error({ err: error, id, event: event }, 'Socket error')
  }

  debug(ws: EnrichedWebSocket, msgType: MessageType, event: string, msgTypeName?: string) {
    const id = ws.id
    const payload = { id, event, msgType }

    if (ws.peerId) {
      payload['peerId'] = ws.peerId
    }

    if (msgTypeName) {
      payload['msgTypeName'] = msgTypeName
    }

    this.logger.debug(payload, 'Socket message event')
  }

  messageError(ws: EnrichedWebSocket, msgType: MessageType, event: string, error: Error, msgTypeName?: string) {
    const id = ws.id
    const payload = { err: error, id, event, msgType }

    if (ws.peerId) {
      payload['peerId'] = ws.peerId
    }

    if (msgTypeName) {
      payload['msgTypeName'] = msgTypeName
    }

    this.logger.error(payload, 'Socket message error')
  }
}

type Config = {
  worldCommunicationConfig: WorldCommunicationConfig
  logger: Logger
  agent: MetricsAgent
}

export class WorldCommunicationState {
  public config: WorldCommunicationConfig
  public logger: Logger
  public agent: MetricsAgent

  public wss: WebSocket.Server
  public checkConnectionsInterval: any
  public eventLogger: EventLogger
}

export function init(config: Config, wss: WebSocket.Server): WorldCommunicationState {
  const eventLogger = new EventLogger(config.logger)
  const state = {
    config: config.worldCommunicationConfig,
    logger: config.logger,
    agent: config.agent,
    wss,
    checkConnectionsInterval: null,
    eventLogger
  } as WorldCommunicationState

  wss.on('error', err => {
    state.logger.error({ err }, 'websocket server error')
  })

  setInterval(() => checkConnections(state), state.config.checkConnectionsIntervalMs)

  wss.on('connection', (ws: EnrichedWebSocket) => {
    onNewConnection(state, ws)
  })

  return state
}

export function close(state: WorldCommunicationState) {
  if (state.checkConnectionsInterval) {
    clearInterval(state.checkConnectionsInterval)
  }
  state.wss.close()
}

export function onNewConnection(state: WorldCommunicationState, ws: EnrichedWebSocket) {
  const { logger, eventLogger, agent, wss } = state
  ws.isAlive = true
  ws.flowStatus = FlowStatus.CLOSE
  ws.on('pong', () => {
    ws.isAlive = true
  })
  agent.incrementConnectionOpen()
  agent.recordTotalConnections(wss.clients.size)
  const id = uuid()
  ws.id = id
  ws.peerId = null

  eventLogger.log(ws, 'connected')

  ws.on('message', (msg: Uint8Array) => {
    const now = Date.now()
    const [msgType, msgTimestamp] = decodeMessageHeader(msg)
    if (msgTimestamp > now) {
      // TODO: I get a consistent 1ms diff from chrome and the server running on my machine
      eventLogger.debug(ws, msgType, 'clock_skew')
      const message = new ClockSkewMessage()
      message.setType(MessageType.CLOCK_SKEW_DETECTED)
      message.setTime(Date.now())
      sendMessage(ws, message)
      return
    }
    eventLogger.debug(ws, msgType, 'dispatching')
    switch (msgType) {
      case MessageType.UNKNOWN_MESSAGE_TYPE: {
        eventLogger.debug(ws, MessageType.UNKNOWN_MESSAGE_TYPE, 'processing', 'unknown')
        break
      }
      case MessageType.FLOW_STATUS: {
        let message
        try {
          message = FlowStatusMessage.deserializeBinary(msg)
        } catch (e) {
          eventLogger.messageError(ws, msgType, 'deserialize', e, 'flow_status')
          break
        }

        const status = message.getFlowStatus()

        if (status !== FlowStatus.UNKNOWN_STATUS) {
          ws.flowStatus = status
        }
        break
      }
      case MessageType.CHAT: {
        let message
        try {
          message = ChatMessage.deserializeBinary(msg)
        } catch (e) {
          eventLogger.messageError(ws, msgType, 'deserialize', e, 'chat')
          break
        }
        eventLogger.debug(ws, MessageType.CHAT, 'processing', 'chat')
        broadcast(state, ws, message)
        break
      }
      case MessageType.PROFILE: {
        let message
        try {
          message = ProfileMessage.deserializeBinary(msg)
        } catch (e) {
          eventLogger.messageError(ws, msgType, 'deserialize', e, 'profile')
          break
        }
        eventLogger.debug(ws, MessageType.PROFILE, 'processing', 'profile')
        if (!ws.peerId) {
          // TODO we are not doing much validation of the peer id really
          ws.peerId = message.getPeerId()
        }
        broadcast(state, ws, message)
        break
      }
      case MessageType.POSITION: {
        let message
        try {
          message = PositionMessage.deserializeBinary(msg)
        } catch (e) {
          eventLogger.messageError(ws, msgType, 'deserialize', e, 'position')
          break
        }
        eventLogger.debug(ws, MessageType.POSITION, 'processing', 'position')
        const msgTimestamp = message.getTime()
        if (!ws.lastPositionUpdate || ws.lastPositionUpdate < msgTimestamp) {
          ws.position = new V2(Math.trunc(message.getPositionX()), Math.trunc(message.getPositionZ()))
          ws.lastPositionUpdate = msgTimestamp
          broadcast(state, ws, message)
        }

        break
      }
      default: {
        eventLogger.debug(ws, msgType, 'ignore_message')
        break
      }
    }
  })

  ws.on('error', err => {
    eventLogger.error(ws, 'error', err)
  })

  ws.on('close', () => {
    agent.incrementConnectionClosed()
    agent.recordTotalConnections(wss.clients.size)
    eventLogger.log(ws, 'closed')

    if (ws.peerId) {
      const msg = new ClientDisconnectedFromServerMessage()
      msg.setType(MessageType.CLIENT_DISCONNECTED_FROM_SERVER)
      msg.setPeerId(ws.peerId)
      msg.setTime(Date.now())
      broadcast(state, ws, msg)
    }
  })
}

export function checkConnections({ wss, agent, eventLogger, logger }: WorldCommunicationState) {
  wss.clients.forEach((ws: EnrichedWebSocket) => {
    if (ws.isAlive === false) {
      eventLogger.log(ws, 'closing_broken_connection')
      agent.incrementConnectionBroken()
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping(() => {
      logger.debug('PING..')
    })
  })
}

export function broadcast(state: WorldCommunicationState, ws: EnrichedWebSocket, msg) {
  const { wss, logger, eventLogger, agent, config } = state
  const genericMessage = msg as GenericMessage
  const msgType = genericMessage.getType()
  if (genericMessage.getType() === MessageType.UNKNOWN_MESSAGE_TYPE) {
    throw Error('cannot send a message without a type')
  }
  const bytes = msg.serializeBinary()

  if (!ws.position) {
    eventLogger.debug(ws, msgType, 'skip_broadcast')
    agent.incrementBroadcastSkipped()
    return
  }

  const commArea = new CommunicationArea(ws.position, config.communicationRadius + config.communicationRadiusTolerance)
  const totalClients = wss.clients.size
  let attemptToReach = 0

  const loopStart = new Date()
  wss.clients.forEach((client: EnrichedWebSocket) => {
    if (
      client !== ws &&
      client.readyState === WebSocket.OPEN &&
      client.flowStatus === FlowStatus.OPEN &&
      commArea.contains(client)
    ) {
      attemptToReach++
      client.send(bytes, err => {
        if (err) {
          logger.error({ err: err, id: client.id, msgType, event: 'send_message' }, 'error sending to client')
          agent.incrementBroadcastFailureMessageDelivery()
          return
        }
        agent.incrementBroadcastSuccessMessageDelivery()
      })
    }
  })

  const loopDurationMs = Date.now() - loopStart.getTime()
  agent.recordBroadcastLoopDuration(loopDurationMs)
  agent.recordBroadcastRatio(totalClients, attemptToReach)
  eventLogger.debug(ws, msgType, 'broadcast_complete')
  logger.debug({ totalClients, attemptToReach, msgType }, 'broadcast')
}

function sendMessage(ws: WebSocket, message) {
  const bytes = message.serializeBinary()
  ws.send(bytes)
}
