# ITmap — Architecture

Live demo: <https://itmap.daminov.net> · Repository: <https://github.com/daminow/itmap>

## Overview

ITmap is a static, client-only single-page application. There is **no backend**: all content is
a typed, in-repo dataset ([src/data/](../src/data/)) compiled straight into the bundle. The app
loads the dataset, builds lookup indexes and an org-chart hierarchy once, holds UI state in a
Zustand store, runs a pure filter engine over the roles, and renders three synchronized views
(sunburst, icicle, DOM tree) plus a detail panel. All shareable state lives in the URL.

## Directory map

All paths are under [src/](../src/).

| Directory | Role |
| --- | --- |
| [src/types/](../src/types/) | Type definitions. [taxonomy.ts](../src/types/taxonomy.ts) is the authored data model (Domain/Role/LevelBand + enums); [runtime.ts](../src/types/runtime.ts) adds derived index types; [filters.ts](../src/types/filters.ts) is the filter state; [ui.ts](../src/types/ui.ts) holds view/zoom/node types. |
| [src/data/](../src/data/) | The dataset and its build pipeline. [domains/](../src/data/domains/) has one file per domain; [defineDomain.ts](../src/data/defineDomain.ts) provides the authoring helpers; [registry.ts](../src/data/registry.ts) lists all domains; [index.ts](../src/data/index.ts) builds the runtime index; [schema.ts](../src/data/schema.ts) is the dev-only zod validation. |
| [src/store/](../src/store/) | The single Zustand store, [useITmapStore.ts](../src/store/useITmapStore.ts) — serializable slice (URL-synced) plus transient UI state. |
| [src/lib/](../src/lib/) | Pure logic. [filter.ts](../src/lib/filter.ts) is the filter engine; [hierarchy.ts](../src/lib/hierarchy.ts) builds the org chart; [urlState.ts](../src/lib/urlState.ts) is the hardened URL codec; [currency.ts](../src/lib/currency.ts) handles money and display FX; [normalize.ts](../src/lib/normalize.ts) and [labels.ts](../src/lib/labels.ts) are helpers. |
| [src/components/](../src/components/) | React UI. [map/](../src/components/map/) holds the SVG views, [tree/](../src/components/tree/) the DOM tree, [panel/](../src/components/panel/) the detail panel, [filters/](../src/components/filters/) the facet controls, [ui/](../src/components/ui/) shared primitives, [onboarding/](../src/components/onboarding/) first-run help. |
| [src/hooks/](../src/hooks/) | React hooks: [useUrlSync.ts](../src/hooks/useUrlSync.ts), [useIndex.ts](../src/hooks/useIndex.ts), [useFilterResult.ts](../src/hooks/useFilterResult.ts), [useDebouncedValue.ts](../src/hooks/useDebouncedValue.ts), [useReducedMotion.ts](../src/hooks/useReducedMotion.ts). |
| [src/i18n/](../src/i18n/) | UI strings. Currently a single Russian dictionary, [ru.ts](../src/i18n/ru.ts). |
| [src/theme/](../src/theme/) | Design tokens and global styles: [tokens.css](../src/theme/tokens.css) (colors including `--accent-*` and `--clevel-*` custom properties), [global.css](../src/theme/global.css), [fonts.css](../src/theme/fonts.css). |

## Data flow

```
src/data/domains/*.ts        authored domains (defineDomain / band)
        │
        ▼
src/data/registry.ts         collects all domains into one array
        │
        ▼
src/data/index.ts            buildIndex(): symmetrize adjacency, build
        │                    roleById / domainById / flatRoles /
        │                    stackTokens / salaryBounds (cached)
        ▼
src/store/useITmapStore.ts   Zustand state: filters, market, view, zoom,
        │                    selection + transient UI flags
        ▼
src/lib/filter.ts            pure runFilters(index, {filters, market})
        │                    → matched role/domain id sets
        ▼
views + panel                SunburstView / IcicleView / RoleTree read the
                             index + filter result; DetailPanel shows the
                             selected role or org node
```

The index is built lazily and cached in [src/data/index.ts](../src/data/index.ts): the first
call to `getIndex()` runs `buildIndex()` over the registry and memoizes the result. In dev mode
(`import.meta.env.DEV`) it also dynamically imports [schema.ts](../src/data/schema.ts) and runs
`validateTaxonomy`, so validation never enters the production bundle.

**URL sync** is handled by [useUrlSync.ts](../src/hooks/useUrlSync.ts) together with
[urlState.ts](../src/lib/urlState.ts): on mount it decodes `window.location.search` into a
partial state and hydrates the store; on any change to the serializable slice it re-encodes and
writes back with `history.pushState` for navigation changes (zoom / selection) and
`history.replaceState` for filter tweaks.

## The org-chart hierarchy

[src/lib/hierarchy.ts](../src/lib/hierarchy.ts) turns the flat list of domains into the tree
consumed by all three views. The shape is **CEO → C-suite → (leadership ladder | department) →
role**:

