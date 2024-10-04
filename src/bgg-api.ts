import { getLogger } from 'log4js'
import xml2js from 'xml2js'

import sleep from './sleep'
import chunk from './chunks'
import env from './env'

/**
 * A static class to interact with the Board Game Geek website.
 */
export default class BggApi {
  private static logger = getLogger('BggApi')

  /**
   * Get all games in a collection of a certain type.
   *
   * @param config The configuration of games to retrieve.
   * @param config.exclude The type of game to exclude in results.
   * @param config.include The type of game to include in results.
   * @param config.username The name of the user to scope the collection games to.
   * @returns The games in the users collection.
   */
  static async getCollectionGames({
    exclude,
    include,
    username,
  }: {
    username: string
    include?: ItemType
    exclude?: ItemType
  }): Promise<CollectionGame[]> {
    const queryParams = [`username=${username}`]
    if (include) {
      queryParams.push(`subtype=${include}`)
    }
    if (exclude) {
      queryParams.push(`excludesubtype=${exclude}`)
    }
    const response = await BggApi.request<CollectionResponse>(`collection?${queryParams.join('&')}`)
    const games: CollectionGame[] = response.items.item.map((item) => {
      return {
        id: Number(item.$.objectid),
        name: item.name[0]._,
        year: Number(item.yearpublished),
        owned: item.status[0].$.own === '1',
      }
    })
    BggApi.logger.trace(`getCollectionGames games: "${JSON.stringify(games)}"`)
    return games
  }

  /**
   * Get board games by their ids and type.
   *
   * @param config The configuration of which board games to get.
   * @param config.ids The IDs of the board games to retreive.
   * @param config.type The board game type to scope results to.
   * @returns The board games with the given ids and type.
   */
  static async getGames({ ids, type }: { ids: number[]; type: ItemType }): Promise<BoardGame[]> {
    const games: BoardGame[] = []
    const chunks = chunk(ids, 20)
    for (const chunk of chunks) {
      const queryParams = [`id=${chunk.join(',')}`, `type=${type}`].join('&')
      const batch = await BggApi.request<GamesResponse>(`thing?${queryParams}`)
      for (const item of batch.items.item) {
        games.push({
          id: Number(item.$.id),
          name: item.name[0].$.value,
          year: Number(item.yearpublished[0].$.value),
          links: item.link.map((link) => {
            return {
              id: Number(link.$.id),
              type: link.$.type,
              value: link.$.value,
            }
          }),
        })
      }
    }
    BggApi.logger.trace(`getGames games: "${JSON.stringify(games)}"`)

    return games
  }

  /**
   * Send a request to the Board Game Geek website. Will automatically retry requests if queued.
   *
   * @param path The path on the Board Game Geek XML api (v2) to request.
   * @returns The JSON representation of the data returned from the endpoint.
   */
  private static async request<T>(path: string): Promise<T> {
    const url = `https://boardgamegeek.com/xmlapi2/${path}`
    BggApi.logger.trace(`request - Sending request to URL: "${url}"`)
    let attempt = 0
    let text: string | undefined = undefined
    while (text === undefined && attempt < env.RETRY_ATTEMPTS) {
      attempt++
      BggApi.logger.debug(`Attempt ${attempt}/${env.RETRY_ATTEMPTS} for endpoint "${path}"`)
      const response = await fetch(url)
      const status = response.status
      BggApi.logger.trace(`request - status: "${response.status}"`)
      if (status === 202) {
        BggApi.logger.debug(`Retrying request in "${env.RETRY_WAIT_SECONDS}" seconds...`)
        await sleep(env.RETRY_WAIT_SECONDS)
      } else {
        text = await response.text()
      }
    }
    BggApi.logger.trace(`request - text: "${text}"`)
    if (!text) {
      throw Error(`Could not get response for endpoint "${path}" in "${env.RETRY_ATTEMPTS}" attempts.`)
    }
    const json = await xml2js.parseStringPromise(text)
    BggApi.logger.trace(`request - json: "${JSON.stringify(json)}"`)
    return json as T
  }
}

export enum ItemType {
  BoardGame = 'boardgame',
  Expansion = 'boardgameexpansion',
}

interface CollectionGame {
  name: string
  year: number
  id: number
  owned: boolean
}

export interface BoardGame {
  name: string
  year: number
  id: number
  links?: {
    id: number
    type: string
    value: string
  }[]
}

export interface GameWithExpansions {
  game: BoardGame
  expansions: BoardGame[]
}

interface CollectionResponse {
  items: {
    item: {
      $: {
        objectid: string
        subtype: string
      }
      name: {
        _: string
      }[]
      yearpublished: string[]
      status: {
        $: {
          own: string
          prevowned: string
          fortrade: string
          want: string
          wanttoplay: string
          wanttobuy: string
          wishlist: string
          preordered: string
          lastmodified: string
        }
      }[]
    }[]
  }
}

interface GamesResponse {
  items: {
    item: {
      $: {
        type: string
        id: string
      }
      name: {
        $: {
          type: string
          value: string
        }
      }[]
      yearpublished: {
        $: {
          value: string
        }
      }[]
      link: {
        $: {
          type: string
          id: string
          value: string
        }
      }[]
    }[]
  }
}
