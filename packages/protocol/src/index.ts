import { MessageType, GenericMessage } from './comm_pb'
import * as WebSocket from 'ws'

export function decodeMessageType(msg: Uint8Array) {
  try {
    return GenericMessage.deserializeBinary(msg).getType()
  } catch (e) {
    return MessageType.UNKNOWN
  }
}

export function sendMessage(ws: WebSocket, msg) {
  const genericMessage = msg as GenericMessage
  if (genericMessage.getType() === MessageType.UNKNOWN) {
    throw Error('cannot send a message without a type')
  }
  const bytes = msg.serializeBinary()

  return new Promise((resolve, reject) => {
    ws.send(bytes, err => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

export * from './comm_pb'
