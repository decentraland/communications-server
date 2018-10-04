import * as sinon from 'sinon'
import {
  MessageType,
  ChatMessage,
  ServerSetupRequestMessage,
  PositionMessage,
  ClientDisconnectedFromServerMessage,
  GenericMessage
} from 'dcl-comm-protocol'

export function decodeMessageType(msg: Uint8Array) {
  try {
    return GenericMessage.deserializeBinary(msg).getType()
  } catch (e) {
    return MessageType.UNKNOWN
  }
}

export function messageTypeMatcher(typeToMatch) {
  return sinon.match(msg => {
    const msgType = decodeMessageType(msg)
    return msgType === typeToMatch
  })
}

export function buildPositionMessage(x: number, y: number, time?: number) {
  const m = new PositionMessage()
  m.setTime(time ? time : new Date().getTime())
  m.setType(MessageType.POSITION)
  m.setPositionX(x)
  m.setPositionY(y)
  return m
}

export function buildChatMessage(x: number, y: number, text: string, time?: number) {
  const m = new ChatMessage()
  m.setType(MessageType.CHAT)
  m.setPositionX(x)
  m.setPositionY(y)
  m.setText(text)
  m.setTime(time ? time : new Date().getTime())
  return m
}

export function buildSetupMessage(updatesPerSecond: number, time?: number) {
  const m = new ServerSetupRequestMessage()
  m.setTime(time ? time : new Date().getTime())
  m.setType(MessageType.SERVER_REQUEST_SETUP)
  m.setPositionUpdateMs(Math.floor(1000 / updatesPerSecond))
  return m
}

export function buildClientDisconnectedFromServerMessage(peerId: string, time?: number) {
  const m = new ClientDisconnectedFromServerMessage()
  m.setTime(time ? time : new Date().getTime())
  m.setType(MessageType.CLIENT_DISCONNECTED_FROM_SERVER)
  m.setPeerId(peerId)
  return m
}
