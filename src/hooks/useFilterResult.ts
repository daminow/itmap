import { useMemo } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { runFilters } from '@/lib/filter'
import type { FilterResult } from '@/types/runtime'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { normalize } from '@/lib/normalize'

/** Memoized filter result over the store's filters + market. Search is debounced. */
export function useFilterResult(): FilterResult {
  const index = useIndex()
  const filters = useITmapStore((s) => s.filters)
  const market = useITmapStore((s) => s.market)
  const debouncedSearch = useDebouncedValue(filters.search, 250)

  return useMemo(() => {
    const ctx = {
      filters: { ...filters, search: normalize(debouncedSearch) },
      market,
    }
    return runFilters(index, ctx)
  }, [index, filters, market, debouncedSearch])
}
