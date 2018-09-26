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

class Settings {
  public env: Env = getCurrentEnv()
  public logLevel = 'debug'
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
  public port: number = 9090
  public schema: string = 'ws'
  public checkConnectionsIntervalMs: number = 3000
}

export const settings = new Settings()
