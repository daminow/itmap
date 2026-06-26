import type { Market } from '@/types/taxonomy'
import type { DataIndex, FilterReason, FilterResult, IndexedRole } from '@/types/runtime'
import type { FiltersState } from '@/types/filters'
import { filtersAreEmpty } from '@/types/filters'
import type { DomainId, Range, RoleId } from '@/types/taxonomy'
import { marketBand } from '@/lib/currency'
import { normalize } from '@/lib/normalize'

export interface FilterContext {
  filters: FiltersState
  market: Market
}

export function rangesOverlap(a: Range, b: Range): boolean {
  return a[0] <= b[1] && b[0] <= a[1]
}

/** A role matches when every active facet is satisfied; level+salary+experience
 *  must be satisfied by the SAME LevelBand. */
export function roleMatches(role: IndexedRole, ctx: FilterContext): boolean {
  const f = ctx.filters
  if (f.roleTypes.length && !f.roleTypes.includes(role.type)) return false
  if (f.stack.length && !f.stack.some((s) => role.stackNorm.has(s))) return false
  if (f.search && !role.haystack.includes(f.search)) return false

  const needLevel = f.levels.length > 0
  const needExp = f.experience !== null
  const needSalary = f.salary !== null
  if (!needLevel && !needExp && !needSalary) return true

  // "market unknown" => salary facet treated as PASS (role included, flagged elsewhere).
  const salaryKnown = !needSalary || role.levels.some((b) => marketBand(b, ctx.market) !== undefined)

  return role.levels.some((b) => {
    if (needLevel && !f.levels.includes(b.level)) return false
    if (needExp && !rangesOverlap(f.experience as Range, b.experienceYears)) return false
    if (needSalary && salaryKnown) {
      const band = marketBand(b, ctx.market)
      if (band === undefined || !rangesOverlap(f.salary as Range, band)) return false
    }
    return true
  })
}

/** True when an active salary facet has no authored band in `market` for this role. */
export function salaryUnknown(role: IndexedRole, ctx: FilterContext): boolean {
  return ctx.filters.salary !== null && !role.levels.some((b) => marketBand(b, ctx.market) !== undefined)
}

export function runFilters(index: DataIndex, ctx: FilterContext): FilterResult {
  const matchedRoleIds = new Set<RoleId>()
  const matchedDomainIds = new Set<DomainId>()

  if (filtersAreEmpty(ctx.filters)) {
    for (const r of index.flatRoles) {
      matchedRoleIds.add(r.id)
      matchedDomainIds.add(r.domainId)
    }
    return { matchedRoleIds, matchedDomainIds, total: index.flatRoles.length }
  }

  for (const r of index.flatRoles) {
    if (roleMatches(r, ctx)) {
      matchedRoleIds.add(r.id)
      matchedDomainIds.add(r.domainId)
    }
  }
  return { matchedRoleIds, matchedDomainIds, total: matchedRoleIds.size }
}

/** Explain why a role failed (or passed) — for tooltip/aria, no logic duplication in UI. */
export function getFilterReason(role: IndexedRole, ctx: FilterContext): FilterReason {
  const f = ctx.filters
  if (f.roleTypes.length && !f.roleTypes.includes(role.type)) return 'type_excluded'
  if (f.stack.length && !f.stack.some((s) => role.stackNorm.has(s))) return 'stack_excluded'
  if (f.search && !role.haystack.includes(f.search)) return 'search_excluded'

  const needLevel = f.levels.length > 0
  const needExp = f.experience !== null
  const needSalary = f.salary !== null
  if (!needLevel && !needExp && !needSalary) return 'match'

  if (salaryUnknown(role, ctx) && roleMatches(role, ctx)) return 'market_unknown'
  if (roleMatches(role, ctx)) return 'match'

  // find the dominant level-scoped failure
  if (needLevel && !role.levels.some((b) => f.levels.includes(b.level))) return 'level_excluded'
  if (needSalary && !salaryUnknown(role, ctx)) return 'salary_excluded'
  if (needExp) return 'experience_excluded'
  return 'level_excluded'
}

export const REASON_TEXT: Record<FilterReason, string> = {
  match: 'Подходит под фильтр',
  type_excluded: 'Не подходит: другой тип роли',
  stack_excluded: 'Не подходит: нет выбранного стека',
  search_excluded: 'Не подходит: не найдено по запросу',
  level_excluded: 'Не подходит: нет выбранного грейда',
  salary_excluded: 'Не подходит: зарплата вне диапазона',
  experience_excluded: 'Не подходит: опыт вне диапазона',
  market_unknown: 'Нет данных по выбранному рынку (включено)',
}

/** For the search-result list: prefix-aware ranking of roles by query. */
export function rankRoles(index: DataIndex, query: string, limit = 20): IndexedRole[] {
  const q = normalize(query)
  if (!q) return []
  const scored: Array<{ r: IndexedRole; score: number }> = []
  for (const r of index.flatRoles) {
    const name = normalize(r.name)
    let score = 0
    if (name.startsWith(q)) score = 100
    else if (name.includes(q)) score = 70
    else if (r.haystack.includes(q)) score = 40
    if (score > 0) scored.push({ r, score })
  }
  scored.sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name, 'ru'))
  return scored.slice(0, limit).map((s) => s.r)
}
