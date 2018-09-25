import 'mocha'
import * as chai from 'chai'
import * as WebSocket from 'ws'
import * as http from 'http'
import { CommServer, V2 } from 'dcl-comm-server'
import { GenericMessage, MessageType } from 'dcl-comm-protocol'

import { messageTypeMatcher, buildPositionMessage, buildChatMessage } from '../utils/messageHelpers'

import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import { EventEmitter } from 'events'
chai.use(sinonChai)

const expect = chai.expect

function fakeConnect(wss, ws) {
  ws.readyState = WebSocket.OPEN
  wss.emit('connection', ws)
  wss.clients.add(ws) // this is hacky but otherwise I need to fake the whole upgrade to websocket
}

describe('server tests', () => {
  let httpServer
  let wss
  let commServer: CommServer

  beforeEach(() => {
    httpServer = http.createServer()
    wss = new WebSocket.Server({ server: httpServer })
    commServer = new CommServer(wss)
  })

  after(() => {
    httpServer.close()
  })

  describe('handshake', () => {
    it('server should send a setup message to new connections', () => {
      const ws = new EventEmitter() as WebSocket
      ws.send = sinon.stub()
      fakeConnect(wss, ws)

      expect(wss.clients.size).to.equal(1)
      expect(ws.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.SERVER_REQUEST_SETUP))
    })
  })

  describe('handle errors', () => {
    let ws
    beforeEach('connect client', () => {
      ws = new EventEmitter() as WebSocket
      ws.send = sinon.stub()
      fakeConnect(wss, ws)

      expect(wss.clients.size).to.equal(1)
      expect(ws.send).to.have.been.calledOnce
    })

    it('server should handle invalid message', () => {
      ws.emit('message', Buffer.from([]))
    })
  })

  describe('position', () => {
    let ws

    beforeEach('connect client', () => {
      ws = new EventEmitter() as WebSocket
      ws.send = sinon.stub()
      fakeConnect(wss, ws)

      expect(wss.clients.size).to.equal(1)
      expect(ws.send).to.have.been.calledOnce
    })

    it('server should set initial position on first location message', () => {
      const m = buildPositionMessage(1.5, 1.5)

      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(1, 1))
    })

    it('server should set override position for each new location message', () => {
      let m = buildPositionMessage(1.5, 1.5)
      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(1, 1))

      m = buildPositionMessage(2.5, 2.5)
      ws.emit('message', m.serializeBinary())

      expect(ws.position).to.deep.equal(new V2(2, 2))
    })
  })

  describe('broadcast', () => {
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
      expect(ws1.send).to.have.been.calledOnce
      expect(ws2.send).to.have.been.calledOnce
      ws1.send.resetHistory()
      ws2.send.resetHistory()
    })

    it('server should emit no message, only ws1 has a registed location', () => {
      const m = buildPositionMessage(1.5, 1.5)
      ws1.emit('message', m.serializeBinary())

      expect(ws1.position).to.deep.equal(new V2(1, 1))
      expect(ws1.send).to.not.have.been.called
      expect(ws2.send).to.not.have.been.called
    })

    it('server should emit no message, since ws1 is outside the comm range of ws2', () => {
      let m = buildPositionMessage(1.5, 1.5)
      ws1.emit('message', m.serializeBinary())
      m = buildPositionMessage(20, 20)
      ws2.emit('message', m.serializeBinary())

      expect(ws1.position).to.deep.equal(new V2(1, 1))
      expect(ws2.position).to.deep.equal(new V2(20, 20))

      expect(ws1.send).to.not.have.been.called
      expect(ws2.send).to.not.have.been.called
    })

    it('server should broadcast messages, since ws1 is inside the comm range of ws1', () => {
      const ws1Location = buildPositionMessage(1.5, 1.5).serializeBinary()
      ws1.emit('message', ws1Location)
      const ws2Location = buildPositionMessage(2, 2).serializeBinary()
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
        const ws1Location = buildPositionMessage(1.5, 1.5).serializeBinary()
        ws1.emit('message', ws1Location)

        const ws2Location = buildPositionMessage(2, 2).serializeBinary()
        ws2.emit('message', ws2Location)

        expect(ws1.position).to.deep.equal(new V2(1, 1))
        expect(ws2.position).to.deep.equal(new V2(2, 2))

        ws1.send.resetHistory()
        ws2.send.resetHistory()
      })

      it('should broadcast chat messages', () => {
        const ws1Chat = buildChatMessage(1.5, 1.5, 'text').serializeBinary()
        ws1.emit('message', ws1Chat)

        const ws2Chat = buildChatMessage(2, 2, 'text').serializeBinary()
        ws2.emit('message', ws2Chat)

        expect(ws1.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
        expect(ws2.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
      })

      it('should broadcast chat messages even if the position describe in the messsage is outside of the comm radius', () => {
        const ws1Chat = buildChatMessage(100, 100, 'text').serializeBinary()
        ws1.emit('message', ws1Chat)

        const ws2Chat = buildChatMessage(2, 2, 'text').serializeBinary()
        ws2.emit('message', ws2Chat)

        // NOTE: we don't change positions using the chat message
        expect(ws1.position).to.deep.equal(new V2(1, 1))

        expect(ws1.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
        expect(ws2.send).to.have.been.calledOnceWith(messageTypeMatcher(MessageType.CHAT))
      })
    })
  })
})
