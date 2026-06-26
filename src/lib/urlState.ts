import type { DomainId, Level, Market, Range, RoleId, RoleType } from '@/types/taxonomy'
import { LEVELS, MARKETS, ROLE_TYPES } from '@/types/taxonomy'
import type { FiltersState } from '@/types/filters'
import { EMPTY_FILTERS } from '@/types/filters'
import type { Zoom } from '@/types/ui'
import { VIEW_MODES, type ViewMode } from '@/types/ui'
import { normalize } from '@/lib/normalize'

export interface ShareableState {
  filters: FiltersState
  market: Market
  view: ViewMode
  zoom: Zoom
  selectedRoleId: RoleId | null
}

export interface DecodeContext {
  roleIds: Set<string>
  domainIds: Set<string>
  stackTokens: Set<string>
}

const CAPS = { q: 200, stack: 50, array: 16, SAL_MAX: 100_000_000, EXP_MAX: 80, TOTAL_QS: 4000 }
const ALLOWED_PARAMS = new Set(['q', 'cur', 'view', 'z', 'sel', 'sal', 'exp', 'lvl', 'type', 'stack'])
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function parseRange(raw: string | null, hardMax: number): Range | null {
  if (!raw) return null
  const m = /^(\d{1,12})-(\d{1,12})$/.exec(raw) // only non-negative integers; no NaN/Inf/sign/exp
  if (!m) return null
  let lo = Math.min(Math.max(Number(m[1]), 0), hardMax)
  let hi = Math.min(Math.max(Number(m[2]), 0), hardMax)
  if (lo > hi) [lo, hi] = [hi, lo]
  return [lo, hi]
}

function parseEnumList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return []
  const set = new Set(allowed as readonly string[])
  const out = new Set<T>()
  for (const part of raw.split(',').slice(0, CAPS.array)) {
    if (set.has(part)) out.add(part as T)
  }
  return [...out]
}

export function decodeState(search: string, ctx: DecodeContext): Partial<ShareableState> {
  if (search.length > CAPS.TOTAL_QS) return {} // fail safe to defaults

  const params = new URLSearchParams(search)
  // whitelist + prototype-pollution guard
  for (const key of params.keys()) {
    if (FORBIDDEN_KEYS.has(key) || !ALLOWED_PARAMS.has(key)) params.delete(key)
  }

  const out: Partial<ShareableState> = {}

  // (1) enums
  const curRaw = params.get('cur')
  let market: Market = MARKETS.includes(curRaw as Market) ? (curRaw as Market) : 'rub'

  const viewRaw = params.get('view')
  if (viewRaw && (VIEW_MODES as readonly string[]).includes(viewRaw)) out.view = viewRaw as ViewMode

  // (2) sal is self-describing: <market>:<min>-<max>; its market wins.
  let salary: Range | null = null
  const salRaw = params.get('sal')
  if (salRaw) {
    const m = /^(rub|usd|eur):(\d{1,12}-\d{1,12})$/.exec(salRaw)
    if (m) {
      market = m[1] as Market
      salary = parseRange(m[2], CAPS.SAL_MAX)
    }
  }
  out.market = market

  // (3) experience
  const experience = parseRange(params.get('exp'), CAPS.EXP_MAX)

  // (4) stack: dedupe, intersect with dataset tokens, cap
  const stackRaw = params.get('stack')
  const stack: string[] = []
  if (stackRaw) {
    const seen = new Set<string>()
    for (const part of stackRaw.split(',')) {
      const n = normalize(part)
      if (n && ctx.stackTokens.has(n) && !seen.has(n)) {
        seen.add(n)
        stack.push(n)
        if (stack.length >= CAPS.stack) break
      }
    }
  }

  const levels = parseEnumList<Level>(params.get('lvl'), LEVELS)
  const roleTypes = parseEnumList<RoleType>(params.get('type'), ROLE_TYPES)

  const q = (params.get('q') ?? '').slice(0, CAPS.q)

  out.filters = { ...EMPTY_FILTERS, search: q, salary, experience, stack, levels, roleTypes }

  // (5) selection — only Roles; drop if unresolved
  const sel = params.get('sel')
  if (sel && ctx.roleIds.has(sel)) out.selectedRoleId = sel as RoleId

  // (6) zoom — resolve domain id; else overview (sel auto-derives domain in store)
  const z = params.get('z')
  if (z === 'overview') out.zoom = { kind: 'overview' }
  else if (z && z.startsWith('domain:')) {
    const id = z.slice('domain:'.length)
    if (ctx.domainIds.has(id)) out.zoom = { kind: 'domain', id: id as DomainId }
  }

  return out
}

export function encodeState(s: ShareableState): string {
  const p = new URLSearchParams()
  const f = s.filters
  if (f.search) p.set('q', f.search)
  if (s.market !== 'rub') p.set('cur', s.market)
  if (s.view !== 'sunburst') p.set('view', s.view)
  if (s.zoom.kind === 'domain') p.set('z', `domain:${s.zoom.id}`)
  if (s.selectedRoleId) p.set('sel', s.selectedRoleId)
  if (f.salary) p.set('sal', `${s.market}:${f.salary[0]}-${f.salary[1]}`)
  if (f.experience) p.set('exp', `${f.experience[0]}-${f.experience[1]}`)
  if (f.stack.length) p.set('stack', f.stack.join(','))
  if (f.levels.length) p.set('lvl', f.levels.join(','))
  if (f.roleTypes.length) p.set('type', f.roleTypes.join(','))
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}
