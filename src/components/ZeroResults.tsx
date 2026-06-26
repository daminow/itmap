import { useMemoizedRelaxations } from '@/components/useRelaxations'
import { useITmapStore } from '@/store/useITmapStore'
import { t } from '@/i18n/ru'

/** Shown when filters exclude every role — offers the specific over-constraining relaxation. */
export function ZeroResults() {
  const clearFilters = useITmapStore((s) => s.clearFilters)
  const relax = useMemoizedRelaxations()

  return (
    <div className="zero" role="alertdialog" aria-label={t.zero.title}>
      <p className="zero__title">{t.zero.title}</p>
      <p className="zero__sub">{t.zero.sub}</p>
      <div className="zero__actions">
        {relax.map((r) => (
          <button key={r.label} type="button" className="zero__btn" onClick={r.apply}>
            {r.label} <span className="zero__hint">→ {r.count}</span>
          </button>
        ))}
        <button type="button" className="zero__btn zero__btn--reset" onClick={clearFilters}>
          {t.zero.resetAll}
        </button>
      </div>
    </div>
  )
}
