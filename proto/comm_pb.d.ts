// package: 
// file: proto/comm.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class GenericMessage extends jspb.Message {
  getType(): MessageType;
  setType(value: MessageType): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenericMessage.AsObject;
  static toObject(includeInstance: boolean, msg: GenericMessage): GenericMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GenericMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenericMessage;
  static deserializeBinaryFromReader(message: GenericMessage, reader: jspb.BinaryReader): GenericMessage;
}

export namespace GenericMessage {
  export type AsObject = {
    type: MessageType,
  }
}

export class SetupMessage extends jspb.Message {
  getType(): MessageType;
  setType(value: MessageType): void;

  getUpdatesPerSecond(): number;
  setUpdatesPerSecond(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetupMessage.AsObject;
  static toObject(includeInstance: boolean, msg: SetupMessage): SetupMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SetupMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetupMessage;
  static deserializeBinaryFromReader(message: SetupMessage, reader: jspb.BinaryReader): SetupMessage;
}

export namespace SetupMessage {
  export type AsObject = {
    type: MessageType,
    updatesPerSecond: number,
  }
}

export class PositionMessage extends jspb.Message {
  getType(): MessageType;
  setType(value: MessageType): void;

  getX(): number;
  setX(value: number): void;

  getY(): number;
  setY(value: number): void;

  hasTime(): boolean;
  clearTime(): void;
  getTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTime(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PositionMessage.AsObject;
  static toObject(includeInstance: boolean, msg: PositionMessage): PositionMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PositionMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PositionMessage;
  static deserializeBinaryFromReader(message: PositionMessage, reader: jspb.BinaryReader): PositionMessage;
}

export namespace PositionMessage {
  export type AsObject = {
    type: MessageType,
    x: number,
    y: number,
    time?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class ChatMessage extends jspb.Message {
  getType(): MessageType;
  setType(value: MessageType): void;

  hasPosition(): boolean;
  clearPosition(): void;
  getPosition(): PositionMessage | undefined;
  setPosition(value?: PositionMessage): void;

  getText(): string;
  setText(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChatMessage.AsObject;
  static toObject(includeInstance: boolean, msg: ChatMessage): ChatMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChatMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChatMessage;
  static deserializeBinaryFromReader(message: ChatMessage, reader: jspb.BinaryReader): ChatMessage;
}

export namespace ChatMessage {
  export type AsObject = {
    type: MessageType,
    position?: PositionMessage.AsObject,
    text: string,
  }
}

export enum MessageType {
  UNKNOWN = 0,
  SETUP = 1,
  POSITION = 2,
  CHAT = 3,
}

