// Open questions:
// Esteban suggested that ProtocolBuffer in js is not the best alternative (he
// used protobufjs), apparently he had memory issues before: he suggested to use
// json + gzip instead

import * as WebSocket from 'ws'
import * as uuid from 'uuid/v4'
import { EnrichedWebSocket, V2, CommunicationArea } from './utils'
import {
  decodeMessageType,
  sendMessage,
  GenericMessage,
  MessageType,
  ChatMessage,
  PositionMessage,
  ClientDisconnectedFromServerMessage,
  ServerSetupRequestMessage
} from 'dcl-comm-protocol'

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

  if (msgTypeName) {
    payload['msgTypeName'] = msgTypeName
  }

  logger.debug(payload, 'Socket message event')
}

function errorSocketMessageEvent(ws: EnrichedWebSocket, msgType: MessageType, event: string, error: Error, msgTypeName?: string) {
  const id = ws.id
  const payload = { err: error, id, event, msgType }

  if (msgTypeName) {
    payload['msgTypeName'] = msgTypeName
  }

  logger.error(payload, 'Socket message error')
}

export class CommServer {
  private wss: WebSocket.Server

  constructor(wss: WebSocket.Server) {
    const self = this
    this.wss = wss

    this.wss.on('connection', (ws: EnrichedWebSocket) => {
      agent.incrementSocketConnection()
      const id = uuid()
      ws.id = id
      self.sendSetupMessage(ws)

      logSocketEvent(ws, 'connected')

      ws.on('message', (msg: Uint8Array) => {
        const msgType = decodeMessageType(msg)
        debugSocketMessageEvent(ws, msgType, 'dispatching')
        switch (msgType) {
          case MessageType.UNKNOWN: {
            self.onUnknownMessage(ws, msgType, msg)
            break
          }
          case MessageType.CHAT: {
            let message
            try {
              message = ChatMessage.deserializeBinary(msg)
            } catch (e) {
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'chat')
            }
            self.onChatMessage(ws, message)
            break
          }
          case MessageType.POSITION: {
            let message
            try {
              message = PositionMessage.deserializeBinary(msg)
            } catch (e) {
              errorSocketMessageEvent(ws, msgType, 'deserialize', e, 'position')
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
        agent.incrementSocketClosed()
        logSocketEvent(ws, 'closed')

        const msg = new ClientDisconnectedFromServerMessage()
        msg.setType(MessageType.CLIENT_DISCONNECTED_FROM_SERVER)
        msg.setPeerId(ws.id)
        msg.setTime(new Date().getTime())
        self.broadcast(ws, msg)
      })
    })

    this.wss.on('error', err => {
      // TODO: handle this
      logger.error({ err }, 'websocket server error')
    })
  }

  public close() {
    this.wss.close()
  }

  protected onPositionMessage(ws: EnrichedWebSocket, message: PositionMessage) {
    debugSocketMessageEvent(ws, MessageType.POSITION, 'processing', 'position')
    const msgTimestamp = message.getTime()
    if (!ws.lastPositionUpdate || ws.lastPositionUpdate < msgTimestamp) {
      ws.position = new V2(Math.trunc(message.getPositionX()), Math.trunc(message.getPositionY()))
    }

    if (msgTimestamp > 0) {
      // TODO: I'm hoping to get this from the ephemeral key, since it has to be uniq across all the servers
      message.setPeerId(ws.id)
      this.broadcast(ws, message)
    }
  }

  protected onChatMessage(ws: EnrichedWebSocket, message: ChatMessage) {
    debugSocketMessageEvent(ws, MessageType.CHAT, 'processing', 'chat')
    message.setPeerId(ws.id)
    this.broadcast(ws, message)
  }

  protected onUnknownMessage(ws: EnrichedWebSocket, messageType: MessageType, message) {
    debugSocketMessageEvent(ws, MessageType.UNKNOWN, 'processing', 'unknown')
  }

  protected sendSetupMessage(ws: WebSocket) {
    const message = new ServerSetupRequestMessage()
    message.setType(MessageType.SERVER_REQUEST_SETUP)
    message.setPositionUpdateMs(Math.floor(1000 / settings.updatesPerSecond))
    sendMessage(ws, message)
  }

  private broadcast(ws: EnrichedWebSocket, msg) {
    const genericMessage = msg as GenericMessage
    const msgType = genericMessage.getType()
    if (genericMessage.getType() === MessageType.UNKNOWN) {
      throw Error('cannot send a message without a type')
    }
    const bytes = msg.serializeBinary()

    if (!ws.position) {
      debugSocketMessageEvent(ws, msgType, 'skip_broadcast')
      agent.incrementBroadcastSkip()
      return
    }

    const commArea = new CommunicationArea(ws.position, settings.communicationRadius + settings.communicationRadiusTolerance)
    const totalClients = this.wss.clients.size
    let attemptToReach = 0

    const loopStart = new Date()
    this.wss.clients.forEach((client: EnrichedWebSocket) => {
      if (client !== ws && client.readyState === WebSocket.OPEN && commArea.contains(client)) {
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

    const loopDurationMs = new Date().getTime() - loopStart.getTime()
    agent.recordBroadcastLoopDuration(loopDurationMs)
    agent.recordBroadcastRation(totalClients, attemptToReach)
    debugSocketMessageEvent(ws, msgType, 'broadcast_complete')
  }
}
