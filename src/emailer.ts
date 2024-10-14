import fs from 'fs/promises'
import { getLogger } from 'log4js'
import nodemailer, { Transporter } from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

import env from './env'
import { GameWithExpansions } from './bgg-api'
import path from 'path'

/**
 * A class to send Emails.
 */
export default class Emailer {
  private static logger = getLogger('Emailer')
  private transporter: Transporter

  constructor({
    host,
    port,
    secure,
    tlsCiphers,
    password,
    username,
  }: {
    host: string
    port: number
    secure: boolean
    username?: string
    password?: string
    tlsCiphers?: string
  }) {
    const options: SMTPTransport.Options = {
      host,
      port,
      secure,
    }
    if (username) {
      options.auth = {
        user: username,
        pass: password,
      }
    }
    if (tlsCiphers) {
      options.tls = {
        ciphers: tlsCiphers,
      }
    }
    this.transporter = nodemailer.createTransport(options)
  }

  /**
   * Send an email listing unowned expansions.
   *
   * @param gamesWithExpansions The list of games and their associated expansions to email out.
   */
  async send({ subject, html }: { subject: string; html?: string }): Promise<void> {
    const recipient = env.EMAIL_TO || env.SMTP_USERNAME
    Emailer.logger.info(`Sending email from "${env.SMTP_USERNAME}" to "${recipient}"`)
    const response = await this.transporter.sendMail({
      from: env.SMTP_USERNAME,
      to: recipient,
      subject,
      html,
    })
    Emailer.logger.trace(`response: "${JSON.stringify(response)}"`)
  }

  /**
   * Gets the HTML of the template with the games and expansions substituting the placeholders.
   *
   * @param config The configuration for generating the HTML.
   * @param config.gamesWithExpansions The list of games and their associated expansions to render.
   * @param config.template The HTML template containing placeholders to replacew with actual values.
   * @returns The template HTML with actual values substituted for placeholders.
   */
  async getHtmlFromGames({ gamesWithExpansions }: { gamesWithExpansions: GameWithExpansions[] }): Promise<string> {
    const template = await fs.readFile(path.join(__dirname, 'html-templates', 'expansions-found-template.html'), {
      encoding: 'utf-8',
    })
    Emailer.logger.trace(`getHtmlFromGames template: "${template}"`)

    // get template rows
    const gameRowStart = this.getBetweenWords({
      sentence: template,
      start: '<!-- Game Row Start -->',
      end: '<!-- Expansion Row Start -->',
    })
    Emailer.logger.trace(`gameRowStart: "${gameRowStart}"`)
    const gameRowEnd = this.getBetweenWords({
      sentence: template,
      start: '<!-- Expansion Row End -->',
      end: '<!-- Game Row End -->',
    })
    Emailer.logger.trace(`gameRowEnd: "${gameRowEnd}"`)
    const expansionRow = this.getBetweenWords({
      sentence: template,
      start: '<!-- Expansion Row Start -->',
      end: '<!-- Expansion Row End -->',
    })
    Emailer.logger.trace(`expansionRow: "${expansionRow}"`)

    // construct rendered HTML from templates
    let rendered = this.getBetweenWords({
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
    rendered += this.getBetweenWords({
      sentence: template,
      start: '<!-- Game Row End -->',
    })
    rendered = rendered.replace('{EXPS_NUMBER}', expansionsCount.toString())
    Emailer.logger.trace(`rendered after: "${rendered}"`)

    return rendered
  }

  async getHtmlForFailure({ failure }: { failure: string }): Promise<string> {
    const template = await fs.readFile(path.join(__dirname, 'html-templates', 'failed-template.html'), {
      encoding: 'utf-8',
    })
    Emailer.logger.trace(`getHtmlForFailure template: "${template}"`)

    const rendered = template.replace('{EXCEPTION_STACK_TRACE}', failure)

    Emailer.logger.trace(`getHtmlForFailure rendered: "${rendered}"`)

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
  private getBetweenWords({ sentence, start, end }: { sentence: string; start?: string; end?: string }): string {
    const startIndex = start ? sentence.indexOf(start) + start.length : 0
    const endIndex = end ? sentence.lastIndexOf(end) : sentence.length

    return sentence
      .substring(startIndex, endIndex)
      .replace(/^\s+[\n|\r\n]/g, '') // remove potential starting newline
      .replace(/[\n|\r\n]\s+$/g, '') // remove potential ending empty whitespace line
  }
}
