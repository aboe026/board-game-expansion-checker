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

      const tableRowIndentMatches = [...template.matchAll(/^(\s+)<tr>/gm)]
      let tableRowIndent = ''
      if (tableRowIndentMatches) {
        tableRowIndent += tableRowIndentMatches[0][1].replace('\n', '')
      }
      let gameRows = ''
      let expansionsCount = 0
      for (const gamesWithExpansion of gamesWithExpansions) {
        let expansionRows = ''
        for (const expansion of gamesWithExpansion.expansions) {
          expansionsCount++
          expansionRows += [
            '      <li>',
            `        <a href="https://boardgamegeek.com/boardgameexpansion/${expansion.id}">${expansion.name}</a>`,
            '      </li>',
          ].join(`\n${tableRowIndent}`)
        }
        gameRows += [
          '<tr>',
          '  <td>',
          `    <a href="https://boardgamegeek.com/boardgame/${gamesWithExpansion.game.id}">${gamesWithExpansion.game.name}</a>`,
          '  </td>',
          '  <td>',
          '    <ul>',
          expansionRows,
          '    </ul>',
          '  </td>',
          '</tr>',
        ].join(`\n${tableRowIndent}`)
      }
      let modifiedTemplate = template.replace('{EXPS_NUMBER}', expansionsCount.toString())
      const gameRowsStartText = '<!-- Expansion Rows Start -->'
      const gameRowsStartIndex = modifiedTemplate.indexOf(gameRowsStartText)
      const gameRowsEndText = '<!-- Expansion Rows End -->'
      const gameRowsEndIndex = modifiedTemplate.indexOf(gameRowsEndText) + gameRowsEndText.length
      modifiedTemplate = `${modifiedTemplate.substring(0, gameRowsStartIndex + gameRowsStartText.length)}${modifiedTemplate.substring(gameRowsEndIndex, modifiedTemplate.length)}`
      modifiedTemplate = modifiedTemplate.replace(gameRowsStartText, gameRows)
      Emailer.logger.trace(`modifiedTemplate: "${JSON.stringify(modifiedTemplate)}"`)

      const response = await Emailer.transporter.sendMail({
        from: env.SMTP_USERNAME,
        to: env.SMTP_USERNAME,
        subject: `New Board Game Expansion${expansionsCount > 1 ? 's' : ''} Available`,
        html: modifiedTemplate,
      })
      Emailer.logger.trace(`response: "${JSON.stringify(response)}"`)
    }
  }
}
