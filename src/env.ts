import { cleanEnv, str } from 'envalid'

export default cleanEnv(process.env, {
  BGG_USERNAME: str({
    desc: 'The Board Game Geek username to scope owned games to.',
  }),
  GAME_IGNORE_FILE_PATH: str({
    desc: 'Path to file containing newline separated list of board game names to ignore.',
    default: '',
  }),
})
