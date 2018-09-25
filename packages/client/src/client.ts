import * as WebSocket from 'ws'
import { decodeMessageType, sendMessage, MessageType, ChatMessage, PositionMessage, ServerSetupRequestMessage } from 'dcl-comm-protocol'

export interface ClientStrategy {
  onSetupMessage(ws: WebSocket, message: ServerSetupRequestMessage)
  onPositionMessage(ws: WebSocket, message: PositionMessage)
  onChatMessage(ws: WebSocket, message: ChatMessage)
  onUnsupportedMessage(ws: WebSocket, messageType: MessageType, message)
}

export class CommClient {
  private ws: WebSocket
  private strategy: ClientStrategy

  constructor(ws, strategy: ClientStrategy) {
    const self = this
    this.ws = ws
    self.strategy = strategy

    this.ws.on('message', (msg: Uint8Array) => {
      const msgType = decodeMessageType(msg)
      switch (msgType) {
        case MessageType.UNKNOWN:
          self.strategy.onUnsupportedMessage(ws, msgType, msg)
          break
        case MessageType.SERVER_REQUEST_SETUP:
          try {
            const message = ServerSetupRequestMessage.deserializeBinary(msg)
            self.strategy.onSetupMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize setup message', msg)
          }
          break
        case MessageType.CHAT:
          try {
            const message = ChatMessage.deserializeBinary(msg)
            self.strategy.onChatMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize chat message', msg)
          }
          break
        case MessageType.POSITION:
          try {
            const message = PositionMessage.deserializeBinary(msg)
            self.strategy.onPositionMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize position message', e, msg)
          }
          break
        default:
          console.log('ignoring message with type', msgType)
          break
      }
    })

    this.ws.on('error', function open(err) {
      console.error('CLIENT ERROR', err)
    })
  }

  // TODO fields
  public sendPositionMessage(callback) {
    const m = new PositionMessage()
    m.setType(MessageType.POSITION)

    sendMessage(this.ws, m, callback)
  }

  // TODO fields
  public sendChatMessage(callback) {
    const m = new PositionMessage()
    m.setType(MessageType.CHAT)

    sendMessage(this.ws, m, callback)
  }
}
