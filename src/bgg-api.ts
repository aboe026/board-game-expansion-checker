import xml2js from 'xml2js'
import sleep from './sleep'
import chunk from './chunks'

export default class BggApi {
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
    return response.items.item.map((item) => {
      return {
        id: Number(item.$.objectid),
        name: item.name[0]._,
        year: Number(item.yearpublished),
      }
    })
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
            }
          }),
        })
      }
    }

    return games
  }

  private static async request<T>(path: string): Promise<T> {
    const url = `https://boardgamegeek.com/xmlapi2/${path}`
    let response = await fetch(url)
    const status = response.status
    if (status === 202) {
      await sleep(2)
      response = await fetch(url)
    }
    const text = await response.text()
    return xml2js.parseStringPromise(text)
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
