# ITmap — Data Model

Repository: <https://github.com/daminow/itmap>

This document describes the authored dataset — the heart of ITmap. The dataset currently covers
**170 roles across 22 domains**. All types below come from
[src/types/taxonomy.ts](../src/types/taxonomy.ts); authoring helpers from
[src/data/defineDomain.ts](../src/data/defineDomain.ts); validation from
[src/data/schema.ts](../src/data/schema.ts) and [src/data/dataset.test.ts](../src/data/dataset.test.ts).

## The taxonomy: Domain → Role → LevelBand

- A **Domain** is a specialization area (e.g. Frontend, Backend, QA). Each domain lives in its
  own file in [src/data/domains/](../src/data/domains/) and holds a list of roles.
- A **Role** is the canonical, always-filterable unit (e.g. "Manual QA Engineer").
- A **LevelBand** is one seniority grade of a role (Junior / Middle / Senior / Lead) with its
  salary and experience range.

Ids are **branded** (`DomainId`, `RoleId` — string types with a phantom brand) so domain and
role ids cannot be mixed up at the type level.

## `Domain`

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `'domain'` | yes | Discriminant. Set by `defineDomain`. |
| `id` | `DomainId` | yes | Unique domain id, e.g. `'frontend'`. |
| `name` | `string` | yes | Display name, e.g. `'QA и тестирование'`. |
| `family` | `string` | yes | Legacy color-family grouping label. Still present, but the visual grouping in the wheel is by C-level (see below). |
| `accent` | `string` | yes | CSS custom-property name for the domain accent, e.g. `'--accent-backend'` (must start with `--`). |
| `description` | `string` | no | One-paragraph domain blurb (shown on the department node). |
| `roles` | `Role[]` | yes | The roles in this domain (at least one; at most 13). |

## `Role`

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `'role'` | yes | Discriminant. Set by `defineDomain`. |
| `id` | `RoleId` | yes | Namespaced id `${domainId}.${localId}`. Authors write only the local part. |
| `domainId` | `DomainId` | yes | Owning domain id. Injected by `defineDomain`. |
| `name` | `string` | yes | Display name of the role. |
| `type` | `RoleType` | yes | One of the `ROLE_TYPES` enum (drives the "type" facet). |
| `summary` | `string` | yes | One-sentence overview (validated ≥ 20 chars). |
| `responsibilities` | `string[]` | yes | What the role does day to day (≥ 3 entries). |
| `whatToLookFor` | `string[]` | yes | Hiring signals — what to look for at interview (≥ 2 entries). |
| `stack` | `string[]` | yes | Tools/technologies. Feeds the stack facet and search (non-empty). |
| `specializations` | `string[]` | no (defaults to `[]`) | Narrower flavors of the role. Feed search, shown as chips. |
| `levels` | `LevelBand[]` | yes | Seniority bands (at least one). Sorted to canonical order by `defineDomain`. |
| `growthPath` | `string` | no | Career progression sentence. |
| `employment` | `string` | no by type, required by the data gate | How people are actually hired for this role in the RU market (channels + selection). Validated ≥ 30 chars. |
| `demand` | `Demand` | yes | One of the `DEMANDS` enum (`low` / `medium` / `high`). |
| `adjacentRoles` | `RoleId[]` | no (defaults to `[]`) | Related roles, by fully-qualified id. Resolved and symmetrized at build. |
| `tags` | `string[]` | no (defaults to `[]`) | Extra keywords; fold into the search haystack. |

Note on `employment`: the TypeScript type marks it optional, and the zod schema treats it as an
optional string, but the data gate [dataset.test.ts](../src/data/dataset.test.ts) **requires**
every role to have a meaningful `employment` (≥ 30 characters). Treat it as mandatory when
authoring.

