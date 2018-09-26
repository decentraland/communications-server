import 'newrelic'
import { CommServer } from './server'
import * as WebSocket from 'ws'
import * as http from 'http'

const httpServer = http.createServer()
const wss = new WebSocket.Server({ server: httpServer })
const commServer = new CommServer(wss)

httpServer.listen(() => {
  const address = httpServer.address() as WebSocket.AddressInfo
  const port = address.port
  console.log(`listening on port ${port}`)
})
