import 'mocha'
import * as chai from 'chai'
import { ClientStrategy, CommClient } from 'dcl-comm-client'
import * as WebSocket from 'ws'
import { MessageType } from 'dcl-comm-protocol'
import {
  messageTypeMatcher,
  buildSetupMessage,
  buildPositionMessage,
  buildChatMessage,
  buildClientDisconnectedFromServerMessage
} from '../utils/messageHelpers'

import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { EventEmitter } from 'events'
chai.use(sinonChai)

const expect = chai.expect

describe('client tests', () => {
  let ws
  let strategy
  let client

  beforeEach('setup client', () => {
    ws = new EventEmitter() as WebSocket
    ws.send = sinon.stub().yields()

    console.log('x')

    strategy = {
      onSetupMessage: sinon.stub(),
      onPositionMessage: sinon.stub(),
      onChatMessage: sinon.stub(),
      onUnsupportedMessage: sinon.stub(),
      onSocketError: sinon.stub(),
      onClientDisconnectedFromServerMessage: sinon.stub()
    } as ClientStrategy

    client = new CommClient(ws, strategy)
  })

  it('should handle setup message', () => {
    const m = buildSetupMessage(10)

    ws.emit('message', m.serializeBinary())
    expect(strategy.onSetupMessage).to.have.been.calledWith(client, m)
  })

  it('should handle position message', () => {
    const m = buildPositionMessage(1.5, 1.5)

    ws.emit('message', m.serializeBinary())
    expect(strategy.onPositionMessage).to.have.been.calledWith(client, m)
  })

  it('should handle chat message', () => {
    const m = buildChatMessage(1.5, 1.5, 'hello')

    ws.emit('message', m.serializeBinary())
    expect(strategy.onChatMessage).to.have.been.calledWith(client, m)
  })

  it('should handle client disconnected from server message', () => {
    const m = buildClientDisconnectedFromServerMessage('c1')

    ws.emit('message', m.serializeBinary())
    expect(strategy.onClientDisconnectedFromServerMessage).to.have.been.calledWith(client, m)
  })

  it('should send a position message', async () => {
    await client.sendPositionMessage()
    expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.POSITION))
  })

  it('should send a chat message', async () => {
    await client.sendChatMessage()
    expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
  })
})
