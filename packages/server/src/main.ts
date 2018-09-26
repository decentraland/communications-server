import 'newrelic'
import { settings } from './settings'
import { CommServer } from './server'
import * as WebSocket from 'ws'
import * as http from 'http'
import { parse } from 'url'
import { validateHeaders, Headers } from 'ephemeralkey'
import { providers } from 'eth-connect'
import 'isomorphic-fetch'

const REQUIRED_HEADERS = ['x-identity', 'x-certificate', 'x-certificate-signature', 'x-timestamp']

const httpServer = http.createServer()
const wss = new WebSocket.Server({
  noServer: true,
  verifyClient: async ({ req }, cb) => {
    if (!settings.authorizationEnabled) {
      cb(true)
      return
    }
    try {
      if (await validateRequest(req)) {
        cb(true)
      } else {
        cb(false, 401, 'Unauthorized')
      }
    } catch (e) {
      console.error('ERROR', e)
      cb(false, 500, 'Internal Error')
    }
  }
})

const _commServer = new CommServer(wss)

async function validateRequest(req): Promise<boolean> {
  const url = parse(req.url, true)
  const query = url.query

  const headers = query as Headers

  for (let header of REQUIRED_HEADERS) {
    if (!headers[header]) {
      console.debug(`missing required header ${header}`)
      return false
    }
  }

  const requestUrl = `${settings.schema}://${settings.host}:${settings.port}${url.pathname}`
  const provider = new providers.HTTPProvider(settings.ethProviderHost)
  const { success, error } = await validateHeaders(
    provider,
    {
      method: req.method,
      url: requestUrl,
      body: Buffer.alloc(0)
    },
    headers
  )

  if (error) {
    console.debug('unauthorized', error)
  }

  return success
}

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, async ws => {
    wss.emit('connection', ws, req)
  })
})

httpServer.listen(settings.port, () => {
  const address = httpServer.address() as WebSocket.AddressInfo
  const port = address.port
  console.log(`listening on port ${port}`)
})
