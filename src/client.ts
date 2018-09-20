import * as WebSocket from 'ws'
import { MessageType, ChatMessage, SetupMessage, PositionMessage } from '../proto/comm_pb'
import { decodeMessageType } from './wsUtils'

export class CommClient {
  private ws: WebSocket

  constructor(ws) {
    const self = this
    this.ws = ws

    this.ws.on('message', (msg: Uint8Array) => {
      const msgType = decodeMessageType(msg)
      switch (msgType) {
        case MessageType.UNKNOWN:
          self.onUnsupportedMessage(ws, msgType, msg)
          break
        case MessageType.SETUP:
          try {
            const message = SetupMessage.deserializeBinary(msg)
            self.onSetupMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize setup message', msg)
          }
          break
        case MessageType.CHAT:
          try {
            const message = ChatMessage.deserializeBinary(msg)
            self.onChatMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize chat message', msg)
          }
          break
        case MessageType.POSITION:
          try {
            const message = ChatMessage.deserializeBinary(msg)
            self.onChatMessage(ws, message)
          } catch (e) {
            console.error('cannot deserialize position message', msg)
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

  protected onSetupMessage(ws: WebSocket, message: SetupMessage) {}
  protected onPositionMessage(ws: WebSocket, message: PositionMessage) {}
  protected onChatMessage(ws: WebSocket, message: ChatMessage) {}
  protected onUnsupportedMessage(ws: WebSocket, messageType: MessageType, message) {}
}
