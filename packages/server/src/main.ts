import 'newrelic'
import { settings } from './settings'
import { CommServer } from './server'
import * as WebSocket from 'isomorphic-ws'
import * as http from 'http'
import { parse } from 'url'
import { validateHeaders, Headers } from 'ephemeralkey'
import { providers } from 'eth-connect'
import 'isomorphic-fetch'

const httpServer = http.createServer()
const wss = new WebSocket.Server({
  noServer: true,
  verifyClient: async ({ req }, cb) => {
    try {
      if (await validateRequest(req)) {
        cb(true)
      } else {
        cb(false, 401, 'Unauthorized')
      }
    } catch (e) {
      console.log('ERROR', e)
      cb(false, 500, 'Internal Error')
    }
  }
})

const _commServer = new CommServer(wss)

async function validateRequest(req): Promise<boolean> {
  const url = parse(req.url, true)
  const query = url.query

  const headers = query as Headers
  if (headers['x-identity'] && headers['x-certificate'] && headers['x-certificate-signature'] && headers['x-timestamp']) {
    const requestUrl = `${settings.schema}://${settings.host}:${settings.port}${url.pathname}`
    const provider = new providers.HTTPProvider(settings.ethProviderHost)
    return validateHeaders(
      provider,
      {
        method: req.method,
        url: requestUrl,
        body: Buffer.alloc(0)
      },
      headers
    )
  }

  return false
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
