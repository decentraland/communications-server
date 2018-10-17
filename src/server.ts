// Open questions:
// Esteban suggested that ProtocolBuffer in js is not the best alternative (he
// used protobufjs), apparently he had memory issues before: he suggested to use
// json + gzip instead

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

import { logger } from './logger'
import { settings } from './settings'
import * as agent from './agent'

process.on('uncaughtException', err => {
  logger.error({ err }, 'Uncaught exception')
})

function logSocketEvent(ws: EnrichedWebSocket, event: string, error?: Error) {
  const id = ws.id
  if (error) {
    logger.error({ err: error, id, event: event }, 'Socket error')
  } else {
    logger.info({ id, event: event }, 'Socket event')
  }
}

function debugSocketMessageEvent(ws: EnrichedWebSocket, msgType: MessageType, event: string, msgTypeName?: string) {
  const id = ws.id
  const payload = { id, event, msgType }

  if (ws.peerId) {
    payload['peerId'] = ws.peerId
  }

  if (msgTypeName) {
    payload['msgTypeName'] = msgTypeName
  }

  logger.debug(payload, 'Socket message event')
}

function errorSocketMessageEvent(ws: EnrichedWebSocket, msgType: MessageType, event: string, error: Error, msgTypeName?: string) {
  const id = ws.id
  const payload = { err: error, id, event, msgType }

  if (ws.peerId) {
    payload['peerId'] = ws.peerId
  }

  if (msgTypeName) {
    payload['msgTypeName'] = msgTypeName
  }

  logger.error(payload, 'Socket message error')
}

function ping() {
  logger.debug('PING..')
}

export class CommServer {
  private wss: WebSocket.Server
  private checkConnectionsInterval

