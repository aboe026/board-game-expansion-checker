import { cleanEnv, str } from 'envalid'

export default cleanEnv(process.env, {
  BGG_USERNAME: str({
    desc: 'The Board Game Geek username to scope owned games to.',
  }),
})
