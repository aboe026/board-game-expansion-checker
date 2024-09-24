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
    const expansionFilter = await getExpansionsToIgnore()

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
          if (link.type === ItemType.Expansion && !expansionFilter.includes(link.value)) {
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
  const gameNames = await getFileItems(env.GAME_IGNORE_FILE_PATH, 'GAME_IGNORE_FILE_PATH')
  console.log(`Excluding games: "${JSON.stringify(gameNames)}"`)
  return gameNames
}

async function getExpansionsToIgnore(): Promise<string[]> {
  const expansionNames = await getFileItems(env.EXPANSION_IGNORE_FILE_PATH, 'EXPANSION_IGNORE_FILE_PATH')
  console.log(`Excluding expansions: "${JSON.stringify(expansionNames)}"`)
  return expansionNames
}

async function getFileItems(filePath: string, envVarName: string): Promise<string[]> {
  const items: string[] = []
  if (filePath) {
    console.log(`${envVarName} set to "${filePath}", reading file for games to ignore.`)
    let resolvedFilePath = filePath
    if (!path.isAbsolute(resolvedFilePath)) {
      const relativeDir = path.join(__dirname, '..')
      console.log(`${envVarName} value "${filePath}" is not absolute, making relative to "${relativeDir}"`)
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
    for (const line of contents.split(/\n|\r\n/)) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        items.push(line.trim())
      }
    }
  }
  return items
}
