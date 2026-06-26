import type { Domain, DomainId, Market, Range, RoleId } from '@/types/taxonomy'
import { MARKETS } from '@/types/taxonomy'
import type { DataIndex, IndexedRole } from '@/types/runtime'
import { normalize } from '@/lib/normalize'
import { domains as rawDomains } from '@/data/registry'

let cached: DataIndex | null = null

function symmetrizeAdjacency(domains: Domain[]): void {
  const roleIds = new Set<RoleId>()
  for (const d of domains) for (const r of d.roles) roleIds.add(r.id)
  const adj = new Map<RoleId, Set<RoleId>>()
  for (const d of domains)
    for (const r of d.roles) {
      const set = adj.get(r.id) ?? new Set<RoleId>()
      for (const a of r.adjacentRoles) if (a !== r.id && roleIds.has(a)) set.add(a)
      adj.set(r.id, set)
    }
  // make symmetric
  for (const [from, targets] of adj) for (const to of targets) adj.get(to)?.add(from)
  for (const d of domains) for (const r of d.roles) r.adjacentRoles = [...(adj.get(r.id) ?? [])]
}

function buildIndex(domains: Domain[]): DataIndex {
  symmetrizeAdjacency(domains)

  const roleById = new Map<RoleId, IndexedRole>()
  const domainById = new Map<DomainId, Domain>()
  const flatRoles: IndexedRole[] = []
  const stackTokens = new Set<string>()
  const bounds: Record<Market, [number, number] | null> = { rub: null, usd: null, eur: null }

  for (const d of domains) {
    domainById.set(d.id, d)
    for (const r of d.roles) {
      const stackNorm = new Set(r.stack.map(normalize))
      for (const t of stackNorm) stackTokens.add(t)
      const haystack = normalize(
        [r.name, r.summary, r.tags.join(' '), r.stack.join(' '), r.specializations.join(' '), d.name].join(' ')
      )
      const indexed: IndexedRole = { ...r, stackNorm, haystack, domainName: d.name }
      roleById.set(r.id, indexed)
      flatRoles.push(indexed)

      for (const band of r.levels) {
        for (const m of MARKETS) {
          const range = band.salary[m]
          if (!range) continue
          const cur = bounds[m]
          bounds[m] = cur ? [Math.min(cur[0], range[0]), Math.max(cur[1], range[1])] : [range[0], range[1]]
        }
      }
    }
  }

  const salaryBounds: Record<Market, Range> = {
    rub: bounds.rub ?? [0, 0],
    usd: bounds.usd ?? [0, 0],
    eur: bounds.eur ?? [0, 0],
  }

  return { domains, roleById, domainById, flatRoles, stackTokens, salaryBounds }
}

export function getIndex(): DataIndex {
  if (cached) return cached
  cached = buildIndex(rawDomains)
  if (import.meta.env.DEV) {
    // Dev-only structural validation. Dynamically imported so zod is tree-shaken from prod.
    void import('@/data/schema').then(({ validateTaxonomy }) => validateTaxonomy(rawDomains))
  }
  return cached
}
