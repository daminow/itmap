// Build-time / dev-only validation. NEVER imported by runtime code (eslint guards it).
// Dynamically imported under import.meta.env.DEV so zod is 0 bytes in the prod bundle.
import { z } from 'zod'
import type { Domain } from '@/types/taxonomy'
import { DEMANDS, LEVELS, MARKETS, ROLE_TYPES } from '@/types/taxonomy'

// Salary must be strictly positive; experience may start at 0 (Junior).
const SalaryRangeSchema = z
  .tuple([z.number(), z.number()])
  .refine(([a, b]) => a > 0 && a <= b, 'salary range must satisfy 0 < min <= max')

const ExpRangeSchema = z
  .tuple([z.number(), z.number()])
  .refine(([a, b]) => a >= 0 && a <= b, 'experience range must satisfy 0 <= min <= max')

const SalarySchema = z
  .object({ rub: SalaryRangeSchema, usd: SalaryRangeSchema.optional(), eur: SalaryRangeSchema.optional() })
  .strict()

const BandSchema = z
  .object({
    level: z.enum(LEVELS),
    salary: SalarySchema,
    experienceYears: ExpRangeSchema,
  })
  .strict()

const RoleSchema = z
  .object({
    kind: z.literal('role'),
    id: z.string().min(1),
    domainId: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(ROLE_TYPES),
    summary: z.string().min(1),
    responsibilities: z.array(z.string()),
    whatToLookFor: z.array(z.string()),
    stack: z.array(z.string()),
    specializations: z.array(z.string()),
    levels: z.array(BandSchema).min(1),
    growthPath: z.string().optional(),
    employment: z.string().min(1).optional(),
    demand: z.enum(DEMANDS),
    adjacentRoles: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .strict()
  .refine((r) => {
    // band monotonicity: non-decreasing rub lower bound across canonical level order
    const order: Record<string, number> = { Junior: 0, Middle: 1, Senior: 2, Lead: 3 }
    const sorted = [...r.levels].sort((a, b) => order[a.level] - order[b.level])
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].salary.rub[0] < sorted[i - 1].salary.rub[0]) return false
    }
    return true
  }, 'salary bands must be monotonic across levels')

const DomainSchema = z
  .object({
    kind: z.literal('domain'),
    id: z.string().min(1),
    name: z.string().min(1),
    family: z.string().min(1),
    accent: z.string().startsWith('--'),
    description: z.string().optional(),
    roles: z.array(RoleSchema).min(1),
  })
  .strict()

export function validateTaxonomy(domains: Domain[]): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const roleIds = new Set<string>()
  const domainIds = new Set<string>()

  for (const d of domains) {
    const parsed = DomainSchema.safeParse(d)
    if (!parsed.success) {
      errors.push(`Domain "${d.id ?? '?'}": ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    }
    if (domainIds.has(d.id)) errors.push(`Duplicate domain id: ${d.id}`)
    domainIds.add(d.id)
    for (const r of d.roles ?? []) {
      if (roleIds.has(r.id)) errors.push(`Duplicate role id: ${r.id}`)
      roleIds.add(r.id)
    }
  }
  // adjacency integrity
  for (const d of domains)
    for (const r of d.roles ?? [])
      for (const a of r.adjacentRoles ?? []) {
        if (a === r.id) errors.push(`Role ${r.id} lists itself in adjacentRoles`)
        else if (!roleIds.has(a)) errors.push(`Role ${r.id} -> unknown adjacent ${a}`)
      }

  if (errors.length && typeof console !== 'undefined') {
    console.error(`[ITmap] dataset validation: ${errors.length} issue(s)\n` + errors.join('\n'))
  }
  void MARKETS
  return { ok: errors.length === 0, errors }
}
