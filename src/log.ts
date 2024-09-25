import log4js, { Appender } from 'log4js'

import env from './env'

export default class Log {
  static configure() {
    const appenders: Appenders = {
      console: { type: 'console' },
    }
    if (env.LOG_FILE_NAME) {
      appenders.file = {
        type: 'file',
        filename: env.LOG_FILE_NAME,
        maxLogSize: `${env.LOG_FILE_MAX_SIZE_VALUE}${env.LOG_FILE_MAX_SIZE_UNITS}`,
        backups: env.LOG_FILE_BACKUPS,
      }
    }
    log4js.configure({
      appenders,
      categories: { default: { appenders: Object.keys(appenders), level: env.LOG_LEVEL } },
    })
  }
}

interface Appenders {
  [name: string]: Appender
}
