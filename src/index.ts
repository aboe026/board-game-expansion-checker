import 'dotenv/config' // config is done before anything to ensure proper environment variables loaded

import fs from 'fs/promises'
import log4js from 'log4js'
import path from 'path'

import BggApi, { BoardGame, GameWithExpansions, ItemType } from './bgg-api'
import env from './env'
import Log from './log'
import Emailer from './emailer'

Log.configure()
const logger = log4js.getLogger('index')

/**
 * Main entrypoint
 */
;(async () => {
  try {
    const gameNameFilter = await getGamesToIgnore()
    const expansionFilter = await getExpansionsToIgnore()

    logger.info('Getting collection...')
    const collectionGames = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.BoardGame,
      exclude: ItemType.Expansion,
    })
    const filteredCollectionGames =
      gameNameFilter.length > 0
        ? collectionGames.filter((game) => game.owned && !gameNameFilter.includes(game.name))
        : collectionGames
    const gamesOwnedIds = filteredCollectionGames.map((game) => game.id)
    logger.trace(`gamesOwnedIds: "${JSON.stringify(gamesOwnedIds)}"`)

    logger.info(`Getting details of "${gamesOwnedIds.length}" game${gamesOwnedIds.length > 1 ? 's' : ''}...`)
    const games = await BggApi.getGames({
      ids: gamesOwnedIds,
      type: ItemType.BoardGame,
    })
    const expansionIds: number[] = []
    const expansionToBaseGameMap: {
      [expansionId: number]: BoardGame
    } = {}
    for (const game of games) {
      if (game.links) {
        for (const link of game.links) {
          logger.trace(`game "${game.name}" link: "${JSON.stringify(link)}"`)
          if (link.type !== ItemType.Expansion) {
            logger.debug(`Ignoring link "${link.value}" due to it not being of type "${ItemType.Expansion}"`)
          } else if (expansionFilter.includes(link.value)) {
            logger.debug(`Ignoring expansion "${link.value}" due to it being in expansion ignore list`)
          } else {
            expansionIds.push(link.id)
            expansionToBaseGameMap[link.id] = game
          }
        }
      }
    }

    logger.info(
      `Getting "${expansionIds.length}" expansion${expansionIds.length > 1 ? 's' : ''} for all games in collection...`
    )
    const possibleExpansions = await BggApi.getGames({
      ids: expansionIds,
      type: ItemType.Expansion,
    })

    logger.info('Getting expansions owned in collection...')
    const ownedExpansions = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.Expansion,
    })
    const ownedExpansionIds = ownedExpansions.filter((expansion) => expansion.owned).map((expansion) => expansion.id)
    logger.trace(`ownedExpansionIds: "${JSON.stringify(ownedExpansionIds)}"`)

    let unownedExpansionsCount = 0
    const unownedGameExpansions: GameWithExpansions[] = []
    for (const possibleExpansion of possibleExpansions) {
      logger.trace(`possibleExpansion: "${JSON.stringify(possibleExpansion)}"`)
      if (ownedExpansionIds.includes(possibleExpansion.id)) {
        logger.debug(`Expansion "${possibleExpansion.name}" already owned`)
      } else {
        unownedExpansionsCount++
        const baseGame = expansionToBaseGameMap[possibleExpansion.id]
        logger.trace(`baseGame: "${JSON.stringify(baseGame)}"`)
        const index = unownedGameExpansions.findIndex((gameWithExpansion) => gameWithExpansion.game.id === baseGame.id)
        logger.trace(`index: "${JSON.stringify(index)}"`)
        if (index < 0) {
          unownedGameExpansions.push({
            game: baseGame,
            expansions: [possibleExpansion],
          })
        } else {
          unownedGameExpansions[index].expansions.push(possibleExpansion)
        }
      }
    }
    if (unownedExpansionsCount === 0) {
      logger.info('No unowned expansions found.')
    } else {
      logger.info(`Found "${unownedExpansionsCount}" unowned expansions:`)
      logger.info('-------------------------------------------------------------')
      for (const unownedGameExpansion of unownedGameExpansions) {
        for (const unownedExpansion of unownedGameExpansion.expansions) {
          logger.info(
            `Game "${unownedGameExpansion.game.name}" has an expansion "${unownedExpansion.name}" available "${unownedExpansion.year}"`
          )
        }
      }
      await Emailer.send(unownedGameExpansions)
    }
  } catch (err: unknown) {
    logger.fatal(err)
    process.exitCode = 1
  } finally {
    log4js.shutdown()
  }
})()

/**
 * Gets array of game names to ignore (if any).
 *
 * @returns An array of game names to ignore.
 */
async function getGamesToIgnore(): Promise<string[]> {
  const gameNames = await getFileItems(env.GAME_IGNORE_FILE_PATH, 'GAME_IGNORE_FILE_PATH')
  logger.debug(`Excluding games: "${JSON.stringify(gameNames)}"`)
  return gameNames
}

/**
 * Gets array of expansions to ignore (if any).
 *
 * @returns An array of expansion names to ignore.
 */
async function getExpansionsToIgnore(): Promise<string[]> {
  const expansionNames = await getFileItems(env.EXPANSION_IGNORE_FILE_PATH, 'EXPANSION_IGNORE_FILE_PATH')
  logger.debug(`Excluding expansions: "${JSON.stringify(expansionNames)}"`)
  return expansionNames
}

/**
 * Gets the items in a newline-separated file, exluding empty lines and lines starting with comment character (#).
 *
 * @param filePath The path to the file on the system containing the newline-separated list of items to extract.
 * @param envVarName The environment variable defining the path to the file, used for logging.
 * @returns An array of items in the file, ignoring empty lines and lines starting with the comment character (#).
 */
async function getFileItems(filePath: string, envVarName: string): Promise<string[]> {
  const items: string[] = []
  if (filePath) {
    logger.trace(`${envVarName} set to "${filePath}", reading file for games to ignore.`)
    let resolvedFilePath = filePath
    if (!path.isAbsolute(resolvedFilePath)) {
      const relativeDir = path.join(__dirname, '..')
      logger.trace(`${envVarName} value "${filePath}" is not absolute, making relative to "${relativeDir}"`)
      resolvedFilePath = path.join(relativeDir, resolvedFilePath)
    }
    try {
      await fs.access(resolvedFilePath)
    } catch (err: unknown) {
      throw Error(`Could not read file "${resolvedFilePath}": ${err}`)
    }
    const contents = await fs.readFile(resolvedFilePath, {
      encoding: 'utf-8',
    })
    logger.trace(`File "${filePath}" contents: "${contents}"`)
    for (const line of contents.split(/\n|\r\n/)) {
      const trimmedLine = line.trim()
      if (!trimmedLine) {
        logger.trace('Ignoring line due to it being empty')
      } else if (trimmedLine.startsWith('#')) {
        logger.trace(`Ignoring line "${trimmedLine}" due to it starting with comment character "#"`)
      } else {
        items.push(line.trim())
      }
    }
  }
  return items
}
