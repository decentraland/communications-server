import { MessageType, GenericMessage } from './comm_pb'
import * as WebSocket from 'ws'

export function decodeMessageType(msg: Uint8Array) {
  try {
    return GenericMessage.deserializeBinary(msg).getType()
  } catch (e) {
    return MessageType.UNKNOWN
  }
}

export function sendMessage(ws: WebSocket, msg, callback?) {
  const genericMessage = msg as GenericMessage
  if (genericMessage.getType() === MessageType.UNKNOWN) {
    throw Error('cannot send a message without a type')
  }
  const bytes = msg.serializeBinary()
  ws.send(bytes, callback)
}

export * from './comm_pb'
