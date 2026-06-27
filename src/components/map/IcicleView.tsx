import { useEffect, useMemo, useState } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { useFilterResult } from '@/hooks/useFilterResult'
import { filtersAreEmpty } from '@/types/filters'
import { buildHierarchy, subordinateCount, toNodeInfo } from '@/lib/hierarchy'
import type { HData } from '@/lib/hierarchy'
import type { HierarchyNode } from 'd3-hierarchy'
import { formatSalary } from '@/lib/currency'
import { getFilterReason, REASON_TEXT } from '@/lib/filter'
import { normalize } from '@/lib/normalize'
import { ChevronLeft } from 'lucide-react'

type Node = HierarchyNode<HData>
const ROW_H = 38
const MIN_H = 520

export function IcicleView() {
  const index = useIndex()
  const selectRole = useITmapStore((s) => s.selectRole)
  const selectNode = useITmapStore((s) => s.selectNode)
  const selectedRoleId = useITmapStore((s) => s.selectedRoleId)
  const market = useITmapStore((s) => s.market)
  const filters = useITmapStore((s) => s.filters)
  const result = useFilterResult()
  const filtering = !filtersAreEmpty(filters)

  const root = useMemo(() => {
    const r = buildHierarchy(index)
    r.sort?.((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return r
  }, [index])

  const byId = useMemo(() => {
    const m = new Map<string, Node>()
    root.each((n) => m.set(n.data.id, n))
    return m
  }, [root])

  const ctx = useMemo(
    () => ({ filters: { ...filters, search: normalize(filters.search) }, market }),
    [filters, market]
  )

  const [focusId, setFocusId] = useState('root')
  const focus = byId.get(focusId) ?? root

  useEffect(() => {
    if (!selectedRoleId) return
    const n = byId.get(selectedRoleId)
    if (n?.parent) setFocusId(n.parent.data.id)
  }, [selectedRoleId, byId])

  const maxDepth = focus.height + focus.depth
  const cols = Math.max(1, maxDepth - focus.depth)
  const colW = 100 / cols
  const leaves = focus.leaves().length
  const totalH = Math.max(MIN_H, leaves * ROW_H)

  // leaf index range gives vertical extent; precompute leaf order
  const leafOrder = useMemo(() => {
    const order = new Map<string, number>()
    let i = 0
    root.each((n) => {
      if (!n.children) order.set(n.data.id, i++)
    })
    return order
  }, [root])

  const focusLeaves = focus.leaves()
  const firstLeaf = leafOrder.get(focusLeaves[0].data.id) ?? 0
  const lastLeaf = (leafOrder.get(focusLeaves[focusLeaves.length - 1].data.id) ?? 0) + 1
  const focusSpan = lastLeaf - firstLeaf || 1

  const cells: Node[] = []
  focus.each((n) => {
    if (n.depth <= focus.depth) return
    cells.push(n)
  })

  function yOf(n: Node) {
    const f = leafOrder.get(n.leaves()[0].data.id) ?? 0
    const l = (leafOrder.get(n.leaves()[n.leaves().length - 1].data.id) ?? 0) + 1
    return { top: ((f - firstLeaf) / focusSpan) * totalH, height: ((l - f) / focusSpan) * totalH }
  }

  // Single click → show info; double click → drill into the zone.
  function onCellInfo(n: Node) {
    if (n.data.role) selectRole(n.data.role.id)
    else selectNode(toNodeInfo(n))
  }
  function onCellDrill(n: Node) {
    if (n.data.kind === 'role') {
      if (n.parent) setFocusId(n.parent.data.id)
    } else setFocusId(n.data.id)
  }

  const crumbs: Node[] = []
  let c: Node | null = focus
  while (c) {
    crumbs.unshift(c)
    c = c.parent
  }

  return (
    <div className="icicle">
      <div className="icicle__bar">
        {focus.depth > 0 && (
          <button type="button" className="icicle__back" onClick={() => setFocusId(focus.parent!.data.id)}>
            <ChevronLeft size={15} aria-hidden /> назад
          </button>
        )}
        <nav className="icicle__crumbs" aria-label="Уровень">
          {crumbs.map((n, i) => (
            <span key={n.data.id}>
              {i > 0 && <span className="icicle__sep">/</span>}
              <button
                type="button"
                className="icicle__crumb"
                disabled={n === focus}
                onClick={() => setFocusId(n.data.id)}
              >
                {n.depth === 0 ? 'CEO' : n.data.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div className="icicle__scroll">
        <div className="icicle__canvas" style={{ height: totalH }}>
          {cells.map((n) => {
            const { top, height } = yOf(n)
            const cellH = Math.max(0, height - 3)
            const col = n.depth - focus.depth - 1
            const isLeaf = n.data.kind === 'role'
            const embodied = n.data.role // a leaf role OR a real role embodying an exec seat
            const dim =
              filtering &&
              (isLeaf
                ? embodied == null || !result.matchedRoleIds.has(embodied.id)
                : !n.leaves().some((l) => l.data.kind === 'role' && l.data.role && result.matchedRoleIds.has(l.data.role.id)))
            const sel = embodied != null && selectedRoleId === embodied.id
            const senior = isLeaf ? embodied?.levels[embodied.levels.length - 1] : undefined
            const sal = senior ? (senior.salary[market] ?? senior.salary.rub) : null
            const reason = isLeaf && embodied && dim ? REASON_TEXT[getFilterReason(embodied, ctx)] : undefined
            const short = cellH < 60 // tight cells clamp to one line so text never escapes the tile
            return (
              <button
                type="button"
                key={n.data.id}
                className={`icicle__cell icicle__cell--${n.data.kind} ${short ? 'icicle__cell--short' : ''} ${dim ? 'icicle__cell--dim' : ''} ${sel ? 'icicle__cell--sel' : ''}`}
                style={{
                  left: `${col * colW}%`,
                  width: `calc(${colW}% - 4px)`,
                  top,
                  height: cellH,
                  background: `color-mix(in srgb, var(${n.data.accent}) ${isLeaf ? 22 : 90}%, var(--surface))`,
                  borderInlineStart: `3px solid var(${n.data.accent})`,
                }}
                onClick={() => onCellInfo(n)}
                onDoubleClick={() => onCellDrill(n)}
                title={reason ?? n.data.name}
                aria-label={reason ? `${n.data.name} — ${reason}` : undefined}
              >
                <span className="icicle__label">
                  <span className="icicle__name">{n.data.name}</span>
                  {cellH >= 44 && (
                    <span className="icicle__meta">
                      {isLeaf ? (sal ? formatSalary(sal, market) : '') : `${subordinateCount(n)} в подчинении`}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
