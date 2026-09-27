export interface CodeSymbolItem {
  name: string
  kind: string
  level: number
  line: number
}

export async function fetchCodeSymbols(_path: string): Promise<{ symbols: CodeSymbolItem[] } | null> {
  // Return null so TocPanel uses client-side extractToc() immediately
  return null
}
