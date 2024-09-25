import { cleanEnv, num, str } from 'envalid'

export default cleanEnv(process.env, {
  BGG_USERNAME: str({
    desc: 'The Board Game Geek username to scope owned games to.',
  }),
  EXPANSION_IGNORE_FILE_PATH: str({
    desc: 'Path to file containing newline separated list of expansion names to ignore.',
    default: '',
  }),
  GAME_IGNORE_FILE_PATH: str({
    desc: 'Path to file containing newline separated list of board game names to ignore.',
    default: '',
  }),
  LOG_FILE_BACKUPS: num({
    desc: 'The number of old log files to keep during log rolling (excluding the hot file).',
    default: 0,
  }),
  LOG_FILE_MAX_SIZE_UNITS: str({
    desc: 'The units for the maximum log file size. Used in conjunction with LOG_FILE_MAX_SIZE_VALUE.',
    choices: ['K', 'M', 'G'],
    default: 'M',
  }),
  LOG_FILE_MAX_SIZE_VALUE: num({
    desc: 'The maximum size of the log file. Units specified with LOG_FILE_MAX_SIZE_UNITS.',
    default: 10,
  }),
  LOG_FILE_NAME: str({
    desc: 'The name of a file to output logs to.',
    default: '',
  }),
  LOG_LEVEL: str({
    desc: 'The minimum granularity level of log messages should be output. OFF < FATAL < ERROR < WARN < INFO < DEBUG < TRACE < ALL.',
    choices: ['OFF', 'FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'ALL'],
    default: 'INFO',
  }),
  RETRY_WAIT_SECONDS: num({
    desc: 'The amount of seconds to wait to retry a request if initially rejected for processing.',
    default: 5,
  }),
})
