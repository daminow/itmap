import type { Level, Range, RoleType } from '@/types/taxonomy'

export interface FiltersState {
  /** Free-text query (normalized, debounced upstream). */
  search: string
  /** Salary range, interpreted in the active `market` (state.market). null = inactive. */
  salary: Range | null
  /** Years-of-experience range. null = inactive. */
  experience: Range | null
  /** Normalized stack tokens (lowercased), OR-within. */
  stack: string[]
  levels: Level[]
  roleTypes: RoleType[]
}

export const EMPTY_FILTERS: FiltersState = {
  search: '',
  salary: null,
  experience: null,
  stack: [],
  levels: [],
  roleTypes: [],
}

export function filtersAreEmpty(f: FiltersState): boolean {
  return (
    f.search === '' &&
    f.salary === null &&
    f.experience === null &&
    f.stack.length === 0 &&
    f.levels.length === 0 &&
    f.roleTypes.length === 0
  )
}
