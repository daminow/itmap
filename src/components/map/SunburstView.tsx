import { useEffect, useMemo, useRef, useState } from 'react'
import { partition as d3partition } from 'd3-hierarchy'
import type { HierarchyRectangularNode } from 'd3-hierarchy'
import { arc as d3arc } from 'd3-shape'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import type { ZoomBehavior } from 'd3-zoom'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { useFilterResult } from '@/hooks/useFilterResult'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { filtersAreEmpty } from '@/types/filters'
import { buildHierarchy } from '@/lib/hierarchy'
import type { HData } from '@/lib/hierarchy'
import { formatSalary } from '@/lib/currency'
import { Minus, Plus, RotateCcw } from 'lucide-react'

const SIZE = 820
const RING = 92 // pixels per ring
const RINGS_VISIBLE = 3

type Node = HierarchyRectangularNode<HData>
interface Box {
  x0: number
  x1: number
  y0: number
  y1: number
}

const arcGen = d3arc<Box>()
  .startAngle((d) => d.x0)
  .endAngle((d) => d.x1)
  .padAngle(0.004)
  .padRadius(RING * 1.5)
  .innerRadius((d) => d.y0 * RING)
  .outerRadius((d) => Math.max(d.y0 * RING, d.y1 * RING - 1.5))

function point(angle: number, r: number): [number, number] {
  return [Math.sin(angle) * r, -Math.cos(angle) * r]
}

