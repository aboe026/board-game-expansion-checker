import 'dotenv/config' // config is done before anything to ensure proper environment variables loaded

import fs from 'fs/promises'
import path from 'path'

import BggApi, { BoardGame, ItemType } from './bgg-api'
import env from './env'

/**
 * Main entrypoint
 */
;(async () => {
  try {
    const gameNameFilter = await getGamesToIgnore()

    console.log('Getting collection...')
    const collectionGames = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.BoardGame,
      exclude: ItemType.Expansion,
    })
    const filteredCollectionGames =
      gameNameFilter.length > 0
        ? collectionGames.filter((game) => !gameNameFilter.includes(game.name))
        : collectionGames
    const gamesOwnedIds = filteredCollectionGames.map((game) => game.id)

    console.log(`Getting details of "${gamesOwnedIds.length}" game${gamesOwnedIds.length > 1 ? 's' : ''}...`)
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
          if (link.type === ItemType.Expansion) {
            expansionIds.push(link.id)
            expansionToBaseGameMap[link.id] = game
          }
        }
      }
    }

    console.log(
      `Getting "${expansionIds.length}" expansion${expansionIds.length > 1 ? 's' : ''} for all games in collection...`
    )
    const possibleExpansions = await BggApi.getGames({
      ids: expansionIds,
      type: ItemType.Expansion,
    })

    console.log('Getting expansions owned in collection...')
    const ownedExpansions = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.Expansion,
    })
    const ownedExpansionIds = ownedExpansions.map((expansion) => expansion.id)

    for (const possibleExpansion of possibleExpansions) {
      if (!ownedExpansionIds.includes(possibleExpansion.id)) {
        const baseGameName = expansionToBaseGameMap[possibleExpansion.id].name
        console.log(
          `Game "${baseGameName}" has an expansion "${possibleExpansion.name}" available "${possibleExpansion.year}"`
        )
      }
    }
  } catch (err: unknown) {
    console.error(err)
    process.exit(1)
  }
})()

/**
 * Gets array of game names to ignore (if any).
 *
 * @returns An array of game names to ignore.
 */
async function getGamesToIgnore(): Promise<string[]> {
  const gameNameFilter: string[] = []
  if (env.GAME_IGNORE_FILE_PATH) {
    console.log(`GAME_IGNORE_FILE_PATH set to "${env.GAME_IGNORE_FILE_PATH}", reading file for games to ignore.`)
    let gameIgnorePath = env.GAME_IGNORE_FILE_PATH
    if (!path.isAbsolute(gameIgnorePath)) {
      const relativeDir = path.join(__dirname, '..')
      console.log(
        `GAME_IGNORE_FILE_PATH value "${env.GAME_IGNORE_FILE_PATH}" is not absolute, making relative to "${relativeDir}"`
      )
      gameIgnorePath = path.join(relativeDir, gameIgnorePath)
    }
    try {
      await fs.access(gameIgnorePath)
    } catch (err: unknown) {
      throw Error(`Could not read file "${gameIgnorePath}": ${err}`)
    }
    const contents = await fs.readFile(env.GAME_IGNORE_FILE_PATH, {
      encoding: 'utf-8',
    })
    for (const line of contents.split(/\n|\r\n/)) {
      const gameName = line.trim()
      if (gameName) {
        gameNameFilter.push(line.trim())
      }
    }
    console.log(`Excluding games: "${JSON.stringify(gameNameFilter)}"`)
  }
  return gameNameFilter
}
