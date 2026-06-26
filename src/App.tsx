import { lazy, Suspense, useEffect, useState } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useFilterResult } from '@/hooks/useFilterResult'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useIndex } from '@/hooks/useIndex'
import { filtersAreEmpty } from '@/types/filters'
import type { ViewMode } from '@/types/ui'
import { TopBar } from '@/components/TopBar'
import { FilterBar } from '@/components/filters/FilterBar'
import { SunburstView } from '@/components/map/SunburstView'
import { RoleTree } from '@/components/tree/RoleTree'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { SearchCommand } from '@/components/SearchCommand'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const view = useITmapStore((s) => s.view)
  const setView = useITmapStore((s) => s.setView)
  const filters = useITmapStore((s) => s.filters)
  const result = useFilterResult()
  const filtering = !filtersAreEmpty(filters)

  // On narrow screens prefer the labelled list unless the URL asked for a view.
  useEffect(() => {
    const hasViewParam = new URLSearchParams(window.location.search).has('view')
    if (!hasViewParam && window.innerWidth < 920) setView('list')
  }, [setView])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    <div className="app">
      <TopBar onOpenSearch={() => setSearchOpen(true)} />
      <FilterBar />

      <main className="app__main">
        <aside className="app__rail" aria-label={t.a11y.treeRail}>
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

      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Coachmark />
      <Toast />
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </div>
    </div>
  )
}
