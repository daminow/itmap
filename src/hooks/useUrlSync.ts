import { useEffect } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { decodeState, encodeState } from '@/lib/urlState'
import type { ShareableState } from '@/lib/urlState'

/** One-way hydrate on mount; push (pushState for nav, replaceState for tweaks) on change. */
export function useUrlSync(): void {
  const index = useIndex()

  useEffect(() => {
    const ctx = {
      roleIds: new Set(index.roleById.keys()),
      domainIds: new Set(index.domainById.keys()),
      stackTokens: index.stackTokens,
    }
    const decoded = decodeState(window.location.search, ctx)
    if (Object.keys(decoded).length) useITmapStore.getState().hydrate(decoded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let prev = ''
    let prevNav = ''
    const write = () => {
      const s = useITmapStore.getState()
      const shareable: ShareableState = {
        filters: s.filters,
        market: s.market,
        view: s.view,
        zoom: s.zoom,
        selectedRoleId: s.selectedRoleId,
      }
      const qs = encodeState(shareable)
      if (qs === prev) return
      prev = qs
      const url = `${window.location.pathname}${qs}${window.location.hash}`
      // Navigation changes (zoom/selection) go on the history stack; filter tweaks replace.
      const navKey = `${s.zoom.kind === 'domain' ? s.zoom.id : 'overview'}|${s.selectedRoleId ?? ''}`
      if (navKey !== prevNav) {
        prevNav = navKey
        window.history.pushState(null, '', url)
      } else {
        window.history.replaceState(null, '', url)
      }
    }
    const unsub = useITmapStore.subscribe(
      (s) => [s.filters, s.market, s.view, s.zoom, s.selectedRoleId],
      write
    )
    return unsub
  }, [])
}
