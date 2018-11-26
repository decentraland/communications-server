import 'mocha'
import * as chai from 'chai'
import * as WebSocket from 'ws'
import {
  init,
  close,
  onNewConnection,
  EventLogger,
  V2,
  WorldCommunicationState,
  Config,
  checkConnections,
  broadcast
} from 'dcl-comm-server'
import { GenericMessage, MessageType, FlowStatus } from '../src/worldcomm_pb'

import {
  messageTypeMatcher,
  buildPositionMessage,
  buildChatMessage,
  buildFlowStatusMessage,
  buildProfileMessage
} from './utils/messageHelpers'

import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { EventEmitter } from 'events'
chai.use(sinonChai)

const expect = chai.expect

function fakeConnect(state, ws) {
  const { wss } = state
  ws.readyState = WebSocket.OPEN
  onNewConnection(state, ws)

  wss.clients.add(ws)
}

function createAndConnect(state) {
  const ws = new EventEmitter() as WebSocket
  ws.send = sinon.stub()
  fakeConnect(state, ws)
  return ws
}

describe('world communication tests', () => {
  let state

  beforeEach(() => {
    const config = new Config()
    state = new WorldCommunicationState()
    state.config = config.worldCommunicationConfig
    state.logger = config.logger
    state.eventLogger = new EventLogger(config.logger)
    state.agent = {
      recordTotalConnections: sinon.spy(),
      incrementConnectionOpen: sinon.spy(),
      incrementConnectionClosed: sinon.spy(),
      incrementConnectionBroken: sinon.spy(),
      incrementBroadcastSkipped: sinon.spy(),
      incrementBroadcastSuccessMessageDelivery: sinon.spy(),
      incrementBroadcastFailureMessageDelivery: sinon.spy(),
      recordBroadcastLoopDuration: sinon.spy(),
      recordBroadcastRatio: sinon.spy()
    }
    state.wss = { clients: new Set() }
  })

  describe('onNewConnection()', () => {
    let ws

    beforeEach(() => {
      ws = createAndConnect(state)
    })

    it('should set the initial state', () => {
      expect(ws.isAlive).to.be.true
      expect(ws.flowStatus).to.equal(FlowStatus.CLOSE)
      expect(ws.peerId).to.be.null
    })

    describe('FLOW_STATUS message', () => {
      it('should ignore invalid status', () => {
        const m = buildFlowStatusMessage(FlowStatus.UNKNOWN_STATUS)
        ws.emit('message', m.serializeBinary())
        expect(ws.flowStatus).to.equal(FlowStatus.CLOSE)
      })

      it('should set the proper status', () => {
        const m = buildFlowStatusMessage(FlowStatus.OPEN)
        ws.emit('message', m.serializeBinary())
        expect(ws.flowStatus).to.equal(FlowStatus.OPEN)
      })
    })

    describe('POSITION message', () => {
      it('should set the initial position', () => {
        const now = Date.now()
        const m = buildPositionMessage(0, 1.5, 1.5, now)
        ws.emit('message', m.serializeBinary())
        expect(ws.position).to.deep.equal(new V2(1, 1))
        expect(ws.lastPositionUpdate).to.equal(now)
      })

      it('should ignore position if the message is older than last update', () => {
        const now = Date.now()
        ws.lastPositionUpdate = now
        ws.position = new V2(0, 0)
        const m = buildPositionMessage(0, 1.5, 1.5, now - 10000)
        ws.emit('message', m.serializeBinary())
        expect(ws.position).to.deep.equal(new V2(0, 0))
        expect(ws.lastPositionUpdate).to.equal(now)
      })

      describe('if the message is newer', () => {
        let ts, other
        beforeEach(() => {
          other = createAndConnect(state)
          other.position = new V2(1, 1)
          other.flowStatus = FlowStatus.OPEN

          ts = Date.now()
          ws.lastPositionUpdate = ts - 10000
          ws.position = new V2(0, 0)
          ws.flowStatus = FlowStatus.OPEN
          const m = buildPositionMessage(0, 1.5, 1.5, ts)
          ws.emit('message', m.serializeBinary())
        })

        it('should change position', () => {
          expect(ws.position).to.deep.equal(new V2(1, 1))
          expect(ws.lastPositionUpdate).to.equal(ts)
        })

        it('should broadcast position to clients in the comm area', () => {
          expect(other.send).to.have.been.calledOnce
        })
      })
    })

    describe('CHAT message', () => {
      let ts, other
      beforeEach(() => {
        other = createAndConnect(state)
        other.position = new V2(1, 1)
        other.flowStatus = FlowStatus.OPEN

        ws.position = new V2(1, 1)
        ws.flowStatus = FlowStatus.OPEN
        const m = buildChatMessage(0, 1.5, 1.5, 'text', ts)
        ws.emit('message', m.serializeBinary())
      })

      it('should broadcast message to clients in the comm area', () => {
        expect(other.send).to.have.been.calledOnce
      })
    })

    describe('PROFILE message', () => {
      let ts, other
      beforeEach(() => {
        other = createAndConnect(state)
        other.position = new V2(1, 1)
        fakeConnect(state, other)
        other.flowStatus = FlowStatus.OPEN

        ws.position = new V2(0, 0)
        ws.flowStatus = FlowStatus.OPEN
        const m = buildProfileMessage(0, 'peer', 1.5, 1.5, 'fox', 'name', 'key', ts)
        ws.emit('message', m.serializeBinary())
      })

      it('should broadcast message to clients in the comm area', () => {
        expect(other.send).to.have.been.calledOnce
      })
    })
  })

  describe('checkConnections()', () => {
    let ws

    beforeEach(() => {
      ws = createAndConnect(state)
    })

    describe('if connection isAlive is false', () => {
      beforeEach(() => {
        ws.isAlive = false
        ws.terminate = sinon.spy()
        checkConnections(state)
      })

      it('should terminate', () => {
        expect(state.agent.incrementConnectionBroken).to.have.been.calledOnce
        expect(ws.terminate).to.have.been.calledOnce
      })
    })

    describe('if connection isAlive is true', () => {
      beforeEach(() => {
        ws.isAlive = true
        ws.ping = sinon.spy()
        checkConnections(state)
      })

      it('should set isAlive false and ping method', () => {
        expect(ws.isAlive).to.be.false
        expect(ws.ping).to.have.been.calledOnce
      })
    })
  })

  describe('broadcast()', () => {
    let ws
    let other

    beforeEach(() => {
      ws = createAndConnect(state)
      other = createAndConnect(state)
    })

    describe('if position is not set, do nothing', () => {
      beforeEach(() => {
        const m = buildProfileMessage(0, 'peerId', 1.5, 1.5, 'fox', 'name', 'key')
        broadcast(state, ws, m)
      })

      it('should increment counter and nothing else', () => {
        expect(state.agent.incrementBroadcastSkipped).to.have.been.calledOnce
      })
    })

    function setupProperCommunication() {
      ws.position = new V2(1, 1)
      ws.flowStatus = FlowStatus.OPEN
      other.position = new V2(1, 1)
      other.flowStatus = FlowStatus.OPEN
    }

    describe('should broadcast message', () => {
      beforeEach(() => {
        setupProperCommunication()
        const m = buildProfileMessage(0, 'peerId', 1.5, 1.5, 'fox', 'name', 'key')
        broadcast(state, ws, m)
      })

      it('should increment counter and nothing else', () => {
        expect(other.send).to.have.been.calledOnce
      })
    })

    describe('flowStatus is CLOSE', () => {
      beforeEach(() => {
        setupProperCommunication()
        other.flowStatus = FlowStatus.CLOSE
        const m = buildProfileMessage(0, 'peerId', 1.5, 1.5, 'fox', 'name', 'key')
        broadcast(state, ws, m)
      })

      it('should not send message', () => {
        expect(other.send).to.not.have.been.called
      })
    })

    describe('readyState is CLOSE ', () => {
      beforeEach(() => {
        setupProperCommunication()
        other.readyState = WebSocket.CLOSED
        const m = buildProfileMessage(0, 'peerId', 1.5, 1.5, 'fox', 'name', 'key')
        broadcast(state, ws, m)
      })

      it('should not send message', () => {
        expect(other.send).to.not.have.been.called
      })
    })

    describe('outside comm area', () => {
      beforeEach(() => {
        setupProperCommunication()
        other.position = new V2(100, 100)
        const m = buildProfileMessage(0, 'peerId', 1.5, 1.5, 'fox', 'name', 'key')
        broadcast(state, ws, m)
      })

      it('should not send message', () => {
        expect(other.send).to.not.have.been.called
      })
    })
  })
})
