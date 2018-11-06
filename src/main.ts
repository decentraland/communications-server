import { Config } from './config'
import { start } from './server'

const config = new Config()

process.on('uncaughtException', err => {
  config.logger.error({ err }, 'Uncaught exception')
})

start(config)
