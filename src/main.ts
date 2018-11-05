import { Config } from './config'
import { startServer } from './server'

const config = new Config()

process.on('uncaughtException', err => {
  config.logger.error({ err }, 'Uncaught exception')
})

startServer(config)
