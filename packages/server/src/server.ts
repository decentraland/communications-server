import * as WebSocket from 'ws'
import { decodeMessageType, sendMessage, GenericMessage, MessageType, ChatMessage, SetupMessage, PositionMessage } from 'dcl-comm-protocol'

const options = {
  updatesPerSecond: 10
}

//TODO proper logging
//TODO should we add a id to the websocket? should the websocket send one to us
//or should we provide one in the setup? in the client we have a peer id but I think that's random
//TODO if we add a ws id we should include that in the logs

export class CommServer {
  private wss: WebSocket.Server

  constructor(wss: WebSocket.Server) {
    const self = this
    this.wss = wss

    this.wss.on('connection', (ws: WebSocket) => {
      self.sendSetupMessage(ws)

      ws.on('message', (msg: Uint8Array) => {
        const msgType = decodeMessageType(msg)
        switch (msgType) {
          case MessageType.UNKNOWN:
            self.onUnsupportedMessage(ws, msgType, msg)
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
    })

    this.wss.on('error', function open(err) {
      console.log('SERVER ERROR', err)
    })
  }

  public close() {
    this.wss.close()
  }

  protected onPositionMessage(ws: WebSocket, message: PositionMessage) {
    this.broadcast(ws, message)
  }

  protected onChatMessage(ws: WebSocket, message: ChatMessage) {
    this.broadcast(ws, message)
  }

  protected onUnsupportedMessage(ws: WebSocket, messageType: MessageType, message) {
    console.log('unsupported message', messageType, message)
  }

  protected sendSetupMessage(ws: WebSocket) {
    var message = new SetupMessage()
    message.setType(MessageType.SETUP)
    message.setUpdatesPerSecond(options.updatesPerSecond)
    sendMessage(ws, message)
  }

  private broadcast(ws: WebSocket, msg) {
    const genericMessage = msg as GenericMessage
    if (!genericMessage.getType()) {
      throw Error('cannot send a message without a type')
    }
    const bytes = msg.serializeBinary()

    this.wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(bytes)
      }
    })
  }
}
