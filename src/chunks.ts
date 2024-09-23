export default function chunk<T>(items: T[], maxPer: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const index = Math.floor(i / maxPer)
    if (!chunks[index]) {
      chunks.push([item])
    } else {
      chunks[index].push(item)
    }
  }
  return chunks
}
