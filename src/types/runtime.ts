import type { Domain, DomainId, Market, Range, Role, RoleId } from '@/types/taxonomy'

/** Role with derived fields computed once at index build time (not authored). */
export interface IndexedRole extends Role {
  /** Lowercased+trimmed stack tokens — single source of truth for the stack facet. */
  stackNorm: Set<string>
  /** Precomputed normalized search text (name+summary+tags+stack+specializations+domain). */
  haystack: string
  /** Display name of the owning domain (for breadcrumbs / search results). */
  domainName: string
}

export interface DataIndex {
  domains: Domain[]
  roleById: Map<RoleId, IndexedRole>
  domainById: Map<DomainId, Domain>
  flatRoles: IndexedRole[]
  /** All normalized stack tokens present in the dataset (for URL intersection + facet UI). */
  stackTokens: Set<string>
  /** Global salary bounds per market across all authored bands (for slider ranges). */
  salaryBounds: Record<Market, Range>
}

export interface FilterResult {
  matchedRoleIds: Set<RoleId>
  matchedDomainIds: Set<DomainId>
  total: number
}

/** Why a role failed (or passed) the filter — drives the "почему dimmed" tooltip/aria. */
export type FilterReason =
  | 'match'
  | 'type_excluded'
  | 'stack_excluded'
  | 'search_excluded'
  | 'level_excluded'
  | 'salary_excluded'
  | 'experience_excluded'
  | 'market_unknown'
