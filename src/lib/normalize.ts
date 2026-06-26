/** Single normalization used by index/search/filter/URL so all comparisons agree. */
export function normalize(s: string): string {
  return s.toLocaleLowerCase('ru-RU').normalize('NFC').trim()
}
