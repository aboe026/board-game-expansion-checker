import fs from 'fs/promises'
import { getLogger } from 'log4js'
import nodemailer from 'nodemailer'

import env from './env'
import { GameWithExpansions } from './bgg-api'
import path from 'path'

/**
 * A static class to send Emails.
 */
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

  /**
   * Send an email listing unowned expansions (if SMTP_HOST environment variable defined).
   *
   * @param gamesWithExpansions The list of games and their associated expansions to email out.
   */
  static async send(gamesWithExpansions: GameWithExpansions[]): Promise<void> {
    if (env.SMTP_HOST) {
      const template = await fs.readFile(path.join(__dirname, 'template.html'), {
        encoding: 'utf-8',
      })

      const response = await Emailer.transporter.sendMail({
        from: env.SMTP_USERNAME,
        to: env.SMTP_USERNAME,
        subject: 'New Board Game Expansion(s) Available',
        html: Emailer.getRenderedHtml({
          template,
          gamesWithExpansions,
        }),
      })
      Emailer.logger.trace(`response: "${JSON.stringify(response)}"`)
    }
  }

  /**
   * Gets the HTML of the template with the games and expansions substituting the placeholders.
   *
   * @param config The configuration for generating the HTML.
   * @param config.gamesWithExpansions The list of games and their associated expansions to render.
   * @param config.template The HTML template containing placeholders to replacew with actual values.
   * @returns The template HTML with actual values substituted for placeholders.
   */
  private static getRenderedHtml({
    gamesWithExpansions,
    template,
  }: {
    gamesWithExpansions: GameWithExpansions[]
    template: string
  }): string {
    // get template rows
    const gameRowStart = Emailer.getBetweenWords({
      sentence: template,
      start: '<!-- Game Row Start -->',
      end: '<!-- Expansion Row Start -->',
    })
    Emailer.logger.trace(`gameRowStart: "${gameRowStart}"`)
    const gameRowEnd = Emailer.getBetweenWords({
      sentence: template,
      start: '<!-- Expansion Row End -->',
      end: '<!-- Game Row End -->',
    })
    Emailer.logger.trace(`gameRowEnd: "${gameRowEnd}"`)
    const expansionRow = Emailer.getBetweenWords({
      sentence: template,
      start: '<!-- Expansion Row Start -->',
      end: '<!-- Expansion Row End -->',
    })
    Emailer.logger.trace(`expansionRow: "${expansionRow}"`)

    // construct rendered HTML from templates
    let rendered = Emailer.getBetweenWords({
      sentence: template,
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
      rendered += '\n'
      rendered += gameRowEnd
    }

    rendered += '\n'
    rendered += Emailer.getBetweenWords({
      sentence: template,
      start: '<!-- Game Row End -->',
    })
    rendered = rendered.replace('{EXPS_NUMBER}', expansionsCount.toString())
    Emailer.logger.trace(`rendered after: "${rendered}"`)

    return rendered
  }

  /**
   * Return the substring between 2 words in a string. Does not include start or end words.
   *
   * @param config The configuration for getting the substring.
   * @param config.sentence The sentence containing the start and end words to get the substring between.
   * @param config.start The beginning boundry of the substring to extract. This word will be excluded in that substring.
   * @param config.end The ending boundry of the substring to extract. This word will be excluded in that substring.
   * @returns The substring between the 2 words, excluding the start and end words.
   */
  private static getBetweenWords({ sentence, start, end }: { sentence: string; start?: string; end?: string }): string {
    const startIndex = start ? sentence.indexOf(start) + start.length : 0
    const endIndex = end ? sentence.lastIndexOf(end) : sentence.length

    return sentence
      .substring(startIndex, endIndex)
      .replace(/^\s+[\n|\r\n]/g, '') // remove potential starting newline
      .replace(/[\n|\r\n]\s+$/g, '') // remove potential ending empty whitespace line
  }
}
