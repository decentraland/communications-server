import * as dotenv from 'dotenv'
import * as newrelic from 'newrelic'
import * as Logger from 'bunyan'
import { MetricsAgent } from './agent'

dotenv.config()

export const APP_NAME = 'dcl-comm-server'

export enum Env {
  PRODUCTION,
  DEV,
  TEST
}

function getCurrentEnv(): Env {
  if (process.env.NODE_ENV === 'test') {
    return Env.TEST
  } else if (process.env.NODE_ENV === 'dev') {
    return Env.DEV
  } else {
    return Env.PRODUCTION
  }
}

type LogstashConfig = {
  host: string
  port: number
}

export function createLogger(config: Config) {
  const opts = {
    name: APP_NAME,
    level: config.logLevel,
    serializers: Logger.stdSerializers
  } as Logger.LoggerOptions

  if (config.logstashConfig) {
    opts.streams = [
      {
        type: 'raw',
        stream: require('bunyan-logstash').createstream({
          host: config.logstashConfig.host,
          port: config.logstashConfig.port
        })
      }
    ]
  }

  return Logger.createLogger(opts)
}

export class WorldCommunicationConfig {
  public enabled = true
  public positionUpdatesPerSecond = 10
  public profileUpdatesPerSecond = 2
  public communicationRadius = 10
  public communicationRadiusTolerance = 2
  public checkConnectionsIntervalMs = 3000
}

export class Config {
  public env: Env
  public logstashConfig: LogstashConfig | null
  public logLevel = 'info'
  public ethProviderHost = process.env.ETH_PROVIDER_HOST
  public host: string = process.env.HOST || 'localhost'
  public port: number = parseInt(process.env.PORT, 10) || 9090
  public schema: string = 'ws'
  public authorizationEnabled: boolean

  public worldCommunicationConfig = new WorldCommunicationConfig()

  public logger: Logger
  public agent: MetricsAgent

  constructor() {
    this.env = getCurrentEnv()
    this.authorizationEnabled = process.env.AUTHORIZATION_ENABLED !== 'no'

    this.logger = createLogger(this)
    this.agent = new MetricsAgent(newrelic)
  }
}