- `EXECS` defines the seven C-suite seats (CTO, CDO, CPO, CISO, CIO, CHRO, CFO), each with an
  acronym, a full Russian title, an accent token, and optionally a `roleId` of the real role
  that embodies the seat (so clicking it opens that role's card).
- `DOMAIN_CLEVEL` maps each domain id to the executive that owns it. Domains without a mapping
  default to the CTO. This C-level grouping — not the older `domain.family` string — is the
  visual grouping used by the wheel.
- The `management` domain is special: instead of a department it becomes the engineering
  leadership ladders under the CTO (`MGMT_GROUPS`).
- Within each department, roles are ordered by seniority via `roleRank`, and any role that
  embodies a C-suite seat is pulled out and shown one ring up instead of inside its department.

`buildHierarchyData` produces an `HData` tree; `buildHierarchy` wraps it in a d3 hierarchy whose
value counts subordinate roles. `subordinateCount` and `toNodeInfo` compute the "в подчинении"
counts and the panel summaries for non-role nodes.

## Views and rendering

Three view modes (`VIEW_MODES = ['sunburst', 'icicle', 'list']` in
[ui.ts](../src/types/ui.ts)):

- **Круг / sunburst** — [SunburstView.tsx](../src/components/map/SunburstView.tsx): a zoomable
  radial partition drawn with `d3-hierarchy` (`partition`), `d3-shape` (`arc`), `d3-selection`,
  and `d3-zoom`. Wheel / buttons zoom, drag pans, clicking a sector drills in.
- **Уровни / icicle** — [IcicleView.tsx](../src/components/map/IcicleView.tsx): a column-based
  icicle layout with focus-zoom and breadcrumbs. It is **lazy-loaded** — [App.tsx](../src/App.tsx)
  wraps it in `React.lazy` + `Suspense` so its code splits into a separate chunk that only
  downloads when the view is opened.
- **Список / list** — [RoleTree.tsx](../src/components/tree/RoleTree.tsx): a real, accessible
  `role="tree"` DOM structure. The same component also renders the desktop left rail.

All views read the shared index and the current filter result, so selecting a role highlights it
and focuses its branch consistently across views.

### Performance

- **Code splitting** via `manualChunks` in [vite.config.ts](../vite.config.ts):
  `react`/`react-dom`/`scheduler` → `react` chunk, `d3-*` → `d3` chunk, and
  `@radix-ui` / `zustand` / `immer` / `lucide-react` → `vendor` chunk. The IcicleView is a
  separate lazy chunk on top of that.
- **Animated zoom** uses `requestAnimationFrame` arc tweening in the sunburst.
- **Reduced motion** — [useReducedMotion.ts](../src/hooks/useReducedMotion.ts) reads
  `prefers-reduced-motion` (also honored in CSS) and disables/curtails animation accordingly.
- **Debounced search** — free-text input is debounced via
  [useDebouncedValue.ts](../src/hooks/useDebouncedValue.ts).
- **The index is built once and cached**; the filter engine iterates a precomputed `flatRoles`
  array with normalized haystacks and stack-token sets, avoiding repeated string work.

**Bundle sizes** (gzipped, approximate — the dataset makes the main chunk sizeable):

| Chunk | Size (gzip) |
| --- | --- |
| App + dataset (main) | ~139 KB |
| react | ~60 KB |
| d3 | ~19 KB |
| vendor (radix / zustand / immer / lucide) | ~11 KB |
| CSS | ~9 KB |
| lazy IcicleView | ~1.5 KB |

## Accessibility model

- The **DOM tree is the source of truth**. [RoleTree.tsx](../src/components/tree/RoleTree.tsx)
  renders a proper `role="tree"` used by assistive technology and keyboard navigation.
- The **SVG map is decorative**: it is marked `aria-hidden` in [App.tsx](../src/App.tsx) and
  mirrors the same store state, so it never becomes a separate, inaccessible source of truth.
- A visually-hidden `role="status"` `aria-live="polite"` region announces state changes.
- The mobile detail sheet manages focus and restores it on close; the store tracks
  `returnFocusId` so focus returns to the previously selected role.
- **"Why dimmed" explanations** come from `getFilterReason` in
  [src/lib/filter.ts](../src/lib/filter.ts) and `REASON_TEXT`, so the reason a role is filtered
  out is exposed as text/aria rather than being reverse-engineered in the UI.

## Testing strategy

Tests run under **vitest** (jsdom environment). The current suite is 6 files:

- [src/data/dataset.test.ts](../src/data/dataset.test.ts) — the **data gate**: schema +
  integrity validation, index build, RUB-salary presence, the full leadership ladder, per-role
  content-quality thresholds, and per-domain ring size. Runnable on its own via
  `npm run validate:data`.
- [src/lib/filter.test.ts](../src/lib/filter.test.ts) — the filter engine (matching semantics,
  same-band constraint, reasons).
- [src/lib/urlState.test.ts](../src/lib/urlState.test.ts) — the URL codec (encode/decode,
  clamping, validation, param whitelist).
- [src/lib/currency.test.ts](../src/lib/currency.test.ts) — money formatting and display FX.
- [src/components/tree/RoleTree.test.tsx](../src/components/tree/RoleTree.test.tsx) — the
  accessible tree.
- [src/components/panel/DetailPanel.test.tsx](../src/components/panel/DetailPanel.test.tsx) —
  the detail panel.

## Security summary

Full policy lives in `SECURITY.md`; briefly:

- **Content-Security-Policy** is set in [public/_headers](../public/_headers)
  (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'none'`, `form-action 'none'`, `upgrade-insecure-requests`). `style-src` keeps
  `'unsafe-inline'` because the map and slider set geometry via inline styles.
- **No dangerous HTML** — there is no `dangerouslySetInnerHTML` anywhere in the source.
- **Hardened URL decoder** — untrusted URL / search input is validated by
  [urlState.ts](../src/lib/urlState.ts): a strict param whitelist, prototype-pollution guards,
  regex-validated integer ranges with clamping, and enum intersection against the dataset.
- **zod is dev/CI only** — dynamically imported under `import.meta.env.DEV` and banned from
  runtime imports by an ESLint rule, so it contributes 0 bytes to the production bundle.
- **Self-hosted assets** — icons via `lucide-react`, fonts via `@fontsource` (no icon or font
  CDN).
