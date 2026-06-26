import { describe, it, expect } from 'vitest'
import { decodeState, encodeState } from '@/lib/urlState'
import type { DecodeContext, ShareableState } from '@/lib/urlState'
import { EMPTY_FILTERS } from '@/types/filters'
import type { DomainId, RoleId } from '@/types/taxonomy'

const ctx: DecodeContext = {
  roleIds: new Set(['backend.go', 'frontend.react']),
  domainIds: new Set(['backend', 'frontend']),
  stackTokens: new Set(['go', 'react', 'kubernetes']),
}

describe('encode/decode round-trip', () => {
  it('round-trips a full state', () => {
    const s: ShareableState = {
      filters: {
        ...EMPTY_FILTERS,
        search: 'go',
        salary: [200000, 350000],
        experience: [2, 6],
        stack: ['go', 'kubernetes'],
        levels: ['Senior'],
        roleTypes: ['engineering'],
      },
      market: 'rub',
      view: 'list',
      zoom: { kind: 'domain', id: 'backend' as DomainId },
      selectedRoleId: 'backend.go' as RoleId,
    }
    const qs = encodeState(s)
    const back = decodeState(qs, ctx)
    expect(back.market).toBe('rub')
    expect(back.view).toBe('list')
    expect(back.selectedRoleId).toBe('backend.go')
    expect(back.zoom).toEqual({ kind: 'domain', id: 'backend' })
    expect(back.filters?.salary).toEqual([200000, 350000])
    expect(back.filters?.stack).toEqual(['go', 'kubernetes'])
    expect(back.filters?.levels).toEqual(['Senior'])
  })
})

describe('hardening', () => {
  it('sal market wins over conflicting cur', () => {
    const back = decodeState('?cur=usd&sal=rub:1000-2000', ctx)
    expect(back.market).toBe('rub')
    expect(back.filters?.salary).toEqual([1000, 2000])
  })

  it('rejects NaN/inverted/oversized ranges', () => {
    expect(decodeState('?exp=abc-def', ctx).filters?.experience).toBeNull()
    expect(decodeState('?exp=10-2', ctx).filters?.experience).toEqual([2, 10]) // normalized
    expect(decodeState('?exp=999-1000', ctx).filters?.experience).toEqual([80, 80]) // clamped to EXP_MAX
  })

  it('drops unknown enum values and intersects stack with dataset', () => {
    expect(decodeState('?lvl=Senior,DROP_TABLE,Junior', ctx).filters?.levels).toEqual(['Senior', 'Junior'])
    expect(decodeState('?stack=go,nonsense,react', ctx).filters?.stack).toEqual(['go', 'react'])
  })

  it('ignores prototype-pollution keys', () => {
    const back = decodeState('?__proto__=x&constructor=y&q=hello', ctx)
    expect(back.filters?.search).toBe('hello')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('drops unresolved selection', () => {
    expect(decodeState('?sel=ghost.role', ctx).selectedRoleId).toBeUndefined()
  })

  it('fails safe on oversized query string', () => {
    const huge = '?q=' + 'a'.repeat(5000)
    expect(decodeState(huge, ctx)).toEqual({})
  })

  it('caps search length', () => {
    const back = decodeState('?q=' + 'x'.repeat(500), ctx)
    expect(back.filters?.search.length).toBe(200)
  })
})
