import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@/i18n/ru'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { useFilterResult } from '@/hooks/useFilterResult'
import { useMediaQuery } from '@/hooks/useReducedMotion'
import { filtersAreEmpty } from '@/types/filters'
import { LEVELS, ROLE_TYPES } from '@/types/taxonomy'
import type { Range } from '@/types/taxonomy'
import { ROLE_TYPE_LABEL } from '@/lib/labels'
import { MARKET_SYMBOL, formatMoney } from '@/lib/currency'
import { Popover } from '@/components/ui/Popover'
import { Sheet } from '@/components/ui/Sheet'
import { RangeSlider } from '@/components/filters/RangeSlider'
import { SlidersHorizontal, X } from 'lucide-react'

/**
 * Filter cluster that lives inline in the header: a single "Фильтры" dropdown
 * (popover on desktop, bottom-sheet on mobile) holding every facet, plus the
 * "shown N of M" count and a global reset. Each facet section has its own ×.
 */
export function FilterBar() {
  const index = useIndex()
  const filters = useITmapStore((s) => s.filters)
  const market = useITmapStore((s) => s.market)
  const toggleLevel = useITmapStore((s) => s.toggleLevel)
  const toggleRoleType = useITmapStore((s) => s.toggleRoleType)
  const toggleStack = useITmapStore((s) => s.toggleStack)
  const setSalary = useITmapStore((s) => s.setSalary)
  const setExperience = useITmapStore((s) => s.setExperience)
  const patchFilters = useITmapStore((s) => s.patchFilters)
  const clearFilters = useITmapStore((s) => s.clearFilters)
  const result = useFilterResult()
  const total = index.flatRoles.length
  const active = !filtersAreEmpty(filters)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [sheetOpen, setSheetOpen] = useState(false)

  const expBounds = useMemo<Range>(() => {
    let max = 0
    for (const r of index.flatRoles) for (const b of r.levels) max = Math.max(max, b.experienceYears[1])
    return [0, max]
  }, [index.flatRoles])

  const stackOptions = useMemo(() => [...index.stackTokens].sort(), [index.stackTokens])
  const salBounds = index.salaryBounds[market]

  const activeCount =
    (filters.levels.length ? 1 : 0) +
    (filters.salary ? 1 : 0) +
    (filters.experience ? 1 : 0) +
    (filters.stack.length ? 1 : 0) +
    (filters.roleTypes.length ? 1 : 0)

  const shown = active ? result.total : total

  const levelBody = (
    <fieldset className="facet" aria-label={t.filters.grade}>
      {LEVELS.map((l) => (
        <label key={l} className="facet__check">
          <input type="checkbox" checked={filters.levels.includes(l)} onChange={() => toggleLevel(l)} />
          {l}
        </label>
      ))}
    </fieldset>
  )
  const salaryBody = (
    <div className="facet">
      <p className="facet__hint">Зарплата · рынок {MARKET_SYMBOL[market]}</p>
      <RangeSlider
        bounds={salBounds}
        value={filters.salary}
        step={10000}
        ariaLabel="Зарплата"
        format={(n) => formatMoney(n, market)}
        onChange={setSalary}
      />
    </div>
  )
  const experienceBody = (
    <div className="facet">
      <p className="facet__hint">{t.filters.experienceHint}</p>
      <RangeSlider
        bounds={expBounds}
        value={filters.experience}
        ariaLabel="Опыт"
        format={(n) => `${n} лет`}
        onChange={setExperience}
      />
    </div>
  )
  const stackBody = <StackFacet options={stackOptions} selected={filters.stack} onToggle={toggleStack} />
  const typeBody = (
    <fieldset className="facet" aria-label={t.filters.roleType}>
      {ROLE_TYPES.map((rt) => (
        <label key={rt} className="facet__check">
          <input type="checkbox" checked={filters.roleTypes.includes(rt)} onChange={() => toggleRoleType(rt)} />
          {ROLE_TYPE_LABEL[rt]}
        </label>
      ))}
    </fieldset>
  )

  const sections = (
    <>
      <FacetSection title={t.filters.grade} active={filters.levels.length > 0} onClear={() => patchFilters({ levels: [] })}>
        {levelBody}
      </FacetSection>
      <FacetSection title={t.filters.salary} active={filters.salary !== null} onClear={() => setSalary(null)}>
        {salaryBody}
      </FacetSection>
      <FacetSection
        title={t.filters.experience}
        active={filters.experience !== null}
        onClear={() => setExperience(null)}
      >
        {experienceBody}
      </FacetSection>
      <FacetSection
        title={t.filters.roleType}
        active={filters.roleTypes.length > 0}
        onClear={() => patchFilters({ roleTypes: [] })}
      >
        {typeBody}
      </FacetSection>
      <FacetSection title={t.filters.stack} active={filters.stack.length > 0} onClear={() => patchFilters({ stack: [] })}>
        {stackBody}
      </FacetSection>
    </>
  )

  const triggerLabel = (
    <>
      <SlidersHorizontal size={15} aria-hidden /> {t.filters.button}
      {activeCount > 0 && <span className="filtermenu__badge">{activeCount}</span>}
    </>
  )

  return (
    <div className="filtermenu">
      {isMobile ? (
        <button
          type="button"
          className={`popover__trigger ${active ? 'popover__trigger--active' : ''}`}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          {triggerLabel}
        </button>
      ) : (
        <Popover label={triggerLabel} active={active} panelClassName="popover__panel--filters">
          {(close) => (
            <>
              {sections}
              <div className="filtermenu__foot">
                {active && (
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--md" onClick={clearFilters}>
                    {t.filters.resetAll}
                  </button>
                )}
                <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={close}>
                  {t.filters.show} {shown}
                </button>
              </div>
            </>
          )}
        </Popover>
      )}

      <span className="filtermenu__count">
        {t.filters.shown} <strong>{shown}</strong> {t.filters.of} {total}
      </span>
      {active && (
        <button type="button" className="filtermenu__reset" onClick={clearFilters}>
          <X size={15} aria-hidden /> {t.filters.reset}
        </button>
      )}

      {isMobile && (
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t.filters.button}
          footer={
            <div className="sheet__filter-footer">
              {active && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--md" onClick={clearFilters}>
                  {t.filters.resetAll}
                </button>
              )}
              <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={() => setSheetOpen(false)}>
                {t.filters.show} {shown}
              </button>
            </div>
          }
        >
          {sections}
        </Sheet>
      )}
    </div>
  )
}

/** A titled facet block with a per-section reset shown only when that facet is active. */
function FacetSection({
  title,
  active,
  onClear,
  children,
}: {
  title: string
  active: boolean
  onClear: () => void
  children: ReactNode
}) {
  return (
    <section className="facetsec">
      <div className="facetsec__head">
        <h3 className="facetsec__title">{title}</h3>
        {active && (
          <button
            type="button"
            className="facetsec__clear"
            onClick={onClear}
            aria-label={t.filters.clearGroup(title)}
          >
            <X size={13} aria-hidden /> {t.filters.reset}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function StackFacet({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (s: string) => void
}) {
  return (
    <div className="facet facet--stack">
      <div className="facet__list" role="group" aria-label="Стек">
        {options.map((s) => (
          <label key={s} className="facet__check">
            <input type="checkbox" checked={selected.includes(s)} onChange={() => onToggle(s)} />
            <span lang="en">{s}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
