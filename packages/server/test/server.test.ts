import 'mocha'
import { expect } from 'chai'
import * as WebSocket from 'ws'
import * as http from 'http'
import { AddressInfo } from 'net'
import { setupMaster } from 'cluster'
import { CommServer } from '../src/server'
import { decodeMessageType, sendMessage, GenericMessage, MessageType, ChatMessage, SetupMessage, PositionMessage } from 'dcl-comm-protocol'

describe('server tests', () => {
  let httpServer, commServer
  let port

  before(done => {
    httpServer = http.createServer()
    const wss = new WebSocket.Server({ server: httpServer })
    commServer = new CommServer(wss)
    httpServer.listen(() => {
      const address = httpServer.address() as AddressInfo
      port = address.port
      done()
    })
  })

  after(() => {
    commServer.close()
    httpServer.close()
  })

  describe('handshake', () => {
    let ws

    beforeEach(() => {
      ws = new WebSocket(`ws://localhost:${port}`)
    })

    afterEach(() => {
      ws.close()
    })

    it('should connect to the server', done => {
      ws.on('open', () => {
        done()
      })
      ws.on('error', done)
    })

    it('should receive a setup message upon connection the server', done => {
      ws.on('message', (msg: Uint8Array) => {
        const msgType = decodeMessageType(msg)
        expect(msgType).to.equal(MessageType.SETUP)
        done()
      })
      ws.on('error', done)
    })
  })
})
