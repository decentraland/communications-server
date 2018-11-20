import 'newrelic'
import 'isomorphic-fetch'
import * as WebSocket from 'ws'
import * as http from 'http'
import { Config } from './config'
import { init as initWorldCommunication } from './worldCommunication'
import { providers } from 'eth-connect'
import { parse } from 'url'
import { validateHeaders, Headers } from 'ephemeralkey'

const REQUIRED_HEADERS = ['x-identity', 'x-certificate', 'x-certificate-signature', 'x-timestamp']

function createWss(config: Config, httpServer) {
  const opts = {
    noServer: true
  } as WebSocket.ServerOptions

  console.log('authorization enabled', config.authorizationEnabled)
  if (config.authorizationEnabled) {
    const provider = new providers.HTTPProvider(config.ethProviderHost)
    const validateRequest = async req => {
      const url = parse(req.url, true)
      const query = url.query

      const headers = query as Headers

      for (let header of REQUIRED_HEADERS) {
        if (!headers[header]) {
          console.debug(`missing required header ${header}`)
          return false
        }
      }

      const requestUrl = `${config.schema}://${config.host}:${config.port}${url.pathname}`
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

    opts.verifyClient = async ({ req }, cb) => {
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
  }

  const wss = new WebSocket.Server(opts)
  return wss
}

type ModuleConfig = {
  pathname: string
  wss: WebSocket.Server
}

export function start(config: Config, httpServer?) {
  if (!httpServer) {
    httpServer = http.createServer()
  }

  const modules: ModuleConfig[] = []

  if (config.worldCommunicationConfig.enabled) {
    const wss = createWss(config, httpServer)
    initWorldCommunication(config, wss)
    modules.push({ wss: wss, pathname: '/connector' })
  }

  httpServer.on('upgrade', (req, socket, head) => {
    const reqPathname = parse(req.url).pathname
    let found = false
    for (let { wss, pathname } of modules) {
      if (pathname === reqPathname) {
        found = true
        wss.handleUpgrade(req, socket, head, ws => {
          wss.emit('connection', ws, req)
        })
      }
    }

    if (!found) {
      config.logger.debug(`cannot find module matching url ${reqPathname}`)
      console.log(`cannot find module matching url ${reqPathname}`)
      socket.destroy()
    }
  })

  httpServer.listen(config.port, () => {
    const address = httpServer.address() as WebSocket.AddressInfo
    const port = address.port
    console.debug(`listening on port ${port}`)
  })
}