## `LevelBand`

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `level` | `Level` | yes | One of `LEVELS` — `Junior` / `Middle` / `Senior` / `Lead`. |
| `salary` | `SalaryByMarket` | yes | Per-market salary. `rub` is mandatory; `usd`/`eur` optional (see salary semantics). |
| `experienceYears` | `Range` | yes | Inclusive `[min, max]` years, `0 <= min <= max`. |

`SalaryByMarket` is `{ rub: Range; usd?: Range; eur?: Range }`. `Range` is an inclusive
`[min, max]` tuple with `min <= max`. Salary ranges must be strictly positive (`0 < min <= max`).

## Enums

All defined in [src/types/taxonomy.ts](../src/types/taxonomy.ts) as `as const` arrays (a single
source of truth, also imported by the URL codec):

| Enum | Values |
| --- | --- |
| `LEVELS` | `Junior`, `Middle`, `Senior`, `Lead` |
| `ROLE_TYPES` | `engineering`, `data`, `ops`, `security`, `qa`, `design`, `product`, `management`, `research`, `support` |
| `DEMANDS` | `low`, `medium`, `high` |
| `MARKETS` | `rub`, `usd`, `eur` |

## Authoring with `defineDomain()` and `band()`

A domain file imports the two helpers and exports one domain. `defineDomain` injects `kind` /
`domainId`, namespaces every role id, defaults optional arrays, and sorts each role's `levels`
into canonical order. `band(level, rubRange, expRange, extra?)` builds a `LevelBand` — RUB is
positional; optional `usd`/`eur` estimates go in `extra`.

The following is an **illustrative example** (not a real role in the dataset), matching the
actual API:

```ts
import { defineDomain, band } from '@/data/defineDomain'

export const example = defineDomain({
  id: 'example',
  name: 'Пример домена',
  family: 'Разработка',
  accent: '--accent-frontend',
  description: 'Иллюстративный домен для документации.',
  roles: [
    {
      id: 'widget-engineer', // becomes 'example.widget-engineer'
      name: 'Widget Engineer',
      type: 'engineering',
      summary: 'Проектирует и поддерживает виджеты для встраиваемых интерфейсов.',
      responsibilities: [
        'Проектирует API виджетов и их жизненный цикл',
        'Пишет и покрывает тестами клиентский код',
        'Оптимизирует производительность рендеринга',
      ],
      whatToLookFor: [
        'Понимание браузерного рендеринга и производительности',
        'Опыт проектирования переиспользуемых компонентов',
      ],
      stack: ['TypeScript', 'React', 'Vite'],
      specializations: ['Встраиваемые виджеты', 'Design systems'],
      levels: [
        band('Junior', [80000, 130000], [0, 2]),
        band('Middle', [130000, 200000], [2, 4]),
        band('Senior', [200000, 300000], [4, 8]),
      ],
      growthPath: 'Junior → Middle → Senior → Tech Lead',
      employment:
        'Нанимают через job-борды и реферальные каналы; отбор включает тестовое на проектирование компонента.',
      demand: 'high',
      adjacentRoles: ['frontend.react'], // fully-qualified; symmetrized at build
      tags: ['ui', 'components'],
    },
  ],
})
```

To make this domain live, register it in [src/data/registry.ts](../src/data/registry.ts).

## Id namespacing and adjacency symmetrization

- **Namespacing.** Authors write bare local ids (`'widget-engineer'`); `defineDomain` turns them
  into `${domainId}.${localId}` (`'example.widget-engineer'`). `adjacentRoles` must be written as
  fully-qualified ids because they can point across domains.
- **Symmetrization.** During index build ([src/data/index.ts](../src/data/index.ts)),
  `symmetrizeAdjacency` drops self-references and dangling ids, then makes every adjacency
  bidirectional. Declaring `A → B` on one side is enough; `B → A` is added automatically.

## Derived / runtime fields (computed, not authored)

[src/data/index.ts](../src/data/index.ts) builds a `DataIndex`
([src/types/runtime.ts](../src/types/runtime.ts)) once and caches it. These are **computed**,
never written by hand:

