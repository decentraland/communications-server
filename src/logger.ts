import * as bunyan from 'bunyan'
import { settings } from './settings'

function createLogger() {
  const opts = {
    name: settings.appName,
    level: settings.logLevel,
    serializers: bunyan.stdSerializers
  } as bunyan.LoggerOptions

  if (settings.logstashHost) {
    opts.streams = [
      {
        type: 'raw',
        stream: require('bunyan-logstash').createstream({
          host: settings.logstashHost,
          port: settings.logstashPort
        })
      }
    ]
  }

  return bunyan.createLogger(opts)
}

export const logger = createLogger()
