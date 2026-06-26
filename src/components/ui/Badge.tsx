import type { Demand } from '@/types/taxonomy'
import { Flame, Minus, TrendingDown } from 'lucide-react'
import { DEMAND_LABEL } from '@/lib/labels'

const DEMAND_ICON: Record<Demand, typeof Flame> = {
  high: Flame,
  medium: Minus,
  low: TrendingDown,
}

/** Demand badge — word + icon, never hue-only. */
export function DemandBadge({ demand }: { demand: Demand }) {
  const Icon = DEMAND_ICON[demand]
  return (
    <span className={`ui-badge ui-badge--demand-${demand}`}>
      <Icon size={13} aria-hidden />
      {DEMAND_LABEL[demand]}
    </span>
  )
}
