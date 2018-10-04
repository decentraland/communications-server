import 'mocha'
import * as chai from 'chai'
import { ClientStrategy, CommClient } from 'dcl-comm-client'
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
chai.use(sinonChai)

const expect = chai.expect

describe('client tests', () => {
  let ws
  let strategy
  let client

  beforeEach('setup client', () => {
    ws = {} as WebSocket
    ws.send = sinon.stub()

    strategy = {
      getEphemeralKeys: sinon.stub(),
      onSetupMessage: sinon.stub(),
      onPositionMessage: sinon.stub(),
      onChatMessage: sinon.stub(),
      onProfileMessage: sinon.stub(),
      onUnsupportedMessage: sinon.stub(),
      onSocketError: sinon.stub(),
      onSocketClosed: sinon.stub(),
      onClockSkewDetected: sinon.stub(),
      onClientDisconnectedFromServerMessage: sinon.stub()
    } as ClientStrategy

    client = new CommClient(strategy)
    client.connectToWs(ws)
  })

  it('should handle setup message', () => {
    const m = buildSetupMessage(10)

    ws.onmessage({ data: m.serializeBinary() })
    expect(strategy.onSetupMessage).to.have.been.calledWith(client, m)
  })

  it('should handle position message', () => {
    const m = buildPositionMessage(1.5, 1.5)

    ws.onmessage({ data: m.serializeBinary() })
    expect(strategy.onPositionMessage).to.have.been.calledWith(client, m)
  })

  it('should handle chat message', () => {
    const m = buildChatMessage(1.5, 1.5, 'hello')

    ws.onmessage({ data: m.serializeBinary() })
    expect(strategy.onChatMessage).to.have.been.calledWith(client, m)
  })

  it('should handle client disconnected from server message', () => {
    const m = buildClientDisconnectedFromServerMessage('c1')

    ws.onmessage({ data: m.serializeBinary() })
    expect(strategy.onClientDisconnectedFromServerMessage).to.have.been.calledWith(client, m)
  })

  it('should send a position message', async () => {
    ws.readyState = 1
    await client.sendPositionMessage()
    expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.POSITION))
  })

  it('should send a chat message', async () => {
    ws.readyState = 1
    await client.sendPublicChatMessage()
    expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
  })
})
