// Open questions:
// Esteban suggested that ProtocolBuffer in js is not the best alternative (he
// used protobufjs), apparently he had memory issues before: he suggested to use
// json + gzip instead

// TODO handle uncaught errors

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
  ServerSetupRequestMessage
} from 'dcl-comm-protocol'

import * as bunyan from 'bunyan'

// TODO proper logging configuration
const logger = bunyan.createLogger({
  name: 'dcl-communication-server',
  serializers: bunyan.stdSerializers
})

// TODO move the options to a config file or something
const options = {
  updatesPerSecond: 10,
  communicationRadius: 10
}

export class CommServer {
  private wss: WebSocket.Server

  constructor(wss: WebSocket.Server) {
    const self = this
    this.wss = wss

    this.wss.on('connection', (ws: EnrichedWebSocket) => {
      const id = uuid()
      ws.id = id
      self.sendSetupMessage(ws)

      ws.on('message', (msg: Uint8Array) => {
        const msgType = decodeMessageType(msg)
        switch (msgType) {
          case MessageType.UNKNOWN: {
            self.onUnsupportedMessage(ws, msgType, msg)
            break
          }
          case MessageType.CHAT: {
            let message
            try {
              message = ChatMessage.deserializeBinary(msg)
            } catch (e) {
              const logPayload = { err: e, id, msg, msgType, msgTypeName: 'chat' }
              logger.error(logPayload, 'Cannot deserialize message')
            }
            self.onChatMessage(ws, message)
            break
          }
          case MessageType.POSITION: {
            let message
            try {
              message = PositionMessage.deserializeBinary(msg)
            } catch (e) {
              const logPayload = { err: e, id, msg, msgType, msgTypeName: 'position' }
              logger.error(logPayload, 'Cannot deserialize message')
            }
            self.onPositionMessage(ws, message)
            break
          }
          default: {
            const logPayload = { id, msg, msgType }
            logger.info(logPayload, 'Cannot deserialize message')
            break
          }
        }
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
    const msgTimestamp = message.getTime()
    if (!ws.lastPositionUpdate || ws.lastPositionUpdate < msgTimestamp) {
      ws.position = new V2(Math.trunc(message.getX()), Math.trunc(message.getY()))
    }

    if (msgTimestamp > 0) {
      this.broadcast(ws, message)
    }
  }

  protected onChatMessage(ws: EnrichedWebSocket, message: ChatMessage) {
    this.broadcast(ws, message)
  }

  protected onUnsupportedMessage(ws: EnrichedWebSocket, messageType: MessageType, message) {
    logger.info('unsupported message', messageType, message)
  }

  protected sendSetupMessage(ws: WebSocket) {
    const message = new ServerSetupRequestMessage()
    message.setType(MessageType.SERVER_REQUEST_SETUP)
    message.setUpdatesPerSecond(options.updatesPerSecond)
    sendMessage(ws, message)
  }

  private broadcast(ws: EnrichedWebSocket, msg) {
    const genericMessage = msg as GenericMessage
    const msgType = genericMessage.getType()
    if (genericMessage.getType() === MessageType.UNKNOWN) {
      throw Error('cannot send a message without a type')
    }
    const bytes = msg.serializeBinary()

    if (ws.position) {
      const commArea = new CommunicationArea(ws.position, options.communicationRadius)
      const totalClients = this.wss.clients.size
      let clientsReached = 0

      // TODO: metric time spent in this loop
      this.wss.clients.forEach((client: EnrichedWebSocket) => {
        if (client !== ws && client.readyState === WebSocket.OPEN && commArea.contains(client)) {
          clientsReached++
          client.send(bytes, err => {
            if (err) {
              // TODO: should be do something else here?
              logger.error({ err: err, id: client.id, msgType }, 'error sending to client')
            }
          })
        }
      })

      // TODO metric clientsReached/totalClients ratio
    }
  }
}
