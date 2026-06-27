import { describe, it, expect } from 'vitest'
import { domains } from '@/data/registry'
import { validateTaxonomy } from '@/data/schema'
import { getIndex } from '@/data/index'

describe('dataset', () => {
  it('passes schema + integrity validation', () => {
    const { ok, errors } = validateTaxonomy(domains)
    if (!ok) console.error(errors.join('\n'))
    expect(errors).toEqual([])
    expect(ok).toBe(true)
  })

  it('builds an index with all roles and unique ids', () => {
    const index = getIndex()
    const ids = new Set(index.flatRoles.map((r) => r.id))
    expect(ids.size).toBe(index.flatRoles.length)
    expect(index.flatRoles.length).toBeGreaterThanOrEqual(150)
  })

  it('every role has at least one level band with a rub salary', () => {
    const index = getIndex()
    for (const r of index.flatRoles) {
      expect(r.levels.length).toBeGreaterThanOrEqual(1)
      for (const b of r.levels) expect(b.salary.rub[0]).toBeGreaterThan(0)
    }
  })

  it('includes the full leadership ladder (CTO/CIO/CPO/CISO)', () => {
    const index = getIndex()
    const names = index.flatRoles.map((r) => r.name).join(' | ')
    expect(names).toMatch(/CTO/)
    expect(names).toMatch(/CIO/)
    expect(names).toMatch(/CPO/)
    expect(names).toMatch(/CISO/)
  })

  it('every role meets content-quality thresholds', () => {
    const index = getIndex()
    const problems: string[] = []
    for (const r of index.flatRoles) {
      if (r.summary.trim().length < 20) problems.push(`${r.id}: summary too short`)
      if (r.responsibilities.length < 3) problems.push(`${r.id}: <3 responsibilities`)
      if (r.whatToLookFor.length < 2) problems.push(`${r.id}: <2 whatToLookFor`)
      if (r.stack.length < 1) problems.push(`${r.id}: empty stack`)
      // every role must describe how it is actually hired (channels + selection)
      if (!r.employment || r.employment.trim().length < 30) problems.push(`${r.id}: employment missing/too short`)
      // currency must be RUB-only (honest FX for $/€); no per-role usd/eur estimates
      for (const b of r.levels) {
        if (b.salary.usd || b.salary.eur) problems.push(`${r.id}: ${b.level} has usd/eur band (should be rub-only)`)
      }
      // salary bands strictly non-decreasing in rub lower bound
      for (let i = 1; i < r.levels.length; i++) {
        if (r.levels[i].salary.rub[0] < r.levels[i - 1].salary.rub[0])
          problems.push(`${r.id}: non-monotonic salary at ${r.levels[i].level}`)
      }
    }
    if (problems.length) console.error(problems.join('\n'))
    expect(problems).toEqual([])
  })

  it('every domain fits a readable ring (<= 13 roles) and families are grouped', () => {
    const index = getIndex()
    for (const d of index.domains) {
      expect(d.roles.length).toBeLessThanOrEqual(13)
      expect(d.family).toBeTruthy()
      expect(d.accent).toMatch(/^--/)
    }
  })
})
