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
  RETRY_WAIT_SECONDS: num({
    desc: 'The amount of seconds to wait to retry a request if initially rejected for processing.',
    default: 5,
  }),
})