| Field | Type | Meaning |
| --- | --- | --- |
| `roleById` | `Map<RoleId, IndexedRole>` | Fast role lookup. |
| `domainById` | `Map<DomainId, Domain>` | Fast domain lookup. |
| `flatRoles` | `IndexedRole[]` | All roles flattened, in domain order (the filter engine iterates this). |
| `stackTokens` | `Set<string>` | Every normalized stack token in the dataset (used by the stack facet and the URL codec's stack intersection). |
| `salaryBounds` | `Record<Market, Range>` | Global `[min, max]` salary bounds per market across all authored bands (used to size the salary slider). |

An `IndexedRole` extends `Role` with `stackNorm` (a set of normalized stack tokens), `haystack`
(a precomputed normalized search string built from name + summary + tags + stack +
specializations + domain name), and `domainName`.

## Validation contract

Two layers, both defined against the enums and structure above.

### zod schema — [src/data/schema.ts](../src/data/schema.ts)

- Strict object shapes for domain, role, band, and salary (no unknown keys).
- Salary ranges: `0 < min <= max`; experience ranges: `0 <= min <= max`.
- `level` from `LEVELS`, `type` from `ROLE_TYPES`, `demand` from `DEMANDS`.
- `accent` must start with `--`.
- At least one level band per role; at least one role per domain.
- **Salary monotonicity**: the RUB lower bound is non-decreasing across canonical level order.
- **Uniqueness**: no duplicate domain ids, no duplicate role ids.
- **Adjacency integrity**: a role may not list itself; every adjacent id must resolve to a known
  role.

### Data gate — [src/data/dataset.test.ts](../src/data/dataset.test.ts)

Runs the zod schema plus content-quality thresholds (run it with `npm run validate:data`):

- Index builds; all role ids are unique; at least 150 roles present.
- Every role has ≥ 1 band and every band has a positive RUB lower bound.
- The full leadership ladder is present (CTO / CIO / CPO / CISO appear among role names).
- Per-role content quality: `summary` ≥ 20 chars, ≥ 3 responsibilities, ≥ 2 `whatToLookFor`,
  non-empty stack, `employment` ≥ 30 chars.
- **RUB-only currency in the dataset**: any per-band `usd`/`eur` is rejected — regional
  currencies must never be FX-derived and written into the dataset.
- Salary bands strictly non-decreasing in the RUB lower bound.
- Every domain has ≤ 13 roles, a non-empty `family`, and an `accent` starting with `--`.

Each rule exists to keep the map honest and readable: content thresholds guarantee a card is
actually useful; monotonic RUB-only salaries keep the numbers comparable and prevent fake
precision; the ≤ 13 cap keeps the sunburst ring legible; adjacency integrity prevents broken
"related roles" links.

## Salary semantics

- **`rub` is mandatory** in every band. It is the single authoritative number.
- **`usd` / `eur` are optional and are not present in the dataset** — the data gate rejects them.
  Currency conversion is computed **for display only** in [src/lib/currency.ts](../src/lib/currency.ts):
  `displayBand` returns the authored range when present, otherwise an FX-approximated range from
  RUB, flagged `approximate`. The detail panel shows "≈ по курсу [date]" for approximated values.
  The FX table (`FX_DATE`, `USD_TO_RUB`, `EUR_TO_RUB`) is display-only and maintained manually;
  an ESLint rule forbids the filter engine from importing anything but `marketBand`, so filtering
  is always done against authored numbers, never FX-derived ones.
- Figures are **curated RU market reference points for 2026** — informative estimates, not
  guarantees or offers.

## Dataset license

The dataset in `src/data/` is licensed under **CC BY-SA 4.0** ([LICENSE-DATA](../LICENSE-DATA)).
© 2026 Timur Daminov. (Application code is Apache-2.0, see [LICENSE](../LICENSE).)
