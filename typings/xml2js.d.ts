declare module 'xml2js' {
  export function parseStringPromise<T>(xml: string): Promise<T>
}
