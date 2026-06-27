import type { DomainId, RoleId } from '@/types/taxonomy'

export const VIEW_MODES = ['sunburst', 'icicle', 'list'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export type Zoom = { kind: 'overview' } | { kind: 'domain'; id: DomainId }

/** An immediate child of a selected org node — rendered as a clickable row in the panel. */
export interface NodeInfoChild {
  id: string
  name: string
  /** Number of subordinate roles (for group/department children). */
  count?: number
  /** Set when the child is itself a role — selecting it opens the full role card. */
  roleId?: RoleId
}

/** Summary of a non-role org node (CEO / executive / leadership group / department),
 *  shown in the detail panel on a single click. Transient (not URL-synced). */
export interface NodeInfo {
  id: string
  kind: 'root' | 'exec' | 'group' | 'domain'
  /** Short label (e.g. 'CTO'). */
  title: string
  /** Full title / department kind line (e.g. 'Технический директор'). */
  subtitle?: string
  blurb?: string
  accent: string
  /** Number of subordinate roles ("в подчинении"). */
  count: number
  children: NodeInfoChild[]
}
