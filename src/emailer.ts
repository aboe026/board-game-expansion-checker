import fs from 'fs/promises'
import { getLogger } from 'log4js'
import nodemailer from 'nodemailer'

import env from './env'
import { GameWithExpansions } from './bgg-api'
import path from 'path'

export default class Emailer {
  private static logger = getLogger('Emailer')
  private static transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
    tls: {
      ciphers: env.SMTP_TLS_CIPHERS,
    },
  })

  // TODO: break template into smaller "chunks" of start/ends
  // which have placeholders in them for game/expansion id/name
  // have method to "replacePlaceholders" that each can call
  static async send(gamesWithExpansions: GameWithExpansions[]): Promise<void> {
    if (env.SMTP_HOST) {
      const template = await fs.readFile(path.join(__dirname, 'template.html'), {
        encoding: 'utf-8',
      })

      const gameRowStart = Emailer.getBetweenHtmlComments({
        html: template,
        start: '<!-- Game Row Start -->',
        end: '<!-- Expansion Row Start -->',
      })
      Emailer.logger.trace(`gameRowStart: "${gameRowStart}"`)
      const gameRowEnd = Emailer.getBetweenHtmlComments({
        html: template,
        start: '<!-- Expansion Row End -->',
        end: '<!-- Game Row End -->',
      })
      Emailer.logger.trace(`gameRowEnd: "${gameRowEnd}"`)
      const expansionRow = Emailer.getBetweenHtmlComments({
        html: template,
        start: '<!-- Expansion Row Start -->',
        end: '<!-- Expansion Row End -->',
      })
      Emailer.logger.trace(`expansionRow: "${expansionRow}"`)

      let rendered = Emailer.getBetweenHtmlComments({
        html: template,
        end: '<!-- Game Row Start -->',
      })
      Emailer.logger.trace(`rendered before: "${rendered}"`)
      let expansionsCount = 0
      for (const gameWithExpansions of gamesWithExpansions) {
        rendered += '\n'
        rendered += gameRowStart
          .replace('{GAME_ID}', gameWithExpansions.game.id.toString())
          .replace('{GAME_NAME}', gameWithExpansions.game.name)
        for (const expansion of gameWithExpansions.expansions) {
          expansionsCount++
          rendered += '\n'
          rendered += expansionRow
            .replace('{EXPANSION_ID}', expansion.id.toString())
            .replace('{EXPANSION_NAME}', expansion.name)
        }
        rendered += gameRowEnd
      }
      rendered += '\n'
      rendered += Emailer.getBetweenHtmlComments({
        html: template,
        start: '<!-- Game Row End -->',
      })
      rendered = rendered.replace('{EXPS_NUMBER}', expansionsCount.toString())
      Emailer.logger.trace(`rendered after: "${rendered}"`)

      const response = await Emailer.transporter.sendMail({
        from: env.SMTP_USERNAME,
        to: env.SMTP_USERNAME,
        subject: `New Board Game Expansion${expansionsCount > 1 ? 's' : ''} Available`,
        html: rendered,
      })
      Emailer.logger.trace(`response: "${JSON.stringify(response)}"`)
    }
  }

  private static getBetweenHtmlComments({ html, start, end }: { html: string; start?: string; end?: string }): string {
    const startIndex = start ? html.indexOf(start) + start.length : 0
    const endIndex = end ? html.indexOf(end) : html.length

    return html
      .substring(startIndex, endIndex)
      .replace(/^\s+[\n|\r\n]/g, '') // remove potential starting newline
      .replace(/[\n|\r\n]\s+$/g, '') // remove potential ending empty whitespace line
  }
}