  constructor(wss: WebSocket.Server) {
    const self = this
    this.wss = wss

    this.wss.on('connection', (ws: EnrichedWebSocket) => {
      ws.isAlive = true
      ws.flowStatus = FlowStatus.CLOSE
      ws.on('pong', () => {
        ws.isAlive = true
      })
      agent.incrementConnectionOpen()
      agent.recordTotalConnections(this.wss.clients.size)
      const id = uuid()
      ws.id = id
      ws.peerId = null

      logSocketEvent(ws, 'connected')

      ws.on('message', (msg: Uint8Array) => {
        const now = Date.now()
        const [msgType, msgTimestamp] = decodeMessageHeader(msg)
        if (msgTimestamp > now) {
          // TODO: I get a consistent 1ms diff from chrome and the server running on my machine
          debugSocketMessageEvent(ws, msgType, 'clock_skew')
          const message = new ClockSkewMessage()
          message.setType(MessageType.CLOCK_SKEW_DETECTED)
          message.setTime(Date.now())
          this.sendMessage(ws, message)
          return
        }
        debugSocketMessageEvent(ws, msgType, 'dispatching')
        switch (msgType) {
          case MessageType.UNKNOWN_MESSAGE_TYPE: {
            self.onUnknownMessage(ws, msgType, msg)
            break
          }
          case MessageType.FLOW_STATUS: {
            let message
            try {
              message = FlowStatusMessage.deserializeBinary(msg)
            } catch (e) {
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'flow_status')
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
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'chat')
              break
            }
            self.onChatMessage(ws, message)
            break
          }
          case MessageType.PROFILE: {
            let message
            try {
              message = ProfileMessage.deserializeBinary(msg)
            } catch (e) {
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'profile')
              break
            }
            self.onProfileMessage(ws, message)
            break
          }
          case MessageType.POSITION: {
            let message
            try {
              message = PositionMessage.deserializeBinary(msg)
            } catch (e) {
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'position')
              break
            }
            self.onPositionMessage(ws, message)
            break
          }
          default: {
            debugSocketMessageEvent(ws, msgType, 'ignore_message')
            break
          }
        }
      })

      ws.on('error', err => {
        logSocketEvent(ws, 'error', err)
      })

      ws.on('close', () => {
        agent.incrementConnectionClosed()
        agent.recordTotalConnections(this.wss.clients.size)
        logSocketEvent(ws, 'closed')

        if (ws.peerId) {
          const msg = new ClientDisconnectedFromServerMessage()
          msg.setType(MessageType.CLIENT_DISCONNECTED_FROM_SERVER)
          msg.setPeerId(ws.peerId)
          msg.setTime(Date.now())
          self.broadcast(ws, msg)
        }
      })
    })

    this.wss.on('error', err => {
      // TODO: handle this
      logger.error({ err }, 'websocket server error')
    })

    this.checkConnectionsInterval = setInterval(() => {
      wss.clients.forEach((ws: EnrichedWebSocket) => {
        if (ws.isAlive === false) {
          logSocketEvent(ws, 'closing_broken_connection')
          agent.incrementConnectionBroken()
          return ws.terminate()
        }

        ws.isAlive = false
        ws.ping(ping)
      })
    }, settings.checkConnectionsIntervalMs)
  }

  public close() {
    if (this.checkConnectionsInterval) {
      clearInterval(this.checkConnectionsInterval)
    }
    this.wss.close()
  }

  protected onPositionMessage(ws: EnrichedWebSocket, message: PositionMessage) {
    debugSocketMessageEvent(ws, MessageType.POSITION, 'processing', 'position')
    const msgTimestamp = message.getTime()
    if (!ws.lastPositionUpdate || ws.lastPositionUpdate < msgTimestamp) {
      ws.position = new V2(Math.trunc(message.getPositionX()), Math.trunc(message.getPositionZ()))
    }

    if (msgTimestamp > 0) {
      this.broadcast(ws, message)
    }
  }

  protected onChatMessage(ws: EnrichedWebSocket, message: ChatMessage) {
    debugSocketMessageEvent(ws, MessageType.CHAT, 'processing', 'chat')
    this.broadcast(ws, message)
  }

  protected onProfileMessage(ws: EnrichedWebSocket, message: ProfileMessage) {
    debugSocketMessageEvent(ws, MessageType.PROFILE, 'processing', 'profile')
    if (!ws.peerId) {
      // TODO we are not doing much validation of the peer id really
      ws.peerId = message.getPeerId()
    }
    this.broadcast(ws, message)
  }

  protected onUnknownMessage(ws: EnrichedWebSocket, messageType: MessageType, message) {
    debugSocketMessageEvent(ws, MessageType.UNKNOWN_MESSAGE_TYPE, 'processing', 'unknown')
  }

  private broadcast(ws: EnrichedWebSocket, msg) {
    const genericMessage = msg as GenericMessage
    const msgType = genericMessage.getType()
    if (genericMessage.getType() === MessageType.UNKNOWN_MESSAGE_TYPE) {
      throw Error('cannot send a message without a type')
    }
    const bytes = msg.serializeBinary()

    if (!ws.position) {
      debugSocketMessageEvent(ws, msgType, 'skip_broadcast')
      agent.incrementBroadcastSkipped()
      return
    }

    const commArea = new CommunicationArea(ws.position, settings.communicationRadius + settings.communicationRadiusTolerance)
    const totalClients = this.wss.clients.size
    let attemptToReach = 0

    const loopStart = new Date()
    this.wss.clients.forEach((client: EnrichedWebSocket) => {
      if (client !== ws && client.readyState === WebSocket.OPEN && client.flowStatus === FlowStatus.OPEN && commArea.contains(client)) {
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
    debugSocketMessageEvent(ws, msgType, 'broadcast_complete')
    logger.debug({ totalClients, attemptToReach, msgType }, 'broadcast')
  }

  private sendMessage(ws: WebSocket, message) {
    const bytes = message.serializeBinary()
    ws.send(bytes)
  }
}
