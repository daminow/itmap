import { hierarchy as d3hierarchy } from 'd3-hierarchy'
import type { HierarchyNode } from 'd3-hierarchy'
import type { DataIndex, IndexedRole } from '@/types/runtime'

export type HKind = 'root' | 'family' | 'domain' | 'role'

export interface HData {
  id: string
  name: string
  kind: HKind
  /** CSS custom-property name for the colour, e.g. '--accent-backend'. */
  accent: string
  /** Present only on role nodes. */
  role?: IndexedRole
  children?: HData[]
}

export const FAMILY_VAR: Record<string, string> = {
  'Разработка': '--fam-dev',
  'Инфраструктура и эксплуатация': '--fam-infra',
  'Безопасность': '--fam-sec',
  'Данные и AI': '--fam-data',
  'Качество и дизайн': '--fam-quality',
  'Управление, продукт, архитектура': '--fam-mgmt',
  'Корпоративные, поддержка, нишевые': '--fam-corp',
}

/** Build root → families → domains → roles (registry order preserved). */
export function buildHierarchyData(index: DataIndex): HData {
  const byFamily = new Map<string, HData>()
  const order: string[] = []
  for (const d of index.domains) {
    if (!byFamily.has(d.family)) {
      order.push(d.family)
      byFamily.set(d.family, {
        id: `fam:${d.family}`,
        name: d.family,
        kind: 'family',
        accent: FAMILY_VAR[d.family] ?? '--accent-default',
        children: [],
      })
    }
    const fam = byFamily.get(d.family)!
    fam.children!.push({
      id: d.id,
      name: d.name,
      kind: 'domain',
      accent: d.accent,
      children: d.roles.map((r) => ({
        id: r.id,
        name: r.name,
        kind: 'role' as const,
        accent: d.accent,
        role: index.roleById.get(r.id),
      })),
    })
  }
  return {
    id: 'root',
    name: 'IT-сфера',
    kind: 'root',
    accent: '--accent-default',
    children: order.map((f) => byFamily.get(f)!),
  }
}

/** d3 hierarchy with value = number of roles (leaves count 1). */
export function buildHierarchy(index: DataIndex): HierarchyNode<HData> {
  return d3hierarchy(buildHierarchyData(index)).sum((d) => (d.kind === 'role' ? 1 : 0))
}
