import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
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
import { buildHierarchy, subordinateCount, toNodeInfo } from '@/lib/hierarchy'
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


export function SunburstView() {
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
  const rotateGRef = useRef<SVGGElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef(zoomIdentity) // latest pan/zoom transform (for centre math)
  const rotationRef = useRef(0) // wheel spin in degrees, applied imperatively to rotateGRef
  const rotatingRef = useRef(false)
  const prevAngleRef = useRef(0)

  // geometric pan/zoom (separate from semantic drill)
  useEffect(() => {
    const svg = svgRef.current
    const g = zoomGRef.current
    if (!svg || !g) return
    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 6])
      .on('zoom', (e) => {
        transformRef.current = e.transform
        g.setAttribute('transform', e.transform.toString())
        // keep the HTML hub label locked onto the wheel as it pans / zooms
        const c = centerRef.current
        if (c) {
          const f = (svg.clientWidth || SIZE) / SIZE
          c.style.transform = `translate(${e.transform.x * f}px, ${e.transform.y * f}px) scale(${e.transform.k})`
        }
      })
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
    rotationRef.current = 0
    rotateGRef.current?.setAttribute('transform', 'rotate(0)')
  }

  // Hold the right mouse button and drag to spin the wheel around its centre — a
  // gesture distinct from left-drag pan and wheel zoom. We rotate only the ring group
  // (around SVG origin = wheel centre), so the hub label and HTML overlay stay upright.
  // Applied imperatively to avoid re-rendering ~170 arcs on every pointer move.
  function wheelCenter() {
    const svg = svgRef.current!
    const rect = svg.getBoundingClientRect()
    const f = rect.width / SIZE
    const t = transformRef.current
    return { x: rect.left + rect.width / 2 + t.x * f, y: rect.top + rect.height / 2 + t.y * f }
  }
  function angleAt(clientX: number, clientY: number) {
    const c = wheelCenter()
    return Math.atan2(clientY - c.y, clientX - c.x)
  }
  function onRotateStart(e: ReactMouseEvent<SVGSVGElement>) {
    if (e.button !== 2 || !svgRef.current) return // right button only
    e.preventDefault()
    rotatingRef.current = true
    prevAngleRef.current = angleAt(e.clientX, e.clientY)
    const move = (ev: MouseEvent) => {
      const a = angleAt(ev.clientX, ev.clientY)
      let d = a - prevAngleRef.current
      if (d > Math.PI) d -= 2 * Math.PI
      else if (d < -Math.PI) d += 2 * Math.PI // unwrap across the ±π seam for continuous spin
      prevAngleRef.current = a
      rotationRef.current += (d * 180) / Math.PI
      rotateGRef.current?.setAttribute('transform', `rotate(${rotationRef.current})`)
    }
    const up = () => {
      rotatingRef.current = false
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
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

  const visible = useMemo(() => {
    const out: Node[] = []
    root.each((n) => {
      if (n.depth === 0) return
      if (visibleBox(boxFor(n, focus)) || (animating && visibleBox(boxFor(n, fromFocus)))) out.push(n)
    })
    return out
  }, [root, focus, fromFocus, animating])

  // Single click → show this position/department's info; double click → drill into it.
  function onArcInfo(n: Node) {
    if (n.data.role) selectRole(n.data.role.id) // a leaf role or an exec embodied by a real role
    else selectNode(toNodeInfo(n)) // a department / leadership group / CEO seat
  }
  function onArcDrill(n: Node) {
    if (n.data.kind === 'role') {
      if (n.parent) setFocusId(n.parent.data.id) // a role has no children → drill to its zone
    } else {
      setFocusId(n.data.id)
    }
  }
  function zoomOut() {
    if (focus.parent) setFocusId(focus.parent.data.id)
  }
  // The hub: at the top level it opens the company card; deeper it climbs one level.
  function onHub() {
    if (focus.depth === 0) selectNode(toNodeInfo(focus))
    else zoomOut()
  }

  // Quick preview shown in the centre while a sector is hovered.
  function hoverFor(n: Node): { title: string; sub: string } {
    const d = n.data
    if (d.kind === 'role' && d.role) {
      const last = d.role.levels[d.role.levels.length - 1]
      return { title: d.name, sub: formatSalary(last.salary[market] ?? last.salary.rub, market) }
    }
    const count = `${subordinateCount(n)} в подчинении`
    if (d.kind === 'exec' && d.full) return { title: d.name, sub: `${d.full} · ${count}` }
    return { title: d.name, sub: count }
  }

  // Split a name into wrap units: whole words, plus hyphenated sub-parts (keeping the
  // trailing hyphen). These are the smallest chunks we try NOT to break across lines.
  function tokenize(name: string): string[] {
    return name
      .split(/\s+/)
      .flatMap((w) => {
        const parts = w.split('-')
        return parts.map((p, i) => (i < parts.length - 1 ? p + '-' : p))
      })
      .filter(Boolean)
  }

  // Greedy word-wrap into lines ≤ maxChars. Breaks at spaces and existing hyphens
  // first, hard-breaks an over-long token only as a last resort — so the whole name
  // stays visible across multiple lines instead of being truncated.
  function wrapName(name: string, maxChars: number): string[] {
    if (maxChars < 2) return [name]
    const tokens = tokenize(name)
    const lines: string[] = []
    let cur = ''
    for (let tok of tokens) {
      while (tok.length > maxChars) {
        if (cur) {
          lines.push(cur)
          cur = ''
        }
        lines.push(tok.slice(0, maxChars - 1) + '-')
        tok = tok.slice(maxChars - 1)
      }
      if (!cur) cur = tok
      else {
        const joined = cur.endsWith('-') ? cur + tok : cur + ' ' + tok
        if (joined.length <= maxChars) cur = joined
        else {
          lines.push(cur)
          cur = tok
        }
      }
    }
    if (cur) lines.push(cur)
    return lines
  }

  // Largest font (within bounds) at which `name` fits a box whose reading axis is `lengthPx`
  // and whose line-stacking axis is `heightPx`. Two passes:
  //   1) WHOLE WORDS — the largest font where every word fits on a line uncut and all lines fit
  //      the height. This is what makes narrow-but-tall wedges read as clean horizontal lines
  //      ("Финансы / и / FinOps") instead of a mid-word stack ("Фин- / ансы / и / Fin- / Ops").
  //   2) Only if no whole-word font fits do we allow hard-breaks, then truncate as a last resort.
  function fitBox(lengthPx: number, heightPx: number, name: string) {
    const CW = 0.62 // avg glyph width as a fraction of font size (conservative → no overflow)
    const PAD = 8
    const FMAX = 12
    const FMIN = 4.5
    const LH = 1.15
    const avail = lengthPx - PAD
    const longest = tokenize(name).reduce((m, t) => Math.max(m, t.length), 1)
    const charsAt = (font: number) => Math.floor(avail / (font * CW))
    const linesAt = (font: number) => Math.max(1, Math.floor(heightPx / (font * LH)))

    // Pass 1 — whole words only.
    for (let font = FMAX; font >= FMIN; font -= 0.5) {
      const maxChars = charsAt(font)
      if (maxChars < 2 || maxChars < longest) continue
      const lines = wrapName(name, maxChars)
      if (lines.length <= linesAt(font)) return { font, lines }
    }
    // Pass 2 — allow hard-breaks: largest font that still fits vertically.
    for (let font = FMAX; font >= FMIN; font -= 0.5) {
      const maxChars = charsAt(font)
      if (maxChars < 2) continue
      const lines = wrapName(name, maxChars)
      if (lines.length <= linesAt(font)) return { font, lines }
    }
    // Last resort — smallest font, truncate the overflowing tail.
    const font = FMIN
    const maxChars = Math.max(2, charsAt(font))
    const maxLines = linesAt(font)
    let lines = wrapName(name, maxChars)
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines)
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…'
    }
    return { font, lines }
  }

  // Place each label HORIZONTALLY (upright, left-to-right) at the wedge centroid, sized to
  // the wedge's real horizontal × vertical room at that angle — so labels read as normal
  // landscape text, not rotated vertical columns. Thin/dense wedges (root role ring) fall
  // back to radial so 100+ tiny labels fan out instead of overlapping.
  function renderArcLabel(n: Node, b: Box) {
    const rMid = ((b.y0 + b.y1) / 2) * RING
    const arcLen = (b.x1 - b.x0) * rMid // tangential room (px)
    const ringPx = (b.y1 - b.y0) * RING // radial depth (px)
    if (arcLen < 6 || ringPx < 12) return null
    const kind = n.data.kind
    const name = n.data.name
    const mid = (b.x0 + b.x1) / 2
    const [cx, cy] = point(mid, rMid)
    const lineFactor = 1.16

    // Horizontal label when the wedge is roomy enough to read normally.
    if (arcLen >= 28 && ringPx >= 22) {
      // Horizontal/vertical room of the wedge at this angle (its tangential & radial extents
      // projected onto screen axes), shrunk for the inscribed text box.
      const cosA = Math.abs(Math.cos(mid))
      const sinA = Math.abs(Math.sin(mid))
      const wBox = (arcLen * cosA + ringPx * sinA) * 0.74
      const hBox = (arcLen * sinA + ringPx * cosA) * 0.74
      const { font, lines } = fitBox(wBox, hBox, name)
      const lh = font * lineFactor
      const y0 = -((lines.length - 1) / 2) * lh
      return (
        <text
          key={`lbl-${n.data.id}`}
          className={`sun__label sun__label--${kind}`}
          style={{ fontSize: font }}
          textAnchor="middle"
          dominantBaseline="central"
          aria-hidden
        >
          {lines.map((ln, i) => (
            <tspan key={i} x={cx} y={cy + y0 + i * lh}>
              {ln}
            </tspan>
          ))}
        </text>
      )
    }

    // Radial fallback for thin, dense wedges (e.g. the 170-role outer ring at full zoom-out).
    const { font, lines } = fitBox(ringPx, arcLen, name)
    const a = (mid * 180) / Math.PI // 0° at top, clockwise
    const rot = a < 180 ? a - 90 : a + 90 // upright on both halves
    const lh = font * lineFactor
    const y0 = -((lines.length - 1) / 2) * lh
    return (
      <text
        key={`lbl-${n.data.id}`}
        className={`sun__label sun__label--radial sun__label--${kind}`}
        style={{ fontSize: font }}
        transform={`translate(${cx} ${cy}) rotate(${rot})`}
        textAnchor="middle"
        dominantBaseline="central"
        aria-hidden
      >
        {lines.map((ln, i) => (
          <tspan key={i} x={0} y={y0 + i * lh}>
            {ln}
          </tspan>
        ))}
      </text>
    )
  }

  // Per-arc visuals that DON'T change during a zoom tween (colour, dim/selected state).
  // Stable string/object refs → React skips these DOM attrs when only the geometry animates.
  const arcStatic = useMemo(
    () =>
      visible.map((n) => {
        const isLeaf = n.data.kind === 'role'
        const embodied = n.data.role
        const dim = filtering && isLeaf && embodied != null && !result.matchedRoleIds.has(embodied.id)
        const branchDim =
          filtering &&
          !isLeaf &&
          !n.leaves().some(
            (l) => l.data.kind === 'role' && l.data.role && result.matchedRoleIds.has(l.data.role.id)
          )
        const sel = embodied != null && selectedRoleId === embodied.id
        const lighten = isLeaf ? Math.round((boxFor(n, focus).y0 % 2) * 8) : 0
        return {
          n,
          className: `sun__arc sun__arc--${n.data.kind} ${dim || branchDim ? 'sun__arc--dim' : ''} ${sel ? 'sun__arc--sel' : ''}`,
          style: { fill: `color-mix(in srgb, var(${n.data.accent}) ${100 - lighten}%, #ffffff)` },
        }
      }),
    [visible, focus, filtering, result, selectedRoleId]
  )

  // Arcs + labels are the heavy part (~200 SVG nodes; each label runs a fit/wrap loop).
  // Memoized so they rebuild only on layout/filter/selection change — never on hover, which
  // then only re-renders the small centre disc. During a zoom tween only `d` changes here.
  const arcEls = useMemo(
    () =>
      arcStatic.map(({ n, className, style }) => (
        <path
          key={n.data.id}
          d={arcGen(boxOf(n)) ?? undefined}
          style={style}
          className={className}
          onClick={() => onArcInfo(n)}
          onDoubleClick={() => onArcDrill(n)}
          onMouseEnter={() => setHover(hoverFor(n))}
          onMouseLeave={() => setHover(null)}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arcStatic, anim.t, animating, market]
  )

  const labelEls = useMemo(
    () => (animating ? null : visible.map((n) => renderArcLabel(n, boxFor(n, focus)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, focus, animating]
  )

  return (
    <div className="sun">
      <div className="sun__frame" onMouseLeave={() => setHover(null)}>
        <svg
          ref={svgRef}
          className="sun__svg"
          viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
          role="img"
          aria-hidden="true"
          onMouseDown={onRotateStart}
          onContextMenu={(e) => e.preventDefault()}
        >
          <g ref={zoomGRef}>
            <g ref={rotateGRef}>
              <g className="sun__ring">
              <circle
                r={RING}
                className="sun__hub"
                onClick={onHub}
                onMouseEnter={() => setHover(null)}
              />
              {arcEls}
              {/* per-arc labels: tangential on wide arcs, radial on narrow/deep ones. Hidden mid-zoom. */}
              {labelEls}
              </g>
            </g>
          </g>
        </svg>

        <div className="sun__center" ref={centerRef}>
          <div className="sun__disc">
            {hover ? (
              <div className="sun__center-stack">
                <span className="sun__center-name">{hover.title}</span>
                <span className="sun__center-sub">{hover.sub}</span>
              </div>
            ) : focus.depth === 0 ? (
              filtering ? (
                <div className="sun__center-stack">
                  <span className="sun__center-big">{result.total}</span>
                  <span className="sun__center-sub">подходят</span>
                </div>
              ) : (
                <div className="sun__center-stack">
                  <span className="sun__center-kicker">оргструктура</span>
                  <span className="sun__center-name">{focus.data.name}</span>
                  <span className="sun__center-sub">
                    {focus.data.full} · {subordinateCount(focus)} в подчинении
                  </span>
                </div>
              )
            ) : (
              <div className="sun__up">
                <span className="sun__center-kicker">{focus.data.full ?? ''}</span>
                <span className="sun__center-name">{focus.data.name}</span>
                <span className="sun__center-sub">← наверх</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map controls — anchored to the stage corner (not the wheel's square frame),
          so they stay in a stable, conventional spot. Zoom in/out joined; reset below. */}
      <div className="sun__zoom">
        <div className="sun__zoom-pair">
          <button type="button" aria-label="Приблизить" onClick={() => zoomBy(1.4)}>
            <Plus size={16} aria-hidden />
          </button>
          <button type="button" aria-label="Отдалить" onClick={() => zoomBy(1 / 1.4)}>
            <Minus size={16} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          className="sun__zoom-reset"
          aria-label="Сбросить вид"
          onClick={resetZoom}
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      </div>
    </div>
  )
}
