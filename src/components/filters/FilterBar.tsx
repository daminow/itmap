import { useMemo, useState } from 'react'
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
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { RangeSlider } from '@/components/filters/RangeSlider'
import { SlidersHorizontal } from 'lucide-react'

export function FilterBar() {
  const index = useIndex()
  const filters = useITmapStore((s) => s.filters)
  const market = useITmapStore((s) => s.market)
  const toggleLevel = useITmapStore((s) => s.toggleLevel)
  const toggleRoleType = useITmapStore((s) => s.toggleRoleType)
  const toggleStack = useITmapStore((s) => s.toggleStack)
  const setSalary = useITmapStore((s) => s.setSalary)
  const setExperience = useITmapStore((s) => s.setExperience)
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

  const levelBody = (
    <fieldset className="facet">
      <legend className="facet__legend">{t.filters.grade}</legend>
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
    <fieldset className="facet">
      <legend className="facet__legend">{t.filters.roleType}</legend>
      {ROLE_TYPES.map((rt) => (
        <label key={rt} className="facet__check">
          <input type="checkbox" checked={filters.roleTypes.includes(rt)} onChange={() => toggleRoleType(rt)} />
          {ROLE_TYPE_LABEL[rt]}
        </label>
      ))}
    </fieldset>
  )

  const chips = active && (
    <div className="filterbar__chips">
      {filters.levels.map((l) => (
        <Chip key={l} onRemove={() => toggleLevel(l)} removeLabel={`Убрать ${l}`}>
          {l}
        </Chip>
      ))}
      {filters.salary && (
        <Chip onRemove={() => setSalary(null)} removeLabel="Убрать зарплату">
          {formatMoney(filters.salary[0], market)}–{formatMoney(filters.salary[1], market)}
        </Chip>
      )}
      {filters.experience && (
        <Chip onRemove={() => setExperience(null)} removeLabel="Убрать опыт">
          опыт {filters.experience[0]}–{filters.experience[1]} лет
        </Chip>
      )}
      {filters.stack.map((s) => (
        <Chip key={s} onRemove={() => toggleStack(s)} removeLabel={`Убрать ${s}`}>
          {s}
        </Chip>
      ))}
      {filters.roleTypes.map((rt) => (
        <Chip key={rt} onRemove={() => toggleRoleType(rt)} removeLabel={`Убрать ${ROLE_TYPE_LABEL[rt]}`}>
          {ROLE_TYPE_LABEL[rt]}
        </Chip>
      ))}
    </div>
  )

  return (
    <div className="filterbar">
      {isMobile ? (
        <button type="button" className="filterbar__sheet-btn" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal size={16} aria-hidden /> {t.filters.button}
          {activeCount > 0 && <span className="filterbar__badge">{activeCount}</span>}
        </button>
      ) : (
        <div className="filterbar__facets">
          <Popover label={t.filters.level} active={filters.levels.length > 0}>
            {levelBody}
          </Popover>
          <Popover label={`Зарплата · ${MARKET_SYMBOL[market]}`} active={filters.salary !== null}>
            {salaryBody}
          </Popover>
          <Popover label={t.filters.experience} active={filters.experience !== null}>
            {experienceBody}
          </Popover>
          <Popover label={t.filters.stack} active={filters.stack.length > 0}>
            {stackBody}
          </Popover>
          <Popover label={t.filters.type} active={filters.roleTypes.length > 0}>
            {typeBody}
          </Popover>
        </div>
      )}

      <div className="filterbar__status">
        <span className="filterbar__count">
          {t.filters.shown} <strong>{active ? result.total : total}</strong> {t.filters.of} {total}
        </span>
        {active && (
          <button type="button" className="filterbar__reset" onClick={clearFilters}>
            {t.filters.reset}
          </button>
        )}
      </div>

      {!isMobile && chips}

      {isMobile && (
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t.filters.button}
          footer={
            <div className="sheet__filter-footer">
              {active && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--md" onClick={clearFilters}>
                  {t.filters.reset}
                </button>
              )}
              <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={() => setSheetOpen(false)}>
                Показать {active ? result.total : total}
              </button>
            </div>
          }
        >
          <section className="sheet__group">
            <h3>{t.filters.grade}</h3>
            {levelBody}
          </section>
          <section className="sheet__group">
            <h3>{t.filters.salary}</h3>
            {salaryBody}
          </section>
          <section className="sheet__group">
            <h3>{t.filters.experience}</h3>
            {experienceBody}
          </section>
          <section className="sheet__group">
            <h3>{t.filters.roleType}</h3>
            {typeBody}
          </section>
          <section className="sheet__group">
            <h3>{t.filters.stack}</h3>
            {stackBody}
          </section>
          {chips}
        </Sheet>
      )}
    </div>
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
