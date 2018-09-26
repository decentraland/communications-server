import { getHeaders, UserData as EphemeralKey } from 'ephemeralkey'
import {
  MessageType,
  ChatMessage,
  PositionMessage,
  ServerSetupRequestMessage,
  ClientDisconnectedFromServerMessage,
  GenericMessage,
  ProfileMessage
} from 'dcl-comm-protocol'

export enum SocketReadyState {
  CONNECTING,
  OPEN,
  CLOSING,
  CLOSED
}

function decodeMessageType(msg: Uint8Array) {
  try {
    return GenericMessage.deserializeBinary(msg).getType()
  } catch (e) {
    return MessageType.UNKNOWN
  }
}
export interface ClientStrategy {
  getEphemeralKeys(): Promise<EphemeralKey>
  onSetupMessage(client: CommClient, message: ServerSetupRequestMessage)
  onPositionMessage(client: CommClient, message: PositionMessage)
  onProfileMessage(client: CommClient, message: ProfileMessage)
  onChatMessage(client: CommClient, message: ChatMessage)
  onClientDisconnectedFromServerMessage(client: CommClient, message: ClientDisconnectedFromServerMessage)
  onUnsupportedMessage(client: CommClient, messageType: MessageType, message)
  onClockSkewDetected(client: CommClient)
  onSocketClosed(client: CommClient)
  onSocketError(client: CommClient, error: any)
}

export class CommClient {
  private url: string
  private ws: WebSocket | null
  private useEphemeralKeys: boolean
  private strategy: ClientStrategy

  constructor(strategy: ClientStrategy) {
    this.strategy = strategy
  }

  public async connectToUrl(url, useEphemeralKeys: boolean) {
    this.url = url
    let wsUrl = url
    if (useEphemeralKeys) {
      const timestamp = new Date().getTime()
      const keys = await this.strategy.getEphemeralKeys()
      const headers = getHeaders(keys, {
        method: 'GET',
        url: this.url,
        timestamp,
        body: Buffer.alloc(0)
      })

      const qs = new URLSearchParams(headers).toString()
      wsUrl = `${this.url}?${qs}`
    }

    const ws = new WebSocket(wsUrl)
    this.connectToWs(ws)
    this.useEphemeralKeys = useEphemeralKeys
  }

  public connectToWs(ws: WebSocket) {
    this.ws = ws
    ws.binaryType = 'arraybuffer'
    ws.onmessage = event => {
      const data = event.data
      const msg = new Uint8Array(data)
      const msgType = decodeMessageType(msg)
      switch (msgType) {
        case MessageType.UNKNOWN: {
          this.strategy.onUnsupportedMessage(this, msgType, msg)
          break
        }
        case MessageType.SERVER_REQUEST_SETUP: {
          let message
          try {
            message = ServerSetupRequestMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize setup message', msg)
            break
          }
          this.strategy.onSetupMessage(this, message)
          break
        }
        case MessageType.CHAT: {
          let message
          try {
            message = ChatMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize chat message', msg)
            break
          }
          this.strategy.onChatMessage(this, message)
          break
        }
        case MessageType.POSITION: {
          let message
          try {
            message = PositionMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize position message', e, msg)
            break
          }
          this.strategy.onPositionMessage(this, message)
          break
        }
        case MessageType.PROFILE: {
          let message
          try {
            message = ProfileMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize position message', e, msg)
            break
          }
          this.strategy.onProfileMessage(this, message)
          break
        }
        case MessageType.CLIENT_DISCONNECTED_FROM_SERVER: {
          let message
          try {
            message = ClientDisconnectedFromServerMessage.deserializeBinary(msg)
          } catch (e) {
            console.error('cannot deserialize client disconnected message', e, msg)
            break
          }
          this.strategy.onClientDisconnectedFromServerMessage(this, message)
          break
        }
        case MessageType.CLOCK_SKEW_DETECTED: {
          this.strategy.onClockSkewDetected(this)
          break
        }
        default: {
          console.log('ignoring message with type', msgType)
          break
        }
      }
    }

    ws.onclose = event => {
      this.strategy.onSocketClosed(this)
    }

    ws.onerror = event => {
      this.strategy.onSocketError(this, event)
    }
  }

  public async reconnect() {
    if (!this.ws) {
      await this.connectToUrl(this.url, this.useEphemeralKeys)
    }
    if (this.ws.readyState === SocketReadyState.CLOSED) {
      console.log('reconnecting')
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      this.ws.close()
      await this.connectToUrl(this.url, this.useEphemeralKeys)
    }

    return this.ws.readyState
  }

  public sendPositionMessage(
    positionX: number,
    positionY: number,
    positionZ: number,
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    rotationW: number,
    time?: number
  ) {
    const m = new PositionMessage()
    m.setType(MessageType.POSITION)
    m.setTime(time ? time : new Date().getTime())
    m.setPositionX(positionX)
    m.setPositionY(positionY)
    m.setPositionZ(positionZ)
    m.setRotationX(rotationX)
    m.setRotationY(rotationY)
    m.setRotationZ(rotationZ)
    m.setRotationW(rotationW)

    return this.sendMessage(m)
  }

  public sendProfileMessage(
    positionX: number,
    positionY: number,
    avatarType: string,
    displayName: string,
    publicKey: string,
    time?: number
  ) {
    const m = new ProfileMessage()
    m.setType(MessageType.PROFILE)
    m.setTime(time ? time : new Date().getTime())
    m.setPositionX(positionX)
    m.setPositionY(positionY)
    m.setAvatarType(avatarType)
    m.setDisplayName(displayName)
    m.setPublicKey(publicKey)
    return this.sendMessage(m)
  }

  public sendPublicChatMessage(positionX: number, positionY: number, messageId: string, text: string, time?: number) {
    const m = new ChatMessage()
    m.setType(MessageType.CHAT)
    m.setTime(time ? time : new Date().getTime())
    m.setMessageId(messageId)
    m.setPositionX(positionX)
    m.setPositionY(positionX)
    m.setText(text)

    return this.sendMessage(m)
  }

  public close() {
    if (this.ws) {
      this.ws.close()
    }
  }

  public getStrategy(): ClientStrategy {
    return this.strategy
  }

  private sendMessage(msg) {
    const ws = this.ws
    if (ws && ws.readyState === SocketReadyState.OPEN) {
      const genericMessage = msg as GenericMessage
      if (genericMessage.getType() === MessageType.UNKNOWN) {
        throw Error('cannot send a message without a type')
      }
      const bytes = msg.serializeBinary()

      ws.send(bytes)
      return true
    }
    console.debug('ignoring message because socket is not ready', ws.readyState)
    return false
  }
}
