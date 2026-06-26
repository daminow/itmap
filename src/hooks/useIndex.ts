import { useMemo } from 'react'
import { getIndex } from '@/data/index'
import type { DataIndex } from '@/types/runtime'

export function useIndex(): DataIndex {
  return useMemo(() => getIndex(), [])
}
