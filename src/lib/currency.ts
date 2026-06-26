import type { LevelBand, Market, Range } from '@/types/taxonomy'

/** FX table — DISPLAY ONLY. Never imported by the filter (eslint enforces this).
 *  Units of RUB per 1 unit of currency. Update manually. */
export const FX_DATE = '2026-06-25'
export const USD_TO_RUB = 95
export const EUR_TO_RUB = 102

const TO_RUB: Record<Market, number> = { rub: 1, usd: USD_TO_RUB, eur: EUR_TO_RUB }

/** Returns true if the FX table is older than ~3 months relative to a given "now". */
export function fxIsStale(nowIso: string): boolean {
  const fx = new Date(FX_DATE).getTime()
  const now = new Date(nowIso).getTime()
  if (Number.isNaN(fx) || Number.isNaN(now)) return false
  return now - fx > 1000 * 60 * 60 * 24 * 92
}

/** The ONLY currency export the filter may import: authored band for `market`, or undefined. */
export function marketBand(band: LevelBand, market: Market): Range | undefined {
  return band.salary[market]
}

export interface DisplayBand {
  range: Range
  approximate: boolean
}

/** Display-only: authored range if present, else FX-approximated from rub. */
export function displayBand(band: LevelBand, market: Market): DisplayBand {
  const authored = band.salary[market]
  if (authored) return { range: authored, approximate: false }
  const rub = band.salary.rub
  const rate = TO_RUB[market]
  return { range: [Math.round(rub[0] / rate), Math.round(rub[1] / rate)], approximate: true }
}

/** Convert a value in RUB to the target market (display only). */
export function fxApprox(rubValue: number, market: Market): number {
  return Math.round(rubValue / TO_RUB[market])
}

const FMT: Record<Market, Intl.NumberFormat> = {
  rub: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
  usd: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  eur: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
}

export function formatMoney(value: number, market: Market): string {
  return FMT[market].format(value)
}

export function formatSalary([lo, hi]: Range, market: Market): string {
  return `${FMT[market].format(lo)} – ${FMT[market].format(hi)}`
}

export const MARKET_LABEL: Record<Market, string> = {
  rub: 'Рынок РФ ₽',
  usd: 'Рынок US $',
  eur: 'Рынок EU €',
}

export const MARKET_SYMBOL: Record<Market, string> = { rub: '₽', usd: '$', eur: '€' }
