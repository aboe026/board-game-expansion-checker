import 'dotenv/config' // config is done before anything to ensure proper environment variables loaded

import env from './env'
import BggApi, { BoardGame, ItemType } from './bgg-api'

//
;(async () => {
  try {
    const collectionGames = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.BoardGame,
      exclude: ItemType.Expansion,
    })
    const gamesOwnedIds = collectionGames.map((game) => game.id)

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

    const possibleExpansions = await BggApi.getGames({
      ids: expansionIds,
      type: ItemType.Expansion,
    })

    const ownedExpansions = await BggApi.getCollectionGames({
      username: env.BGG_USERNAME,
      include: ItemType.Expansion,
    })
    const ownedExpansionIds = ownedExpansions.map((expansion) => expansion.id)

    for (const possibleExpansion of possibleExpansions) {
      if (!ownedExpansionIds.includes(possibleExpansion.id)) {
        const baseGameName = expansionToBaseGameMap[possibleExpansion.id].name
        console.log(
          `Game "${baseGameName}" has a new expansion "${possibleExpansion.name}" available "${possibleExpansion.year}"`
        )
      }
    }
  } catch (err: unknown) {
    console.error(err)
    process.exit(1)
  }
})()
