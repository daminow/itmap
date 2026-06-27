import type {
  Demand,
  Domain,
  DomainId,
  Level,
  LevelBand,
  Role,
  RoleId,
  RoleType,
} from '@/types/taxonomy'

export interface RoleInput {
  /** Bare local id; namespaced to `${domainId}.${id}` by defineDomain. */
  id: string
  name: string
  type: RoleType
  summary: string
  responsibilities: string[]
  whatToLookFor: string[]
  stack: string[]
  specializations?: string[]
  levels: LevelBand[]
  growthPath?: string
  employment?: string
  demand: Demand
  /** Fully-qualified role ids (e.g. 'backend.go'); resolved + symmetrized at build. */
  adjacentRoles?: string[]
  tags?: string[]
}

export interface DomainInput {
  id: string
  name: string
  family: string
  accent: string
  description?: string
  roles: RoleInput[]
}

export const LEVEL_ORDER: Record<Level, number> = { Junior: 0, Middle: 1, Senior: 2, Lead: 3 }

/** Authoring helper — injects domainId, namespaces role ids, normalizes level order.
 *  Source of truth: no satisfies-then-mutate. */
export function defineDomain(input: DomainInput): Domain {
  const did = input.id as DomainId
  const roles: Role[] = input.roles.map((r): Role => {
    const rid = `${input.id}.${r.id}` as RoleId
    const levels = [...r.levels].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
    return {
      kind: 'role',
      id: rid,
      domainId: did,
      name: r.name,
      type: r.type,
      summary: r.summary,
      responsibilities: r.responsibilities,
      whatToLookFor: r.whatToLookFor,
      stack: r.stack,
      specializations: r.specializations ?? [],
      levels,
      growthPath: r.growthPath,
      employment: r.employment,
      demand: r.demand,
      adjacentRoles: (r.adjacentRoles ?? []) as RoleId[],
      tags: r.tags ?? [],
    }
  })
  return {
    kind: 'domain',
    id: did,
    name: input.name,
    family: input.family,
    accent: input.accent,
    description: input.description,
    roles,
  }
}

/** Helper for authoring rub-only bands concisely. */
export function band(
  level: Level,
  salaryRub: [number, number],
  experienceYears: [number, number],
  extra?: { usd?: [number, number]; eur?: [number, number] }
): LevelBand {
  return {
    level,
    salary: { rub: salaryRub, ...(extra?.usd ? { usd: extra.usd } : {}), ...(extra?.eur ? { eur: extra.eur } : {}) },
    experienceYears,
  }
}
