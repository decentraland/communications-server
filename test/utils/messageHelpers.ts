import * as sinon from 'sinon'
import { decodeMessageType, MessageType, ChatMessage, ServerSetupRequestMessage, PositionMessage } from 'dcl-comm-protocol'

export function messageTypeMatcher(typeToMatch) {
  return sinon.match(msg => {
    const msgType = decodeMessageType(msg)
    return msgType === typeToMatch
  })
}

export function buildPositionMessage(x: number, y: number, time?: Date) {
  const m = new PositionMessage()
  m.setType(MessageType.POSITION)
  m.setX(x)
  m.setY(y)
  m.setTime((time ? time : new Date()).getTime())
  return m
}

export function buildChatMessage(x: number, y: number, text: string, time?: Date) {
  const m = new ChatMessage()
  m.setType(MessageType.CHAT)
  m.setX(x)
  m.setY(y)
  m.setText(text)
  m.setTime((time ? time : new Date()).getTime())
  return m
}

export function buildSetupMessage(updatesPerSecond: number) {
  const m = new ServerSetupRequestMessage()
  m.setType(MessageType.SERVER_REQUEST_SETUP)
  m.setUpdatesPerSecond(updatesPerSecond)
  return m
}
