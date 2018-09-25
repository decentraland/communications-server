import 'mocha'
import * as chai from 'chai'
import { ClientStrategy, CommClient } from '../src/client'
import * as WebSocket from 'ws'
// import * as http from 'http'
// import { AddressInfo } from 'net'
// import { setupMaster } from 'cluster'
// import { CommServer } from '../src/server'
// import { V2 } from '../src/utils'
import {
  decodeMessageType,
  sendMessage,
  GenericMessage,
  MessageType,
  ChatMessage,
  ServerSetupRequestMessage,
  PositionMessage
} from 'dcl-comm-protocol'

import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { EventEmitter } from 'events'
chai.use(sinonChai)

const expect = chai.expect

function messageTypeMatcher(typeToMatch) {
  return sinon.match(msg => {
    const msgType = decodeMessageType(msg)
    return msgType === typeToMatch
  })
}

function buildSetupMessage(updatesPerSecond: number) {
  const m = new ServerSetupRequestMessage()
  m.setType(MessageType.SERVER_REQUEST_SETUP)
  m.setUpdatesPerSecond(updatesPerSecond)
  return m
}

function buildPositionMessage(x: number, y: number, time?: Date) {
  const m = new PositionMessage()
  m.setType(MessageType.POSITION)
  m.setX(x)
  m.setY(y)
  m.setTime((time ? time : new Date()).getTime())
  return m
}

function buildChatMessage(x: number, y: number, text: string, time?: Date) {
  const m = new ChatMessage()
  m.setType(MessageType.CHAT)
  m.setX(x)
  m.setY(y)
  m.setText(text)
  m.setTime((time ? time : new Date()).getTime())
  return m
}

describe('client tests', () => {
  let ws
  let strategy
  let client

  beforeEach('setup client', () => {
    ws = new EventEmitter() as WebSocket
    ws.send = sinon.stub().yields()

    strategy = {
      onSetupMessage: sinon.stub(),
      onPositionMessage: sinon.stub(),
      onChatMessage: sinon.stub(),
      onUnsupportedMessage: sinon.stub()
    } as ClientStrategy

    client = new CommClient(ws, strategy)
  })

  it('should handle setup message', () => {
    const m = buildSetupMessage(10)

    ws.emit('message', m.serializeBinary())
    expect(strategy.onSetupMessage).to.have.been.calledWith(ws, m)
  })

  it('should handle position message', () => {
    const m = buildPositionMessage(1.5, 1.5)

    ws.emit('message', m.serializeBinary())
    expect(strategy.onPositionMessage).to.have.been.calledWith(ws, m)
  })

  it('should handle chat message', () => {
    const m = buildChatMessage(1.5, 1.5, 'hello')

    ws.emit('message', m.serializeBinary())
    expect(strategy.onChatMessage).to.have.been.calledWith(ws, m)
  })

  it('should send a position message', done => {
    client.sendPositionMessage(err => {
      expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.POSITION))
      done(err)
    })
  })

  it('should send a chat message', done => {
    client.sendChatMessage(err => {
      expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
      done(err)
    })
  })
})
