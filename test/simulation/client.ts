import * as WebSocket from 'ws'
import { ClientStrategy, CommClient } from 'dcl-comm-client'
import { V2 } from 'dcl-comm-server'
import * as querystring from 'querystring'

import {
  ChatMessage,
  PositionMessage,
  ServerSetupRequestMessage,
  ClientDisconnectedFromServerMessage,
  MessageType
} from 'dcl-comm-protocol'

class Strategy implements ClientStrategy {
  onPositionMessage(client: CommClient, message: PositionMessage) {}

  onChatMessage(client: CommClient, message: ChatMessage) {
    const peerId = message.getPeerId()
    const p = new V2(message.getPositionX(), message.getPositionY())
    const text = message.getText()
    console.log(`${peerId} says: ${text} from ${p.x}, ${p.y}`)
  }

  onSetupMessage(client: CommClient, message: ServerSetupRequestMessage) {
    const updatesEveryMs = message.getPositionUpdateMs()
    setInterval(() => {
      console.log('Sending position')
      client.sendPositionMessage(0, 0, 0, 0, 0, 0)
    }, updatesEveryMs)
  }

  onSocketError(client: CommClient, error) {
    console.error('socket error', error)
  }

  onSocketClosed(client: CommClient) {
    console.log('socket closed')
  }

  onClientDisconnectedFromServerMessage(client: CommClient, message: ClientDisconnectedFromServerMessage) {}
  onUnsupportedMessage(client: CommClient, messageType: MessageType, message) {}
}

export function startClient(host, port) {
  const params = {
    'x-identity': 'x',
    'x-certificate': 'x',
    'x-certificate-signature': 'x',
    'x-timestamp': 'x'
  }
  const qs = querystring.stringify(params)
  const ws = new WebSocket(`ws://${host}:${port}/connect?${qs}`)
  const strategy = new Strategy()
  return new CommClient(ws, strategy)
}