/** SVG path along radius r from angle x0→x1; reversed on the bottom half so text stays upright. */
function curvedTextPath(x0: number, x1: number, r: number): string {
  const mid = (x0 + x1) / 2
  const bottom = mid > Math.PI / 2 && mid < (3 * Math.PI) / 2
  const a0 = bottom ? x1 : x0
  const a1 = bottom ? x0 : x1
  const [sx, sy] = point(a0, r)
  const [ex, ey] = point(a1, r)
  const large = Math.abs(x1 - x0) > Math.PI ? 1 : 0
  const sweep = bottom ? 0 : 1
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`
}

export function SunburstView() {
  const index = useIndex()
  const selectRole = useITmapStore((s) => s.selectRole)
  const selectedRoleId = useITmapStore((s) => s.selectedRoleId)
  const market = useITmapStore((s) => s.market)
  const filters = useITmapStore((s) => s.filters)
  const result = useFilterResult()
  const filtering = !filtersAreEmpty(filters)

  const root = useMemo(() => {
    const r = buildHierarchy(index)
    r.sort?.((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return d3partition<HData>().size([2 * Math.PI, r.height + 1])(r)
  }, [index])

  const nodeById = useMemo(() => {
    const m = new Map<string, Node>()
    root.each((n) => m.set(n.data.id, n))
    return m
  }, [root])

  const [focusId, setFocusId] = useState('root')
  const focus = nodeById.get(focusId) ?? root
  const [hover, setHover] = useState<{ title: string; sub: string } | null>(null)

  // Animated zoom: tween every arc from the previous focus's layout to the new one.
  const reduced = useReducedMotion()
  const prevIdRef = useRef(focusId)
  const [anim, setAnim] = useState<{ from: string; t: number }>({ from: focusId, t: 1 })
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prevIdRef.current === focusId) return
    const from = prevIdRef.current
    prevIdRef.current = focusId
    if (reduced) {
      setAnim({ from: focusId, t: 1 })
      return
    }
    setAnim({ from, t: 0 })
    const startTime = performance.now()
    const dur = 520
    const step = (now: number) => {
      const raw = Math.min(1, (now - startTime) / dur)
      const eased = raw < 0.5 ? 4 * raw ** 3 : 1 - Math.pow(-2 * raw + 2, 3) / 2
      setAnim({ from, t: raw >= 1 ? 1 : eased })
      if (raw < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [focusId, reduced])

  // Selecting a role (rail/search) focuses its domain so it is visible on the wheel.
  useEffect(() => {
    if (!selectedRoleId) return
    const n = nodeById.get(selectedRoleId)
    if (n?.parent) setFocusId(n.parent.data.id)
  }, [selectedRoleId, nodeById])

  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGRef = useRef<SVGGElement>(null)
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  // geometric pan/zoom (separate from semantic drill)
  useEffect(() => {
    const svg = svgRef.current
    const g = zoomGRef.current
    if (!svg || !g) return
    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 6])
      .on('zoom', (e) => g.setAttribute('transform', e.transform.toString()))
    zoomBehavior.current = zb
    select(svg).call(zb).on('dblclick.zoom', null)
    return () => {
      select(svg).on('.zoom', null)
    }
  }, [])

  function zoomBy(k: number) {
    if (svgRef.current && zoomBehavior.current)
      zoomBehavior.current.scaleBy(select(svgRef.current), k)
  }
  function resetZoom() {
    if (svgRef.current && zoomBehavior.current)
      zoomBehavior.current.transform(select(svgRef.current), zoomIdentity)
  }

  // box for a node relative to a given focus node
  function boxFor(n: Node, f: Node): Box {
    const span = f.x1 - f.x0 || 1
    return {
      x0: Math.max(0, Math.min(1, (n.x0 - f.x0) / span)) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (n.x1 - f.x0) / span)) * 2 * Math.PI,
      y0: Math.max(0, n.depth - f.depth),
      y1: Math.max(0, n.depth - f.depth + 1),
    }
  }
  const fromFocus = nodeById.get(anim.from) ?? root
  const animating = anim.t < 1

  const visibleBox = (b: Box) => b.y0 >= 1 && b.y0 <= RINGS_VISIBLE && b.x1 - b.x0 > 0.0015

  // current (possibly interpolated) box for a node
  function boxOf(n: Node): Box {
    const to = boxFor(n, focus)
    if (!animating) return to
    const a = boxFor(n, fromFocus)
    const t = anim.t
    return {
      x0: a.x0 + (to.x0 - a.x0) * t,
      x1: a.x1 + (to.x1 - a.x1) * t,
      y0: a.y0 + (to.y0 - a.y0) * t,
      y1: a.y1 + (to.y1 - a.y1) * t,
    }
  }

  const visible: Node[] = []
  root.each((n) => {
    if (n.depth === 0) return
    if (visibleBox(boxFor(n, focus)) || (animating && visibleBox(boxFor(n, fromFocus)))) visible.push(n)
  })

  function onArcClick(n: Node) {
    if (n.data.kind === 'role') {
      if (n.data.role) selectRole(n.data.role.id)
    } else {
      setFocusId(n.data.id)
    }
  }
  function zoomOut() {
    if (focus.parent) setFocusId(focus.parent.data.id)
  }

  const hubLabel = focus.depth === 0 ? 'IT-сфера' : focus.data.name

  return (
    <div className="sun">
      <div className="sun__frame" onMouseLeave={() => setHover(null)}>
        <svg
          ref={svgRef}
          className="sun__svg"
          viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
          role="img"
          aria-hidden="true"
        >
          <g ref={zoomGRef}>
            <g className="sun__ring">
              <circle r={RING} className="sun__hub" onClick={zoomOut} />
              {visible.map((n) => {
                const b = boxOf(n)
                const role = n.data.role
                const dim = filtering && role != null && !result.matchedRoleIds.has(role.id)
                const branchDim =
                  filtering && role == null && !n.leaves().some((l) => l.data.role && result.matchedRoleIds.has(l.data.role.id))
                const sel = role != null && selectedRoleId === role.id
                const lighten = n.data.kind === 'role' ? Math.round((b.y0 % 2) * 8) : 0
                return (
                  <path
                    key={n.data.id}
                    d={arcGen(b) ?? undefined}
                    style={{ fill: `color-mix(in srgb, var(${n.data.accent}) ${100 - lighten}%, #ffffff)` }}
                    className={`sun__arc sun__arc--${n.data.kind} ${dim || branchDim ? 'sun__arc--dim' : ''} ${sel ? 'sun__arc--sel' : ''}`}
                    onClick={() => onArcClick(n)}
                    onMouseEnter={() =>
                      setHover({
                        title: n.data.name,
                        sub:
                          n.data.kind === 'role' && role
                            ? formatSalary(
                                role.levels[role.levels.length - 1].salary[market] ??
                                  role.levels[role.levels.length - 1].salary.rub,
                                market
                              )
                            : `${n.value ?? 0} ${n.data.kind === 'family' ? 'ролей в семействе' : 'ролей'}`,
                      })
                    }
                  />
                )
              })}
              {/* curved labels: families always; domains when wide enough. Hidden mid-zoom. */}
              {!animating &&
                visible.map((n) => {
                  if (n.data.kind === 'role') return null
                const b = boxOf(n)
                const r = ((b.y0 + b.y1) / 2) * RING
                const arcLen = (b.x1 - b.x0) * r
                if (arcLen < 44) return null
                const id = `lbl-${n.data.id}`
                const max = Math.floor(arcLen / 7.4)
                const txt = n.data.name.length > max ? n.data.name.slice(0, max - 1).trimEnd() + '…' : n.data.name
                return (
                  <g key={id} className="sun__label-g" aria-hidden>
                    <path id={id} d={curvedTextPath(b.x0, b.x1, r)} fill="none" />
                    <text className={`sun__label sun__label--${n.data.kind}`}>
                      <textPath href={`#${id}`} startOffset="50%">
                        {txt}
                      </textPath>
                    </text>
                  </g>
                )
              })}
            </g>
          </g>
        </svg>

        <div className="sun__center">
          {hover ? (
            <>
              <span className="sun__center-name">{hover.title}</span>
              <span className="sun__center-sub">{hover.sub}</span>
            </>
          ) : focus.depth === 0 ? (
            <>
              <span className="sun__center-kicker">карта IT</span>
              <span className="sun__center-big">{filtering ? result.total : index.flatRoles.length}</span>
              <span className="sun__center-sub">{filtering ? 'подходят' : 'специальностей'}</span>
            </>
          ) : (
            <button type="button" className="sun__up" onClick={zoomOut}>
              <span className="sun__center-name">{hubLabel}</span>
              <span className="sun__center-sub">← на уровень выше</span>
            </button>
          )}
        </div>

        <div className="sun__zoom">
          <button type="button" aria-label="Приблизить" onClick={() => zoomBy(1.4)}>
            <Plus size={16} aria-hidden />
          </button>
          <button type="button" aria-label="Отдалить" onClick={() => zoomBy(1 / 1.4)}>
            <Minus size={16} aria-hidden />
          </button>
          <button type="button" aria-label="Сбросить масштаб" onClick={resetZoom}>
            <RotateCcw size={15} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
