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
  public logLevel: 'debug'
  public appName: string = 'dcl-comm-server'
  public logstashHost?: string
  public logstashPort: number
  public updatesPerSecond = 10
  public communicationRadius = 10
  public communicationRadiusTolerance = 2
}

export const settings = new Settings()
