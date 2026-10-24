import { useEffect } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { decodeState, encodeState } from '@/lib/urlState'
import type { ShareableState } from '@/lib/urlState'

/** Keep shared links and browser back/forward navigation in sync. */
export function useUrlSync(): void {
  const index = useIndex()
  useEffect(() => {
    const ctx = { roleIds: new Set(index.roleById.keys()), domainIds: new Set(index.domainById.keys()), stackTokens: index.stackTokens }
    let restoring = false
    const navKey = () => {
      const s = useITmapStore.getState()
      return `${s.zoom.kind === 'domain' ? s.zoom.id : 'overview'}|${s.selectedRoleId ?? ''}`
    }
    const restore = () => {
      restoring = true
      const decoded = decodeState(window.location.search, ctx)
      useITmapStore.getState().hydrate({ view: 'sunburst', zoom: { kind: 'overview' }, selectedRoleId: null, ...decoded })
      useITmapStore.setState({ selectedNode: null })
      restoring = false
    }
    restore()
    let previousQuery = window.location.search
    let previousNav = navKey()
    const unsub = useITmapStore.subscribe(
      (s) => [s.filters, s.market, s.view, s.zoom, s.selectedRoleId],
      () => {
        if (restoring) return
        const s = useITmapStore.getState()
        const shareable: ShareableState = { filters: s.filters, market: s.market, view: s.view, zoom: s.zoom, selectedRoleId: s.selectedRoleId }
        const qs = encodeState(shareable)
        if (qs === previousQuery) return
        const nextNav = navKey()
        const url = `${window.location.pathname}${qs}${window.location.hash}`
        window.history[nextNav !== previousNav ? 'pushState' : 'replaceState'](null, '', url)
        previousQuery = qs
        previousNav = nextNav
      }
    )
    const onPopState = () => { restore(); previousQuery = window.location.search; previousNav = navKey() }
    window.addEventListener('popstate', onPopState)
    return () => { unsub(); window.removeEventListener('popstate', onPopState) }
  }, [index])
}
