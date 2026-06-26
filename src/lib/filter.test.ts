import { describe, it, expect } from 'vitest'
import { rangesOverlap, roleMatches, runFilters, salaryUnknown } from '@/lib/filter'
import type { IndexedRole } from '@/types/runtime'
import type { DataIndex } from '@/types/runtime'
import { EMPTY_FILTERS } from '@/types/filters'
import type { DomainId, RoleId } from '@/types/taxonomy'

function makeRole(over: Partial<IndexedRole> = {}): IndexedRole {
  return {
    kind: 'role',
    id: 'd.r' as RoleId,
    domainId: 'd' as DomainId,
    name: 'Backend-разработчик (Go)',
    type: 'engineering',
    summary: 'сервер на Go',
    responsibilities: [],
    whatToLookFor: [],
    stack: ['Go', 'PostgreSQL', 'Kafka'],
    specializations: [],
    levels: [
      { level: 'Junior', salary: { rub: [120000, 180000] }, experienceYears: [0, 1] },
      { level: 'Senior', salary: { rub: [320000, 450000], usd: [5000, 8000] }, experienceYears: [3, 6] },
    ],
    demand: 'high',
    adjacentRoles: [],
    tags: [],
    stackNorm: new Set(['go', 'postgresql', 'kafka']),
    haystack: 'backend-разработчик (go) сервер на go go postgresql kafka backend',
    domainName: 'Backend',
    ...over,
  }
}

const ctx = (over = {}, market: 'rub' | 'usd' | 'eur' = 'rub') => ({
  filters: { ...EMPTY_FILTERS, ...over },
  market,
})

describe('rangesOverlap', () => {
  it('overlaps inclusive', () => {
    expect(rangesOverlap([100, 200], [150, 300])).toBe(true)
    expect(rangesOverlap([100, 200], [200, 300])).toBe(true)
    expect(rangesOverlap([100, 200], [201, 300])).toBe(false)
  })
})

describe('roleMatches', () => {
  const role = makeRole()

  it('empty filters => match', () => {
    expect(roleMatches(role, ctx())).toBe(true)
  })

  it('roleType facet', () => {
    expect(roleMatches(role, ctx({ roleTypes: ['design'] }))).toBe(false)
    expect(roleMatches(role, ctx({ roleTypes: ['engineering'] }))).toBe(true)
  })

  it('stack OR-within (normalized)', () => {
    expect(roleMatches(role, ctx({ stack: ['kafka'] }))).toBe(true)
    expect(roleMatches(role, ctx({ stack: ['react'] }))).toBe(false)
    expect(roleMatches(role, ctx({ stack: ['react', 'go'] }))).toBe(true)
  })

  it('same-band rule: level + salary must be on the SAME band', () => {
    // Junior salary range but require Senior level => no single band satisfies both
    expect(roleMatches(role, ctx({ levels: ['Senior'], salary: [120000, 180000] }))).toBe(false)
    // Senior level + Senior salary on the same band
    expect(roleMatches(role, ctx({ levels: ['Senior'], salary: [320000, 450000] }))).toBe(true)
  })

  it('salary compared within the active market', () => {
    // usd band exists only on Senior
    expect(roleMatches(role, ctx({ salary: [5000, 8000] }, 'usd'))).toBe(true)
    expect(roleMatches(role, ctx({ salary: [99000, 100000] }, 'usd'))).toBe(false)
  })

  it('market unknown => role included, flagged', () => {
    const noEur = makeRole()
    expect(salaryUnknown(noEur, ctx({ salary: [1000, 2000] }, 'eur'))).toBe(true)
    // included despite salary filter because there is no eur band to exclude on
    expect(roleMatches(noEur, ctx({ salary: [1000, 2000] }, 'eur'))).toBe(true)
  })

  it('experience range', () => {
    expect(roleMatches(role, ctx({ experience: [4, 8] }))).toBe(true) // Senior 3-6 overlaps
    expect(roleMatches(role, ctx({ experience: [10, 20] }))).toBe(false)
  })
})

describe('runFilters', () => {
  const a = makeRole({ id: 'd.a' as RoleId })
  const b = makeRole({ id: 'd.b' as RoleId, type: 'design', stackNorm: new Set(['figma']), haystack: 'design figma' })
  const index = {
    flatRoles: [a, b],
    domains: [],
    roleById: new Map(),
    domainById: new Map(),
    stackTokens: new Set(),
    salaryBounds: { rub: [0, 0], usd: [0, 0], eur: [0, 0] },
  } as unknown as DataIndex

  it('empty filters matches all', () => {
    const r = runFilters(index, ctx())
    expect(r.total).toBe(2)
  })

  it('filters by type', () => {
    const r = runFilters(index, ctx({ roleTypes: ['engineering'] }))
    expect(r.total).toBe(1)
    expect(r.matchedRoleIds.has('d.a' as RoleId)).toBe(true)
  })
})
