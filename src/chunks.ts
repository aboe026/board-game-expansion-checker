import { getLogger } from 'log4js'

const logger = getLogger('chunk')

/**
 * Break an array into smaller arrays with each sub-array no larger than maxPer.
 *
 * @param items The items to break into smaller arrays.
 * @param maxPer The maximum length of each sub-array.
 * @returns An array containing the sub-arrays of items.
 */
export default function chunk<T>(items: T[], maxPer: number): T[][] {
  logger.trace(`items: "${JSON.stringify(items)}"`)
  logger.trace(`maxPer: "${maxPer}"`)
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i++) {
    logger.trace(`i: "${i}"`)
    const item = items[i]
    const index = Math.floor(i / maxPer)
    logger.trace(`index: "${index}"`)
    if (!chunks[index]) {
      logger.trace(`No array defined for index "${index}", creating one`)
      chunks.push([item])
    } else {
      logger.trace(`Existing array for index "${index}", pushing to it`)
      chunks[index].push(item)
    }
  }
  logger.debug(`chunks: "${JSON.stringify(items)}"`)
  return chunks
}
