// Core taxonomy types for ITmap. Authored data conforms to Domain/Role/SubRole;
// runtime adds derived fields (see types/runtime.ts).

// ----- branded ids (prevent mixing domain/role ids) -----
export type DomainId = string & { readonly __brand: 'DomainId' }
export type RoleId = string & { readonly __brand: 'RoleId' }

// ----- closed enums (single source of truth, also imported by urlState) -----
export const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead'] as const
export type Level = (typeof LEVELS)[number]

export const ROLE_TYPES = [
  'engineering',
  'data',
  'ops',
  'security',
  'qa',
  'design',
  'product',
  'management',
  'research',
  'support',
] as const
export type RoleType = (typeof ROLE_TYPES)[number]

export const DEMANDS = ['low', 'medium', 'high'] as const
export type Demand = (typeof DEMANDS)[number]

export const MARKETS = ['rub', 'usd', 'eur'] as const
export type Market = (typeof MARKETS)[number]

/** Inclusive numeric range [min, max], min <= max. */
export type Range = [min: number, max: number]

/** Per-market salary. `rub` is mandatory; usd/eur authored only where a real
 *  regional estimate exists (never FX-derived in the dataset). */
export interface SalaryByMarket {
  rub: Range
  usd?: Range
  eur?: Range
}

export interface LevelBand {
  level: Level
  salary: SalaryByMarket
  experienceYears: Range
}

/** The canonical, always-filterable unit. */
export interface Role {
  kind: 'role'
  id: RoleId
  domainId: DomainId
  name: string
  type: RoleType
  summary: string
  responsibilities: string[]
  whatToLookFor: string[]
  stack: string[]
  /** Former sub-roles, flattened: narrower flavors. Feed search, shown as chips. */
  specializations: string[]
  levels: LevelBand[]
  growthPath?: string
  /** How people are actually hired into this role in RU: channels (job boards, hunting,
   *  referrals, executive search) and selection style. One concrete sentence, no fluff. */
  employment?: string
  demand: Demand
  adjacentRoles: RoleId[]
  tags: string[]
}

export interface Domain {
  kind: 'domain'
  id: DomainId
  name: string
  /** Visual grouping for the overview ring (color family). */
  family: string
  /** CSS custom-property name for the domain accent, e.g. '--accent-backend'. */
  accent: string
  description?: string
  roles: Role[]
}

export interface Taxonomy {
  version: number
  domains: Domain[]
}
