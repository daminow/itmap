import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Level, Market, Range, RoleId, RoleType } from '@/types/taxonomy'
import type { FiltersState } from '@/types/filters'
import { EMPTY_FILTERS } from '@/types/filters'
import type { NodeInfo, ViewMode, Zoom } from '@/types/ui'
import type { ShareableState } from '@/lib/urlState'
import { getIndex } from '@/data/index'

interface ITmapState {
  // serializable slice (URL-synced)
  filters: FiltersState
  market: Market
  view: ViewMode
  zoom: Zoom
  selectedRoleId: RoleId | null

  // transient
  /** Left rail visibility: docked column (desktop) / off-canvas drawer (mobile). */
  railOpen: boolean
  /** A non-role org node (CEO / exec / group / department) selected for its info card. */
  selectedNode: NodeInfo | null
  hoveredRoleId: RoleId | null
  returnFocusId: RoleId | null
  /** Last toast message (e.g. salary reset on market change). */
  toast: string | null

  // actions
  setSearch: (q: string) => void
  setMarket: (m: Market) => void
  setSalary: (r: Range | null) => void
  setExperience: (r: Range | null) => void
  toggleLevel: (l: Level) => void
  toggleRoleType: (t: RoleType) => void
  toggleStack: (s: string) => void
  patchFilters: (partial: Partial<FiltersState>) => void
  clearFilters: () => void
  setView: (v: ViewMode) => void
  drillTo: (z: Zoom) => void
  selectRole: (id: RoleId | null) => void
  selectNode: (n: NodeInfo | null) => void
  setRailOpen: (v: boolean) => void
  toggleRail: () => void
  hoverRole: (id: RoleId | null) => void
  clearToast: () => void
  hydrate: (partial: Partial<ShareableState>) => void
}

function toggle<T>(arr: T[], v: T): T[] {
  const i = arr.indexOf(v)
  if (i === -1) return [...arr, v]
  return arr.filter((x) => x !== v)
}

export const useITmapStore = create<ITmapState>()(
  subscribeWithSelector(
    immer((set) => ({
      filters: EMPTY_FILTERS,
      market: 'rub',
      view: 'sunburst',
      zoom: { kind: 'overview' },
      selectedRoleId: null,
      // Docked & open on wide screens; collapsed (drawer) on narrow ones.
      railOpen: typeof window !== 'undefined' ? window.innerWidth >= 1100 : true,
      selectedNode: null,
      hoveredRoleId: null,
      returnFocusId: null,
      toast: null,

      setSearch: (q) =>
        set((s) => {
          s.filters.search = q
        }),

      // Market = the market for both display and the salary filter. Flipping it
      // CLEARS the salary filter (no dishonest FX carry-over of a ruble number).
      setMarket: (m) =>
        set((s) => {
          if (s.market === m) return
          s.market = m
          if (s.filters.salary !== null) {
            s.filters.salary = null
            s.toast = `Рынок изменён. Фильтр зарплаты сброшен.`
          }
        }),

      setSalary: (r) =>
        set((s) => {
          s.filters.salary = r
        }),
      setExperience: (r) =>
        set((s) => {
          s.filters.experience = r
        }),
      toggleLevel: (l) =>
        set((s) => {
          s.filters.levels = toggle(s.filters.levels, l)
        }),
      toggleRoleType: (t) =>
        set((s) => {
          s.filters.roleTypes = toggle(s.filters.roleTypes, t)
        }),
      toggleStack: (st) =>
        set((s) => {
          s.filters.stack = toggle(s.filters.stack, st)
        }),
      patchFilters: (partial) =>
        set((s) => {
          Object.assign(s.filters, partial)
        }),
      clearFilters: () =>
        set((s) => {
          s.filters = { ...EMPTY_FILTERS }
        }),

      setView: (v) =>
        set((s) => {
          s.view = v
        }),
      drillTo: (z) =>
        set((s) => {
          s.zoom = z
        }),

      // Selecting a role auto-zooms to its domain so a shared link lands readable.
      selectRole: (id) =>
        set((s) => {
          s.returnFocusId = s.selectedRoleId
          s.selectedRoleId = id
          s.selectedNode = null // a role card supersedes any node summary
          if (id) {
            const role = getIndex().roleById.get(id)
            if (role) s.zoom = { kind: 'domain', id: role.domainId }
          }
        }),
      // A node summary and a role card are mutually exclusive in the panel.
      selectNode: (n) =>
        set((s) => {
          s.selectedNode = n
          if (n) s.selectedRoleId = null
        }),
      setRailOpen: (v) =>
        set((s) => {
          s.railOpen = v
        }),
      toggleRail: () =>
        set((s) => {
          s.railOpen = !s.railOpen
        }),
      hoverRole: (id) =>
        set((s) => {
          s.hoveredRoleId = id
        }),
      clearToast: () =>
        set((s) => {
          s.toast = null
        }),

      hydrate: (partial) =>
        set((s) => {
          if (partial.filters) s.filters = partial.filters
          if (partial.market) s.market = partial.market
          if (partial.view) s.view = partial.view
          if (partial.zoom) s.zoom = partial.zoom
          if (partial.selectedRoleId !== undefined) s.selectedRoleId = partial.selectedRoleId
          // If a role is selected but zoom is overview, derive the domain.
          if (s.selectedRoleId && s.zoom.kind === 'overview') {
            const role = getIndex().roleById.get(s.selectedRoleId)
            if (role) s.zoom = { kind: 'domain', id: role.domainId }
          }
        }),
    }))
  )
)
