import { useMemo } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { runFilters } from '@/lib/filter'
import type { FiltersState } from '@/types/filters'
import { normalize } from '@/lib/normalize'

interface Relaxation {
  label: string
  count: number
  apply: () => void
}

/** For each active facet, compute how many roles match if it is removed.
 *  Returns the most effective relaxations first. */
export function useMemoizedRelaxations(): Relaxation[] {
  const index = useIndex()
  const filters = useITmapStore((s) => s.filters)
  const market = useITmapStore((s) => s.market)
  const setSalary = useITmapStore((s) => s.setSalary)
  const setExperience = useITmapStore((s) => s.setExperience)
  const patchFilters = useITmapStore((s) => s.patchFilters)

  return useMemo(() => {
    const base: FiltersState = { ...filters, search: normalize(filters.search) }
    const count = (f: Partial<FiltersState>): number =>
      runFilters(index, { filters: { ...base, ...f }, market }).total

    const out: Relaxation[] = []
    if (filters.salary)
      out.push({ label: 'Убрать зарплату', count: count({ salary: null }), apply: () => setSalary(null) })
    if (filters.experience)
      out.push({
        label: 'Убрать опыт',
        count: count({ experience: null }),
        apply: () => setExperience(null),
      })
    if (filters.levels.length)
      out.push({ label: 'Убрать грейд', count: count({ levels: [] }), apply: () => patchFilters({ levels: [] }) })
    if (filters.roleTypes.length)
      out.push({ label: 'Убрать тип', count: count({ roleTypes: [] }), apply: () => patchFilters({ roleTypes: [] }) })
    if (filters.stack.length)
      out.push({ label: 'Убрать стек', count: count({ stack: [] }), apply: () => patchFilters({ stack: [] }) })

    return out.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 3)
  }, [index, filters, market, setSalary, setExperience, patchFilters])
}
