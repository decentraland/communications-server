import * as WebSocket from 'ws'
import {
  decodeMessageType,
  sendMessage,
  MessageType,
  ChatMessage,
  PositionMessage,
  ServerSetupRequestMessage,
  ClientDisconnectedFromServerMessage
} from 'dcl-comm-protocol'

export interface ClientStrategy {
  onSetupMessage(client: CommClient, message: ServerSetupRequestMessage)
  onPositionMessage(client: CommClient, message: PositionMessage)
  onChatMessage(client: CommClient, message: ChatMessage)
  onClientDisconnectedFromServerMessage(client: CommClient, message: ClientDisconnectedFromServerMessage)
  onUnsupportedMessage(client: CommClient, messageType: MessageType, message)
  onSocketError(error)
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
        case MessageType.UNKNOWN: {
          self.strategy.onUnsupportedMessage(self, msgType, msg)
          break
        }
        case MessageType.SERVER_REQUEST_SETUP: {
          let message
          try {
            message = ServerSetupRequestMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize setup message', msg)
          }
          self.strategy.onSetupMessage(self, message)
          break
        }
        case MessageType.CHAT: {
          let message
          try {
            message = ChatMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize chat message', msg)
          }
          self.strategy.onChatMessage(self, message)
          break
        }
        case MessageType.POSITION: {
          let message
          try {
            message = PositionMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize position message', e, msg)
          }
          self.strategy.onPositionMessage(self, message)
          break
        }
        case MessageType.CLIENT_DISCONNECTED_FROM_SERVER: {
          let message
          try {
            message = ClientDisconnectedFromServerMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize client disconnected message', e, msg)
          }
          self.strategy.onClientDisconnectedFromServerMessage(self, message)
          break
        }
        default: {
          console.log('ignoring message with type', msgType)
          break
        }
      }
    })

    this.ws.on('error', err => {
      console.error('socket error', err)
      strategy.onSocketError(err)
    })
  }

  public close() {
    this.ws.close()
  }

  public getStrategy(): ClientStrategy {
    return this.strategy
  }

  public sendPositionMessage(
    positionX: number,
    positionY: number,
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    rotationW: number,
    time?: Date
  ) {
    const m = new PositionMessage()
    m.setType(MessageType.POSITION)
    m.setPositionX(positionX)
    m.setPositionY(positionY)
    m.setRotationX(rotationX)
    m.setRotationY(rotationY)
    m.setRotationZ(rotationZ)
    m.setRotationW(rotationW)
    m.setTime((time ? time : new Date()).getTime())

    return sendMessage(this.ws, m)
  }

  public sendChatMessage(positionX: number, positionY: number, text: string, time?: Date) {
    const m = new ChatMessage()
    m.setType(MessageType.CHAT)
    m.setPositionX(positionX)
    m.setPositionY(positionX)
    m.setText(text)
    m.setTime((time ? time : new Date()).getTime())

    return sendMessage(this.ws, m)
  }
}
