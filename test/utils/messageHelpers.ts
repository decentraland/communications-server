import * as sinon from 'sinon'
import {
  MessageType,
  FlowStatusMessage,
  ChatMessage,
  ProfileMessage,
  PositionMessage,
  ClientDisconnectedFromServerMessage,
  GenericMessage,
  FlowStatus
} from 'dcl-comm-protocol'

export function decodeMessageType(msg: Uint8Array) {
  try {
    return GenericMessage.deserializeBinary(msg).getType()
  } catch (e) {
    return MessageType.UNKNOWN_MESSAGE_TYPE
  }
}

export function messageTypeMatcher(typeToMatch) {
  return sinon.match(msg => {
    const msgType = decodeMessageType(msg)
    return msgType === typeToMatch
  })
}

export function buildPositionMessage(peerId: string, x: number, z: number, time?: number) {
  const m = new PositionMessage()
  m.setType(MessageType.POSITION)
  m.setTime(time ? time : Date.now())
  m.setPeerId(peerId)
  m.setPositionX(x)
  m.setPositionZ(z)
  return m
}

export function buildProfileMessage(
  peerId: string,
  x: number,
  z: number,
  avatarType: string,
  displayName: string,
  publicKey: string,
  time?: number
) {
  const m = new ProfileMessage()
  m.setType(MessageType.PROFILE)
  m.setTime(time ? time : Date.now())
  m.setPositionX(x)
  m.setPositionZ(z)
  m.setAvatarType(avatarType)
  m.setDisplayName(displayName)
  m.setPeerId(peerId)
  m.setPublicKey(publicKey)
  return m
}

export function buildChatMessage(peerId: string, x: number, z: number, text: string, time?: number) {
  const m = new ChatMessage()
  m.setTime(time ? time : Date.now())
  m.setType(MessageType.CHAT)
  m.setPeerId(peerId)
  m.setPositionX(x)
  m.setPositionZ(z)
  m.setText(text)
  return m
}

export function buildClientDisconnectedFromServerMessage(peerId: string, time?: number) {
  const m = new ClientDisconnectedFromServerMessage()
  m.setTime(time ? time : Date.now())
  m.setType(MessageType.CLIENT_DISCONNECTED_FROM_SERVER)
  m.setPeerId(peerId)
  return m
}

export function buildFlowStatusMessage(status: FlowStatus, time?: number) {
  const m = new FlowStatusMessage()
  m.setTime(time ? time : Date.now())
  m.setType(MessageType.FLOW_STATUS)
  m.setFlowStatus(status)
  return m
}
