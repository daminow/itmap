# Contributing to ITmap

**[Русский](#руководство-для-участников-ru) · [English](#contributing-guide-en)**

Live demo: <https://itmap.daminov.net> · Repository: <https://github.com/daminow/itmap>

---

## Руководство для участников (RU)

Спасибо за интерес к ITmap. Это открытый проект: интерактивная карта IT-специальностей,
построенная поверх типизированного датасета ролей и доменов, который живёт прямо в репозитории.

### Какие вклады приветствуются

- **Правки и дополнения датасета** — это в первую очередь data-проект. Уточнение обязанностей,
  сигналов найма, стека, зарплатных вилок, добавление новых ролей или целых доменов —
  самый ценный тип вклада.
- **Исправления ошибок** — в логике фильтров, отрисовке видов, доступности, URL-состоянии.
- **Функциональность** — новые фильтры, улучшения видов, i18n и т. п.

Датасет описывает **170 ролей в 22 доменах** и организационную вертикаль
CEO → C-suite → направление → роль. Точность и обоснованность данных важнее объёма.

### Требования к окружению

- **Node 22** и **npm 10** (см. `engines`-совместимые версии пакетов в [package.json](package.json)).
- Git.

### Установка

```bash
git clone https://github.com/daminow/itmap.git
cd itmap
npm ci
npm run dev
```

Vite поднимет dev-сервер (по умолчанию <http://localhost:5173>). В dev-режиме датасет
дополнительно проверяется zod-схемой — ошибки валидации выводятся в консоль.

### Скрипты проекта

| Скрипт | Что делает |
| --- | --- |
| `npm run dev` | Dev-сервер Vite с HMR. |
| `npm run build` | Прод-сборка: `tsc -b` (проверка типов) затем `vite build`. |
| `npm run preview` | Локальный предпросмотр собранного бандла. |
| `npm run lint` | ESLint по всему проекту (`eslint .`). |
| `npm run typecheck` | Проверка типов без эмита (`tsc -b --noEmit`). |
| `npm run format` | Prettier: форматирование `src/**/*.{ts,tsx,css}`. |
| `npm run test` | Полный прогон тестов (`vitest run`). |
| `npm run test:watch` | Тесты в watch-режиме. |
| `npm run validate:data` | Прогон только data-гейта ([src/data/dataset.test.ts](src/data/dataset.test.ts)). |

### Как добавить или изменить роль / домен

Датасет разбит на файлы по доменам в [src/data/domains/](src/data/domains/). Каждый файл
экспортирует один домен, собранный через `defineDomain`, а зарплатные вилки удобно описывать
хелпером `band` (оба из [src/data/defineDomain.ts](src/data/defineDomain.ts)).

**Изменить существующую роль:**

1. Откройте нужный файл, например [src/data/domains/qa.ts](src/data/domains/qa.ts).
2. Правьте поля роли прямо в объекте. Идентификаторы указываются «локально» (без домена) —
   `defineDomain` сам добавит префикс домена (`${domainId}.${localId}`) и отсортирует
   грейды в каноническом порядке Junior → Middle → Senior → Lead.
3. Запустите `npm run validate:data`.

**Добавить новую роль** — добавьте ещё один объект в массив `roles` домена. Смежные роли
(`adjacentRoles`) указываются полными id (например `'backend.go'`); связи симметризуются
на этапе сборки индекса, поэтому достаточно перечислить их с одной стороны.

**Добавить целый домен:**

1. Создайте файл `src/data/domains/<domain>.ts` и экспортируйте домен через `defineDomain`.
2. Зарегистрируйте его в [src/data/registry.ts](src/data/registry.ts): импортируйте и добавьте
   в массив `domains`.
3. Если домен должен «висеть» под конкретным C-level в колесе оргчарта — сопоставьте его
   с руководителем в `DOMAIN_CLEVEL` в [src/lib/hierarchy.ts](src/lib/hierarchy.ts).
   Без такого сопоставления домен по умолчанию уходит под CTO.
4. Добавьте цветовой токен `--accent-<domain>` в [src/theme/tokens.css](src/theme/tokens.css)
   и укажите его в поле `accent` домена.

**Пороги качества датасета** проверяются гейтом
[src/data/dataset.test.ts](src/data/dataset.test.ts) и zod-схемой
[src/data/schema.ts](src/data/schema.ts). Что и почему требуется:

- **≥ 3 обязанностей (`responsibilities`)** — роль без нескольких обязанностей не даёт читателю
  понимания, чем реально занимается специалист.
- **≥ 2 сигналов найма (`whatToLookFor`)** — карта нужна и нанимающим; минимум два признака
  «кого искать» делают роль полезной для собеседований.
- **`summary` ≥ 20 символов, стек не пустой** — базовая содержательность карточки.
- **`employment` ≥ 30 символов** — каждая роль обязана описывать, как в неё реально нанимают
  в РФ (каналы + стиль отбора).
- **Монотонность зарплат** — нижняя граница вилки в рублях не должна убывать при переходе
  Junior → Middle → Senior → Lead.
- **Валюта: только рубли в датасете** — поля `usd`/`eur` в грейдах запрещены (честный FX
  считается на дисплее; см. ниже).
- **`type` из фиксированного перечня** — `engineering | data | ops | security | qa | design |
  product | management | research | support`.
- **Целостность смежностей** — роль не может ссылаться сама на себя, а каждый указанный
  `adjacentRoles`-id обязан резолвиться в существующую роль.
- **≤ 13 ролей на домен** — чтобы кольцо санберста оставалось читаемым.
- **Уникальность id доменов и ролей** — дубликаты недопустимы.

### Политика зарплатных данных

Цифры — это **кураторские опорные точки рынка РФ на 2026 год**, а не гарантии и не оффер.
Правки вилок должны сопровождаться обоснованием или источником в описании PR. В датасете
обязателен только `rub`; `usd`/`eur` в датасет **не пишутся** — курсовая конвертация делается
только для отображения. В панели рядом с пересчитанной суммой показывается «≈ по курсу [дата]».

### Стиль кода

- **TypeScript strict.** Проходите `npm run typecheck` без ошибок.
- **ESLint** ([eslint.config.js](eslint.config.js)) с несколькими структурными правилами:
  - движок фильтров [src/lib/filter.ts](src/lib/filter.ts) может импортировать из
    `@/lib/currency` только `marketBand` — FX остаётся display-only, что зафиксировано правилом;
  - zod-схема [src/data/schema.ts](src/data/schema.ts) запрещена к импорту в runtime-код
    (только dev/тесты), поэтому zod весит 0 байт в проде.
- **Prettier** — форматируйте перед PR: `npm run format`.
- **Держите движок фильтров чистым.** [src/lib/filter.ts](src/lib/filter.ts) — набор чистых
  функций без побочных эффектов, DOM и стора; вся объяснимость («почему приглушено») идёт через
  `getFilterReason`, а не дублируется в UI.

### Ожидания к коммитам и PR

- Понятные сообщения коммитов; одна логическая правка = один PR.
- Перед пушем прогоните гейты: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Никаких секретов, ключей, `.env` в коммитах. Репозиторий публичный.

### Доступность

Единое DOM-дерево `role="tree"` ([src/components/tree/RoleTree.tsx](src/components/tree/RoleTree.tsx))
— источник истины для скринридеров и клавиатуры. SVG-карта декоративна и помечена `aria-hidden`.
Сохраняйте это разделение: любые новые данные и состояния должны быть доступны через DOM-дерево.

### Лицензирование вкладов

Отправляя вклад, вы соглашаетесь, что **код** распространяется по **Apache-2.0**
([LICENSE](LICENSE)), а **контент датасета** (`src/data/`) — по **CC BY-SA 4.0**
([LICENSE-DATA](LICENSE-DATA)). © 2026 Timur Daminov.

---

## Contributing guide (EN)

Thanks for your interest in ITmap. It is an open-source project: an interactive map of IT
specializations built on top of a typed, in-repo dataset of roles and domains.

### What contributions are welcome

- **Data corrections and additions** — this is first and foremost a data project. Refining
  responsibilities, hiring signals, stack, salary bands, or adding new roles and whole domains
  is the most valuable kind of contribution.
- **Bug fixes** — in the filter logic, view rendering, accessibility, or URL state.
- **Features** — new filters, view improvements, i18n, and so on.

The dataset describes **170 roles across 22 domains** and an org hierarchy of
CEO → C-suite → department → role. Accuracy and justification matter more than volume.

### Prerequisites

- **Node 22** and **npm 10**.
- Git.

### Setup

```bash
git clone https://github.com/daminow/itmap.git
cd itmap
npm ci
npm run dev
```

Vite starts a dev server (default <http://localhost:5173>). In dev mode the dataset is
additionally validated by a zod schema; validation errors are printed to the console.

### Project scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | Production build: `tsc -b` (type check) then `vite build`. |
| `npm run preview` | Local preview of the built bundle. |
| `npm run lint` | ESLint across the project (`eslint .`). |
| `npm run typecheck` | Type check without emit (`tsc -b --noEmit`). |
| `npm run format` | Prettier over `src/**/*.{ts,tsx,css}`. |
| `npm run test` | Full test run (`vitest run`). |
| `npm run test:watch` | Tests in watch mode. |
| `npm run validate:data` | Runs only the data gate ([src/data/dataset.test.ts](src/data/dataset.test.ts)). |

### How to add or edit a role / domain

The dataset is split into one file per domain in [src/data/domains/](src/data/domains/). Each
file exports a single domain assembled with `defineDomain`, and salary bands are conveniently
authored with the `band` helper (both from [src/data/defineDomain.ts](src/data/defineDomain.ts)).

**Edit an existing role:**

1. Open the relevant file, e.g. [src/data/domains/qa.ts](src/data/domains/qa.ts).
2. Edit the role's fields in place. Ids are written **locally** (without the domain prefix) —
   `defineDomain` namespaces them automatically (`${domainId}.${localId}`) and sorts level
   bands into the canonical Junior → Middle → Senior → Lead order.
3. Run `npm run validate:data`.

**Add a new role** — append another object to the domain's `roles` array. Adjacent roles
(`adjacentRoles`) are given as fully-qualified ids (e.g. `'backend.go'`); relationships are
symmetrized at index-build time, so you only need to list them on one side.

**Add a whole new domain:**

1. Create `src/data/domains/<domain>.ts` and export the domain via `defineDomain`.
2. Register it in [src/data/registry.ts](src/data/registry.ts): import it and add it to the
   `domains` array.
3. If the domain should hang off a specific C-level in the org wheel, map it to an executive
   in `DOMAIN_CLEVEL` in [src/lib/hierarchy.ts](src/lib/hierarchy.ts). Without a mapping the
   domain defaults to the CTO.
4. Add a colour token `--accent-<domain>` in [src/theme/tokens.css](src/theme/tokens.css) and
   reference it in the domain's `accent` field.

**Dataset quality thresholds** are enforced by the gate
[src/data/dataset.test.ts](src/data/dataset.test.ts) and the zod schema
[src/data/schema.ts](src/data/schema.ts). What is required and why:

- **≥ 3 responsibilities** — a role without several responsibilities gives the reader no real
  sense of what the specialist actually does.
- **≥ 2 hiring signals (`whatToLookFor`)** — the map serves hiring too; at least two
  "what to look for" signals make a role useful for interviews.
- **`summary` ≥ 20 characters, non-empty stack** — baseline substance for the card.
- **`employment` ≥ 30 characters** — every role must describe how it is actually hired for in
  the RU market (channels + selection style).
- **Monotonic salaries** — the RUB lower bound must be non-decreasing across
  Junior → Middle → Senior → Lead.
- **RUB-only in the dataset** — per-band `usd`/`eur` are rejected (honest FX is computed at
  display time; see below).
- **`type` from a fixed enum** — `engineering | data | ops | security | qa | design | product |
  management | research | support`.
- **Adjacency integrity** — a role may not reference itself, and every `adjacentRoles` id must
  resolve to an existing role.
- **≤ 13 roles per domain** — to keep the sunburst ring readable.
- **Unique domain and role ids** — no duplicates.

### Salary-data policy

Figures are **curated RU 2026 market reference points**, not guarantees or offers. Corrections
to bands should come with a rationale or source in the PR description. Only `rub` is required in
the dataset; `usd`/`eur` are **not** written into the dataset — currency conversion happens for
display only. The panel shows "≈ по курсу [date]" next to any converted amount.

### Code style

- **TypeScript strict.** Pass `npm run typecheck` with no errors.
- **ESLint** ([eslint.config.js](eslint.config.js)) with a few structural rules:
  - the filter engine [src/lib/filter.ts](src/lib/filter.ts) may import only `marketBand` from
    `@/lib/currency` — this keeps "FX is display-only" a structural invariant;
  - the zod schema [src/data/schema.ts](src/data/schema.ts) is banned from runtime imports
    (dev/tests only), so zod ships as 0 bytes in production.
- **Prettier** — run `npm run format` before opening a PR.
- **Keep the filter engine pure.** [src/lib/filter.ts](src/lib/filter.ts) is a set of pure
  functions with no side effects, DOM, or store access; explainability ("why dimmed") flows
  through `getFilterReason` instead of being duplicated in the UI.

### Commit and PR expectations

- Clear commit messages; one logical change per PR.
- Run the gates before pushing: `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build`.
- No secrets, keys, or `.env` files in commits. The repository is public.

### Accessibility

The single `role="tree"` DOM tree
([src/components/tree/RoleTree.tsx](src/components/tree/RoleTree.tsx)) is the source of truth
for screen readers and the keyboard. The SVG map is decorative and marked `aria-hidden`. Keep
this split: any new data or state must be reachable through the DOM tree.

### Licensing of contributions

By contributing, you agree that **code** is licensed under **Apache-2.0** ([LICENSE](LICENSE))
and **dataset content** (`src/data/`) under **CC BY-SA 4.0** ([LICENSE-DATA](LICENSE-DATA)).
© 2026 Timur Daminov.
