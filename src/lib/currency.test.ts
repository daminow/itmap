import { describe, it, expect } from 'vitest'
import { displayBand, fxApprox, formatSalary, marketBand } from '@/lib/currency'
import type { LevelBand } from '@/types/taxonomy'

const band: LevelBand = {
  level: 'Senior',
  salary: { rub: [300000, 450000], usd: [4000, 6000] },
  experienceYears: [3, 6],
}

describe('currency', () => {
  it('marketBand returns authored band or undefined', () => {
    expect(marketBand(band, 'rub')).toEqual([300000, 450000])
    expect(marketBand(band, 'usd')).toEqual([4000, 6000])
    expect(marketBand(band, 'eur')).toBeUndefined()
  })

  it('displayBand uses authored when present, FX otherwise', () => {
    expect(displayBand(band, 'usd')).toEqual({ range: [4000, 6000], approximate: false })
    const eur = displayBand(band, 'eur')
    expect(eur.approximate).toBe(true)
    expect(eur.range[0]).toBeGreaterThan(0)
  })

  it('fxApprox converts rub down to market', () => {
    expect(fxApprox(95000, 'usd')).toBe(1000)
  })

  it('formatSalary renders a currency range', () => {
    const s = formatSalary([100000, 200000], 'rub')
    expect(s).toContain('–')
  })
})
