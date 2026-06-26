import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@/i18n/ru'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { rankRoles } from '@/lib/filter'
import { formatSalary } from '@/lib/currency'
import { Search } from 'lucide-react'

export function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const index = useIndex()
  const market = useITmapStore((s) => s.market)
  const selectRole = useITmapStore((s) => s.selectRole)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => rankRoles(index, query, 12), [index, query])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    setQuery('')
    setActive(0)
    const id = setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      clearTimeout(id)
      previouslyFocused?.focus?.()
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  function choose(i: number) {
    const r = results[i]
    if (r) {
      selectRole(r.id)
      onClose()
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label={t.search.dialogLabel}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk__head">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className="cmdk__input"
            placeholder={t.search.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
            aria-controls="cmdk-list"
            role="combobox"
            aria-expanded={results.length > 0}
          />
        </div>
        <ul className="cmdk__list" id="cmdk-list" role="listbox">
          {results.length === 0 && query && <li className="cmdk__empty">{t.search.empty}</li>}
          {results.map((r, i) => {
            const senior = r.levels[r.levels.length - 1]
            const sal = senior.salary[market] ?? senior.salary.rub
            return (
              <li
                key={r.id}
                id={`cmdk-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`cmdk__opt ${i === active ? 'cmdk__opt--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <span className="cmdk__name">{r.name}</span>
                <span className="cmdk__sub">
                  {r.domainName} · {formatSalary(sal, market)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
