// package:
// file: src/comm.proto

import * as jspb from 'google-protobuf'

export class GenericMessage extends jspb.Message {
  getType(): MessageType
  setType(value: MessageType): void

  serializeBinary(): Uint8Array
  toObject(includeInstance?: boolean): GenericMessage.AsObject
  static toObject(includeInstance: boolean, msg: GenericMessage): GenericMessage.AsObject
  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }
  static serializeBinaryToWriter(message: GenericMessage, writer: jspb.BinaryWriter): void
  static deserializeBinary(bytes: Uint8Array): GenericMessage
  static deserializeBinaryFromReader(message: GenericMessage, reader: jspb.BinaryReader): GenericMessage
}

export namespace GenericMessage {
  export type AsObject = {
    type: MessageType
  }
}

export class ServerSetupRequestMessage extends jspb.Message {
  getType(): MessageType
  setType(value: MessageType): void

  getUpdatesPerSecond(): number
  setUpdatesPerSecond(value: number): void

  serializeBinary(): Uint8Array
  toObject(includeInstance?: boolean): ServerSetupRequestMessage.AsObject
  static toObject(includeInstance: boolean, msg: ServerSetupRequestMessage): ServerSetupRequestMessage.AsObject
  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }
  static serializeBinaryToWriter(message: ServerSetupRequestMessage, writer: jspb.BinaryWriter): void
  static deserializeBinary(bytes: Uint8Array): ServerSetupRequestMessage
  static deserializeBinaryFromReader(message: ServerSetupRequestMessage, reader: jspb.BinaryReader): ServerSetupRequestMessage
}

export namespace ServerSetupRequestMessage {
  export type AsObject = {
    type: MessageType
    updatesPerSecond: number
  }
}

export class PositionMessage extends jspb.Message {
  getType(): MessageType
  setType(value: MessageType): void

  getX(): number
  setX(value: number): void

  getY(): number
  setY(value: number): void

  getTime(): number
  setTime(value: number): void

  serializeBinary(): Uint8Array
  toObject(includeInstance?: boolean): PositionMessage.AsObject
  static toObject(includeInstance: boolean, msg: PositionMessage): PositionMessage.AsObject
  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }
  static serializeBinaryToWriter(message: PositionMessage, writer: jspb.BinaryWriter): void
  static deserializeBinary(bytes: Uint8Array): PositionMessage
  static deserializeBinaryFromReader(message: PositionMessage, reader: jspb.BinaryReader): PositionMessage
}

export namespace PositionMessage {
  export type AsObject = {
    type: MessageType
    x: number
    y: number
    time: number
  }
}

export class ChatMessage extends jspb.Message {
  getType(): MessageType
  setType(value: MessageType): void

  getX(): number
  setX(value: number): void

  getY(): number
  setY(value: number): void

  getText(): string
  setText(value: string): void

  getTime(): number
  setTime(value: number): void

  serializeBinary(): Uint8Array
  toObject(includeInstance?: boolean): ChatMessage.AsObject
  static toObject(includeInstance: boolean, msg: ChatMessage): ChatMessage.AsObject
  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }
  static serializeBinaryToWriter(message: ChatMessage, writer: jspb.BinaryWriter): void
  static deserializeBinary(bytes: Uint8Array): ChatMessage
  static deserializeBinaryFromReader(message: ChatMessage, reader: jspb.BinaryReader): ChatMessage
}

export namespace ChatMessage {
  export type AsObject = {
    type: MessageType
    x: number
    y: number
    text: string
    time: number
  }
}

export enum MessageType {
  UNKNOWN = 0,
  SERVER_REQUEST_SETUP = 1,
  POSITION = 2,
  CHAT = 3
}
