import type { DomainId } from '@/types/taxonomy'

export const VIEW_MODES = ['sunburst', 'icicle', 'list'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export type Zoom = { kind: 'overview' } | { kind: 'domain'; id: DomainId }
