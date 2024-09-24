import { getLogger } from 'log4js'
import xml2js from 'xml2js'

import sleep from './sleep'
import chunk from './chunks'
import env from './env'

export default class BggApi {
  private static logger = getLogger('BggApi')

  static async getCollectionGames({
    exclude,
    include,
    username,
  }: {
    username: string
    include?: ItemType
    exclude?: ItemType
  }): Promise<CollectionGame[]> {
    const queryParams = [`username=${username}`, 'own=1']
    if (include) {
      queryParams.push(`subtype=${include}`)
    }
    if (exclude) {
      queryParams.push(`excludesubtype=${exclude}`)
    }
    const response = await BggApi.request<CollectionResponse>(`collection?${queryParams.join('&')}`)
    const games = response.items.item.map((item) => {
      return {
        id: Number(item.$.objectid),
        name: item.name[0]._,
        year: Number(item.yearpublished),
      }
    })
    BggApi.logger.trace(`getCollectionGames games: "${JSON.stringify(games)}"`)
    return games
  }

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

  private static async request<T>(path: string): Promise<T> {
    const url = `https://boardgamegeek.com/xmlapi2/${path}`
    BggApi.logger.trace(`request - Sending request to URL: "${url}"`)
    let response = await fetch(url)
    const status = response.status
    BggApi.logger.trace(`request - status: "${response.status}"`)
    if (status === 202) {
      BggApi.logger.debug(`Retrying request in "${env.RETRY_WAIT_SECONDS}" seconds...`)
      await sleep(env.RETRY_WAIT_SECONDS)
      response = await fetch(url)
    }
    const text = await response.text()
    BggApi.logger.trace(`request - text: "${text}"`)
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
}

export interface BoardGame extends CollectionGame {
  links?: {
    id: number
    type: string
    value: string
  }[]
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
