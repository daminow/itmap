import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { t } from '@/i18n/ru'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { rankRoles } from '@/lib/filter'
import { formatSalary } from '@/lib/currency'
import { Search } from 'lucide-react'

/**
 * Inline search: a text input with a live typeahead dropdown of matching roles.
 * Picking a result selects the role (same effect as the old command palette),
 * but without the modal. Cmd/Ctrl+K focuses the field.
 */
export function SearchBox() {
  const index = useIndex()
  const market = useITmapStore((s) => s.market)
  const selectRole = useITmapStore((s) => s.selectRole)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const results = useMemo(() => (query.trim() ? rankRoles(index, query, 8) : []), [index, query])
  const showList = open && query.trim().length > 0

  useEffect(() => setActive(0), [query])

  // Cmd/Ctrl+K focuses the inline search (replaces the old modal shortcut).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close the dropdown when clicking outside the field.
  useEffect(() => {
    if (!showList) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showList])

  function choose(i: number) {
    const r = results[i]
    if (!r) return
    selectRole(r.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="searchbox" ref={ref}>
      <Search className="searchbox__icon" size={16} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        className="searchbox__input"
        placeholder={t.search.placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-opt-${active}` : undefined}
        aria-autocomplete="list"
        aria-label={t.search.dialogLabel}
      />
      <kbd className="searchbox__kbd" aria-hidden>
        ⌘K
      </kbd>
      {showList && (
        <ul className="searchbox__list" id={listId} role="listbox" aria-label={t.search.dialogLabel}>
          {results.length === 0 && <li className="searchbox__empty">{t.search.empty}</li>}
          {results.map((r, i) => {
            const senior = r.levels[r.levels.length - 1]
            const sal = senior.salary[market] ?? senior.salary.rub
            return (
              <li
                key={r.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`searchbox__opt ${i === active ? 'searchbox__opt--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // mousedown (not click) so the option fires before the input blurs.
                  e.preventDefault()
                  choose(i)
                }}
              >
                <span className="searchbox__name">{r.name}</span>
                <span className="searchbox__sub">
                  {r.domainName} · {formatSalary(sal, market)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
