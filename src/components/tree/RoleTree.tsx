import { useMemo, useRef, useState } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { useFilterResult } from '@/hooks/useFilterResult'
import { filtersAreEmpty } from '@/types/filters'
import type { DomainId, RoleId } from '@/types/taxonomy'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatSalary, MARKET_SYMBOL } from '@/lib/currency'
import { getFilterReason, REASON_TEXT } from '@/lib/filter'
import { normalize } from '@/lib/normalize'

type VisNode =
  | { kind: 'domain'; id: DomainId; level: 1 }
  | { kind: 'role'; id: RoleId; domainId: DomainId; level: 2 }

/** The single accessible source of truth: a real DOM tree. Used as the left rail
 *  (desktop) and the list view (mobile). The SVG map mirrors this state. */
export function RoleTree({ idPrefix = 'tree' }: { idPrefix?: string }) {
  const index = useIndex()
  const zoom = useITmapStore((s) => s.zoom)
  const selectedRoleId = useITmapStore((s) => s.selectedRoleId)
  const selectRole = useITmapStore((s) => s.selectRole)
  const drillTo = useITmapStore((s) => s.drillTo)
  const filters = useITmapStore((s) => s.filters)
  const market = useITmapStore((s) => s.market)
  const result = useFilterResult()
  const filtering = !filtersAreEmpty(filters)
  const ctx = useMemo(
    () => ({ filters: { ...filters, search: normalize(filters.search) }, market }),
    [filters, market]
  )

  const [expanded, setExpanded] = useState<Set<DomainId>>(
    () => new Set(zoom.kind === 'domain' ? [zoom.id] : [])
  )
  const [focusIdx, setFocusIdx] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  // Flattened visible nodes for roving-tabindex arrow navigation.
  const visible = useMemo<VisNode[]>(() => {
    const out: VisNode[] = []
    for (const d of index.domains) {
      out.push({ kind: 'domain', id: d.id, level: 1 })
      if (expanded.has(d.id)) {
        for (const r of d.roles) out.push({ kind: 'role', id: r.id, domainId: d.id, level: 2 })
      }
    }
    return out
  }, [index.domains, expanded])

  function toggle(id: DomainId) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function focusAt(i: number) {
    const clamped = Math.max(0, Math.min(i, visible.length - 1))
    setFocusIdx(clamped)
    const el = listRef.current?.querySelector<HTMLElement>(`[data-vi="${clamped}"]`)
    el?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, node: VisNode, i: number) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusAt(i + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusAt(i - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(visible.length - 1)
        break
      case 'ArrowRight':
        if (node.kind === 'domain' && !expanded.has(node.id)) {
          e.preventDefault()
          toggle(node.id)
        }
        break
      case 'ArrowLeft':
        if (node.kind === 'domain' && expanded.has(node.id)) {
          e.preventDefault()
          toggle(node.id)
        } else if (node.kind === 'role') {
          e.preventDefault()
          const di = visible.findIndex((v) => v.kind === 'domain' && v.id === node.domainId)
          if (di >= 0) focusAt(di)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        activate(node)
        break
    }
  }

  function activate(node: VisNode) {
    if (node.kind === 'domain') {
      toggle(node.id)
      drillTo({ kind: 'domain', id: node.id })
    } else {
      selectRole(node.id)
    }
  }

  let vi = -1
  return (
    <ul className="tree" role="tree" aria-label="Дерево IT-специальностей" ref={listRef}>
      {index.domains.map((d, di) => {
        const isOpen = expanded.has(d.id)
        const domainDim = filtering && !result.matchedDomainIds.has(d.id)
        vi += 1
        const domainVi = vi
        const matchedCount = d.roles.filter((r) => result.matchedRoleIds.has(r.id)).length
        return (
          <li
            key={d.id}
            role="treeitem"
            aria-expanded={isOpen}
            aria-level={1}
            aria-setsize={index.domains.length}
            aria-posinset={di + 1}
            className={`tree__domain ${domainDim ? 'tree__item--dim' : ''}`}
          >
            <div
              className="tree__row tree__row--domain"
              data-vi={domainVi}
              tabIndex={focusIdx === domainVi ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, { kind: 'domain', id: d.id, level: 1 }, domainVi)}
              onClick={() => activate({ kind: 'domain', id: d.id, level: 1 })}
              onFocus={() => setFocusIdx(domainVi)}
            >
              <span className="tree__chevron" aria-hidden>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </span>
              <span className="tree__dot" style={{ background: `var(${d.accent})` }} aria-hidden />
              <span className="tree__name">{d.name}</span>
              <span className="tree__count">{filtering ? `${matchedCount}/${d.roles.length}` : d.roles.length}</span>
            </div>
            {isOpen && (
              <ul role="group">
                {d.roles.map((r, ri) => {
                  vi += 1
                  const roleVi = vi
                  const roleDim = filtering && !result.matchedRoleIds.has(r.id)
                  const selected = selectedRoleId === r.id
                  const senior = r.levels[r.levels.length - 1]
                  const sal = senior.salary[market] ?? senior.salary.rub
                  const ir = index.roleById.get(r.id)
                  const reason = roleDim && ir ? REASON_TEXT[getFilterReason(ir, ctx)] : undefined
                  return (
                    <li
                      key={r.id}
                      role="treeitem"
                      aria-level={2}
                      aria-setsize={d.roles.length}
                      aria-posinset={ri + 1}
                      aria-selected={selected}
                      aria-disabled={roleDim || undefined}
                      id={`${idPrefix}-${r.id}`}
                      className={`tree__role ${roleDim ? 'tree__item--dim' : ''} ${selected ? 'tree__role--selected' : ''}`}
                    >
                      <div
                        className="tree__row tree__row--role"
                        data-vi={roleVi}
                        tabIndex={focusIdx === roleVi ? 0 : -1}
                        title={reason}
                        onKeyDown={(e) => onKeyDown(e, { kind: 'role', id: r.id, domainId: d.id, level: 2 }, roleVi)}
                        onClick={() => selectRole(r.id)}
                        onFocus={() => setFocusIdx(roleVi)}
                      >
                        <span className="tree__name">{r.name}</span>
                        <span className="tree__salary">
                          {formatSalary(sal, market).replace(/\s/g, ' ')}
                          {senior.salary[market] ? '' : ` ≈${MARKET_SYMBOL[market]}`}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
