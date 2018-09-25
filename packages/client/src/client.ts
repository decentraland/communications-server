import * as WebSocket from 'ws'
import { decodeMessageType, sendMessage, MessageType, ChatMessage, PositionMessage, ServerSetupRequestMessage } from 'dcl-comm-protocol'

interface ClientStrategy {
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
    this.strategy = strategy

    this.ws.on('message', (msg: Uint8Array) => {
      const msgType = decodeMessageType(msg)
      switch (msgType) {
        case MessageType.UNKNOWN:
          strategy.onUnsupportedMessage(ws, msgType, msg)
          break
        case MessageType.SERVER_REQUEST_SETUP:
          try {
            const message = ServerSetupRequestMessage.deserializeBinary(msg)
            strategy.onSetupMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize setup message', msg)
          }
          break
        case MessageType.CHAT:
          try {
            const message = ChatMessage.deserializeBinary(msg)
            strategy.onChatMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize chat message', msg)
          }
          break
        case MessageType.POSITION:
          try {
            const message = PositionMessage.deserializeBinary(msg)
            strategy.onPositionMessage(ws, message)
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
      console.log('CLIENT ERROR', err)
    })
  }
}
