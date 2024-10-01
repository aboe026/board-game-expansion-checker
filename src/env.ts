import { bool, cleanEnv, email, num, str } from 'envalid'

export default cleanEnv(process.env, {
  BGG_USERNAME: str({
    desc: 'The Board Game Geek username to scope owned games to.',
  }),
  EMAIL_TO: email({
    desc: 'The email address to send emails to. Defaults to SMTP_USERNAME if not provided.',
    default: '',
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
  SMTP_HOST: str({
    desc: 'The hostname of the SMTP server to use for sending emails.',
    default: '',
  }),
  SMTP_PASSWORD: str({
    desc: 'The password for authentication when sending emails.',
    default: '',
  }),
  SMTP_PORT: num({
    desc: 'The port of the SMTP server to use for sending emails.',
    default: 465,
  }),
  SMTP_SECURE: bool({
    desc: 'Set to true if SMTP_PORT is 465.',
    default: true,
  }),
  SMTP_TLS_CIPHERS: str({
    desc: 'The ciphers to use for TLS communication when sending emails.',
    default: '',
  }),
  SMTP_USERNAME: str({
    desc: 'The username for authentication when sending emails.',
    default: '',
  }),
})
