import { lazy, Suspense, useEffect } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useFilterResult } from '@/hooks/useFilterResult'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useMediaQuery } from '@/hooks/useReducedMotion'
import { useIndex } from '@/hooks/useIndex'
import { filtersAreEmpty } from '@/types/filters'
import type { ViewMode } from '@/types/ui'
import { TopBar } from '@/components/TopBar'
import { SunburstView } from '@/components/map/SunburstView'
import { RoleTree } from '@/components/tree/RoleTree'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { Coachmark } from '@/components/onboarding/Coachmark'
import { Toast } from '@/components/Toast'
import { ZeroResults } from '@/components/ZeroResults'
import { t } from '@/i18n/ru'
import { CircleDashed, Columns3, ListTree } from 'lucide-react'

// The icicle view is only rendered when selected — split it out of the initial bundle.
const IcicleView = lazy(() =>
  import('@/components/map/IcicleView').then((m) => ({ default: m.IcicleView }))
)

const VIEWS: { id: ViewMode; label: string; icon: typeof CircleDashed }[] = [
  { id: 'sunburst', label: t.views.sunburst, icon: CircleDashed },
  { id: 'icicle', label: t.views.icicle, icon: Columns3 },
  { id: 'list', label: t.views.list, icon: ListTree },
]

export default function App() {
  useUrlSync()
  const index = useIndex()
  const view = useITmapStore((s) => s.view)
  const setView = useITmapStore((s) => s.setView)
  const filters = useITmapStore((s) => s.filters)
  const railOpen = useITmapStore((s) => s.railOpen)
  const setRailOpen = useITmapStore((s) => s.setRailOpen)
  const selectedRoleId = useITmapStore((s) => s.selectedRoleId)
  const selectedNode = useITmapStore((s) => s.selectedNode)
  const result = useFilterResult()
  const filtering = !filtersAreEmpty(filters)
  const panelOpen = selectedRoleId != null || selectedNode != null
  const overlay = useMediaQuery('(max-width: 1100px)')

  // On narrow screens prefer the labelled list unless the URL asked for a view.
  useEffect(() => {
    const hasViewParam = new URLSearchParams(window.location.search).has('view')
    if (!hasViewParam && window.innerWidth < 920) setView('list')
  }, [setView])

  // On mobile the rail is an off-canvas drawer: close it once a role/node is chosen
  // (so the detail card isn't hidden behind it).
  useEffect(() => {
    if (overlay && panelOpen) setRailOpen(false)
  }, [overlay, panelOpen, setRailOpen])

  const announced = useDebouncedValue(
    filtering
      ? result.total === 0
        ? 'Ничего не найдено, измените фильтры'
        : `Показано ${result.total} ролей из ${index.flatRoles.length}`
      : '',
    300
  )

  const zero = filtering && result.total === 0

  return (
    <div className={`app ${railOpen ? 'is-rail-open' : ''} ${panelOpen ? 'is-panel-open' : ''}`}>
      <TopBar />

      <main className="app__main">
        <button
          type="button"
          className="app__scrim"
          tabIndex={-1}
          aria-hidden
          onClick={() => {
            if (overlay) setRailOpen(false)
            useITmapStore.getState().selectRole(null)
          }}
        />
        <aside className="app__rail" aria-label={t.a11y.treeRail} aria-hidden={!railOpen && overlay}>
          <RoleTree />
        </aside>

        <section className="app__stage" aria-label={t.a11y.map}>
          <div className="app__stage-head">
            <p className="app__stage-hint">{view === 'list' ? t.views.hintList : t.views.hintMap}</p>
            <div className="app__viewtoggle" role="group" aria-label={t.a11y.viewGroup}>
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={view === v.id ? 'is-active' : ''}
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                >
                  <v.icon size={15} aria-hidden /> {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`app__stage-body app__stage-body--${view}`}>
            <Suspense fallback={<div className="view-loading" aria-hidden />}>
              {view === 'sunburst' && <SunburstView />}
              {view === 'icicle' && <IcicleView />}
              {view === 'list' && (
                <div className="app__listview">
                  <RoleTree idPrefix="list" />
                </div>
              )}
            </Suspense>
            {zero && <ZeroResults />}
          </div>
        </section>

        <aside className="app__panel" aria-label={t.a11y.detail}>
          <DetailPanel onClose={() => useITmapStore.getState().selectRole(null)} />
        </aside>
      </main>

      <Coachmark />
      <Toast />
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </div>
    </div>
  )
}
