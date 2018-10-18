import * as dotenv from 'dotenv'

dotenv.config()

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

function isAuthorizationEnabled(env: Env): boolean {
  if (env === Env.PRODUCTION) {
    return true
  }

  return process.env.AUTHORIZATION_ENABLED !== 'no'
}

class Settings {
  public env: Env
  public logLevel = 'info'
  public appName: string = 'dcl-comm-server'
  public logstashHost?: string
  public logstashPort: number
  public positionUpdatesPerSecond = 10
  public profileUpdatesPerSecond = 2
  public communicationRadius = 10
  public communicationRadiusTolerance = 2
  public newRelicLicenseKey?: string = process.env.NEW_RELIC_LICENSE_KEY
  public ethProviderHost = 'http://localhost:8545'
  public host: string = 'localhost'
  public port: number = parseInt(process.env.PORT, 10) || 9090
  public schema: string = 'ws'
  public checkConnectionsIntervalMs: number = 3000
  public authorizationEnabled: boolean

  constructor() {
    this.env = getCurrentEnv()
    this.authorizationEnabled = isAuthorizationEnabled(this.env)
  }
}

export const settings = new Settings()
