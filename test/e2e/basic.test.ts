import 'mocha'
import * as chai from 'chai'
import * as WebSocket from 'isomorphic-ws'
import * as http from 'http'
import { CommServer, V2 } from 'dcl-comm-server'
import { ClientStrategy, CommClient } from 'dcl-comm-client'
import {
  ChatMessage,
  PositionMessage,
  ProfileMessage,
  ServerSetupRequestMessage,
  ClientDisconnectedFromServerMessage,
  MessageType
} from 'dcl-comm-protocol'
import { UserData as EphemeralKey } from 'ephemeralkey'

import { getRndLine } from '../utils/chatHelpers'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
chai.use(sinonChai)

const expect = chai.expect

global['WebSocket'] = WebSocket

function sleep(n) {
  return new Promise(resolve => {
    setTimeout(resolve, n)
  })
}

describe('basic e2e tests', () => {
  let httpServer
  let wss
  let commServer: CommServer
  let port

  before(done => {
    httpServer = http.createServer()
    wss = new WebSocket.Server({ server: httpServer })
    commServer = new CommServer(wss)
    httpServer.listen(() => {
      const address = httpServer.address()
      port = address.port
      done()
    })
  })

  after(() => {
    commServer.close()
    httpServer.close()
  })

  class ClientTestStrategy implements ClientStrategy {
    // NOTE: this is not a realistic implementation because it only connects to one server
    public peers = new Map<string, V2>()

    async getEphemeralKeys(): Promise<EphemeralKey> {
      return null
    }

    onPositionMessage(client: CommClient, message: PositionMessage) {
      const peerId = message.getPeerId()
      const p = new V2(message.getPositionX(), message.getPositionY())
      this.peers.set(peerId, p)
    }

    onProfileMessage(client: CommClient, message: ProfileMessage) {}

    onChatMessage(client: CommClient, message: ChatMessage) {
      const peerId = message.getPeerId()
      const p = new V2(message.getPositionX(), message.getPositionY())
      const text = message.getText()
      console.log(`${peerId} says: ${text} from ${p.x}, ${p.y}`)
    }

    onClientDisconnectedFromServerMessage(client: CommClient, message: ClientDisconnectedFromServerMessage) {
      const peerId = message.getPeerId()
      this.peers.delete(peerId)
    }

    onSetupMessage(client: CommClient, message: ServerSetupRequestMessage) {}
    onUnsupportedMessage(client: CommClient, messageType: MessageType, message) {}
    onSocketError(client: CommClient, error: Error) {}
    onSocketClosed(client: CommClient) {}
    onClockSkewDetected(client: CommClient) {}
  }

  function buildTestClientStrategy(): ClientStrategy {
    const strategy = new ClientTestStrategy()
    sinon.spy(strategy, 'getEphemeralKeys')
    sinon.spy(strategy, 'onSetupMessage')
    sinon.spy(strategy, 'onPositionMessage')
    sinon.spy(strategy, 'onChatMessage')
    sinon.spy(strategy, 'onProfileMessage')
    sinon.spy(strategy, 'onUnsupportedMessage')
    sinon.spy(strategy, 'onSocketError')
    sinon.spy(strategy, 'onClockSkewDetected')
    return strategy
  }

  describe('clients should intereact with each other when in comm area', () => {
    let messageId = 0
    const clients = []

    before('create and connect clients', async () => {
      for (let i = 0; i < 10; i++) {
        const strategy = buildTestClientStrategy()

        const client = new CommClient(strategy)

        client.connectToUrl(`ws://localhost:${port}`, false)
        clients.push(client)
      }
    })

    it('they should talk to each other', async () => {
      await sleep(50)

      // NOTE: set initial position for each one
      for (let client of clients) {
        expect(client.sendPositionMessage(1, 1)).to.be.true
      }

      await sleep(100)

      // NOTE: discover each other
      for (let client of clients) {
        expect(client.sendPositionMessage(1, 1)).to.be.true
      }

      await sleep(100)

      for (let client of clients) {
        const strategy = client.getStrategy()
        expect(strategy.peers.size).to.equal(clients.length - 1)
        expect(client.sendPublicChatMessage(1, 1, `${messageId++}`, getRndLine())).to.be.true
      }

      await sleep(100)

      for (let client of clients) {
        const strategy = client.getStrategy()
        expect(strategy.onSetupMessage).to.have.been.calledOnce
        expect(strategy.onUnsupportedMessage).to.not.have.been.called
        expect(strategy.onChatMessage.callCount).to.equal(clients.length - 1)
        expect(strategy.onSocketError).to.not.have.been.called
      }

      // NOTE: let's disconnect client-0
      clients[0].close()
      await sleep(100)

      for (let clientIndex = 1; clientIndex < clients.length; clientIndex++) {
        const client = clients[clientIndex]
        const strategy = client.getStrategy()
        expect(strategy.peers.size).to.equal(clients.length - 2)
      }
    })
  })
})
