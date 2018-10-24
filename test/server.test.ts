import 'mocha'
import * as chai from 'chai'
import * as WebSocket from 'ws'
import { CommServer, V2 } from 'dcl-comm-server'
import { GenericMessage, MessageType, FlowStatus } from 'dcl-comm-protocol'

import { messageTypeMatcher, buildPositionMessage, buildChatMessage } from './utils/messageHelpers'

import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { EventEmitter } from 'events'
chai.use(sinonChai)

const expect = chai.expect

function fakeConnect(wss, ws) {
  ws.readyState = WebSocket.OPEN
  ws.ping = sinon.stub()
  ws.terminate = sinon.stub()
  wss.emit('connection', ws)
  wss.clients.add(ws) // this is hacky but otherwise I need to fake the whole upgrade to websocket
}

describe('server tests', () => {
  let wss
  let commServer

  beforeEach(() => {
    wss = new WebSocket.Server({ noServer: true })
    commServer = new CommServer(wss)
  })

  afterEach(() => {
    commServer.close()
  })

  describe('handle errors', () => {
    let ws
    beforeEach('connect client', () => {
      ws = new EventEmitter() as WebSocket
      ws.send = sinon.stub()
      fakeConnect(wss, ws)

      expect(wss.clients.size).to.equal(1)
    })

    it('server should handle invalid message', () => {
      ws.emit('message', Buffer.from([]))
    })
  })

  describe('position', () => {
    let peerId = 'peer'
    let ws

    beforeEach('connect client', () => {
      ws = new EventEmitter() as WebSocket
      ws.send = sinon.stub()
      fakeConnect(wss, ws)

      expect(wss.clients.size).to.equal(0)
    })

    it('server should set initial position on first location message', () => {
      const m = buildPositionMessage(peerId, 1.5, 1.5)

      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(1, 1))
    })

    it('server should set override position for each new location message', () => {
      let m = buildPositionMessage(peerId, 1.5, 1.5)
      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(1, 1))

      m = buildPositionMessage(peerId, 2.5, 2.5)
      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(2, 2))
    })
  })

  describe('broadcast', () => {
    let peerId1 = 'peer1'
    let peerId2 = 'peer2'
    let ws1
    let ws2

    beforeEach('connect two clients', () => {
      ws1 = new EventEmitter() as WebSocket
      ws1.send = sinon.stub()
      fakeConnect(wss, ws1)

      ws2 = new EventEmitter() as WebSocket
      ws2.send = sinon.stub()
      fakeConnect(wss, ws2)

      expect(wss.clients.size).to.equal(2)
    })

    it('server should emit no message, only ws1 has a registed location', () => {
      const m = buildPositionMessage(peerId1, 1.5, 1.5)
      ws1.emit('message', m.serializeBinary())

      expect(ws1.position).to.deep.equal(new V2(1, 1))
      expect(ws1.send).to.not.have.been.called
      expect(ws2.send).to.not.have.been.called
    })

    it('server should emit no message, since ws1 is outside the comm range of ws2', () => {
      let m = buildPositionMessage(peerId1, 1.5, 1.5)
      ws1.emit('message', m.serializeBinary())
      m = buildPositionMessage(peerId2, 20, 20)
      ws2.emit('message', m.serializeBinary())

      expect(ws1.position).to.deep.equal(new V2(1, 1))
      expect(ws2.position).to.deep.equal(new V2(20, 20))

      expect(ws1.send).to.not.have.been.called
      expect(ws2.send).to.not.have.been.called
    })

    describe('open flow', () => {
      beforeEach('open flow', () => {
        ws1.flowStatus = FlowStatus.OPEN
        ws2.flowStatus = FlowStatus.OPEN
      })

      it('server should broadcast messages, since ws1 is inside the comm range of ws1', () => {
        const ws1Location = buildPositionMessage(peerId1, 1.5, 1.5).serializeBinary()
        ws1.emit('message', ws1Location)
        const ws2Location = buildPositionMessage(peerId2, 2, 2).serializeBinary()
        ws2.emit('message', ws2Location)

        expect(ws1.position).to.deep.equal(new V2(1, 1))
        expect(ws2.position).to.deep.equal(new V2(2, 2))

        expect(ws1.send).to.have.been.calledWith(messageTypeMatcher(MessageType.POSITION))
        expect(ws2.send).to.have.not.been.called
      })

      it('server should ignore invalid position message', () => {
        ws1.position = new V2(1, 1)
        ws1.lastPositionUpdate = new Date().getTime()
        ws2.position = new V2(1, 1)
        ws2.lastPositionUpdate = new Date().getTime()

        const m = new GenericMessage()
        m.setType(MessageType.POSITION)
        ws1.emit('message', m.serializeBinary())

        expect(ws1.position).to.deep.equal(new V2(1, 1))
        expect(ws1.send).to.not.have.been.called
        expect(ws2.send).to.not.have.been.called
      })

      describe('chat messages', () => {
        beforeEach('locate the two clients in the same comm area', () => {
          const ws1Location = buildPositionMessage(peerId1, 1.5, 1.5).serializeBinary()
          ws1.emit('message', ws1Location)

          const ws2Location = buildPositionMessage(peerId2, 2, 2).serializeBinary()
          ws2.emit('message', ws2Location)

          expect(ws1.position).to.deep.equal(new V2(1, 1))
          expect(ws2.position).to.deep.equal(new V2(2, 2))

          ws1.send.resetHistory()
          ws2.send.resetHistory()
        })

        it('should broadcast chat messages', () => {
          const ws1Chat = buildChatMessage(peerId1, 1.5, 1.5, 'text').serializeBinary()
          ws1.emit('message', ws1Chat)

          const ws2Chat = buildChatMessage(peerId2, 2, 2, 'text').serializeBinary()
          ws2.emit('message', ws2Chat)

          expect(ws1.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
          expect(ws2.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
        })

        it('should broadcast chat messages even if the position describe in the messsage is outside of the comm radius', () => {
          const ws1Chat = buildChatMessage(peerId1, 100, 100, 'text').serializeBinary()
          ws1.emit('message', ws1Chat)

          const ws2Chat = buildChatMessage(peerId2, 2, 2, 'text').serializeBinary()
          ws2.emit('message', ws2Chat)

          // NOTE: we don't change positions using the chat message
          expect(ws1.position).to.deep.equal(new V2(1, 1))

          expect(ws1.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
          expect(ws2.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
        })
      })
    })

    describe('closed flow', () => {
      beforeEach('open flow', () => {
        ws1.flowStatus = FlowStatus.CLOSE
        ws2.flowStatus = FlowStatus.CLOSE
      })

      it('ws1 is inside the comm range of ws1, but no message is received', () => {
        const ws1Location = buildPositionMessage(peerId1, 1.5, 1.5).serializeBinary()
        ws1.emit('message', ws1Location)
        const ws2Location = buildPositionMessage(peerId2, 2, 2).serializeBinary()
        ws2.emit('message', ws2Location)

        expect(ws1.position).to.deep.equal(new V2(1, 1))
        expect(ws2.position).to.deep.equal(new V2(2, 2))

        expect(ws1.send).to.have.not.been.called
        expect(ws2.send).to.have.not.been.called
      })

      describe('chat messages', () => {
        beforeEach('locate the two clients in the same comm area', () => {
          const ws1Location = buildPositionMessage(peerId1, 1.5, 1.5).serializeBinary()
          ws1.emit('message', ws1Location)

          const ws2Location = buildPositionMessage(peerId2, 2, 2).serializeBinary()
          ws2.emit('message', ws2Location)

          expect(ws1.position).to.deep.equal(new V2(1, 1))
          expect(ws2.position).to.deep.equal(new V2(2, 2))
        })

        it('should ignore chat messages', () => {
          const ws1Chat = buildChatMessage(peerId1, 1.5, 1.5, 'text').serializeBinary()
          ws1.emit('message', ws1Chat)

          const ws2Chat = buildChatMessage(peerId2, 2, 2, 'text').serializeBinary()
          ws2.emit('message', ws2Chat)

          expect(ws1.send).to.have.not.been.called
          expect(ws2.send).to.have.not.been.called
        })
      })
    })
  })
})
