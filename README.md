# ITmap — интерактивная карта IT-специальностей

Интерактивная «круглая карта» всех IT-специальностей: иерархия семейство → домен → роль с drill-down,
детальной панелью (обязанности, «кого искать», стек, грейды, путь роста), фильтрами
(зарплата / опыт / стек / уровень / тип), мульти-валютой (₽/$/€) и шарящимися ссылками.

- **157 ролей** в **20 доменах**, сгруппированных в 7 семейств (полная лестница лидерства до CTO/CIO/CPO/CISO).
- **Три вида** (переключатель над картой):
  - **Круг** — зумируемый санберст: семейства → домены → роли видны сразу; клик по сектору
    плавно углубляет (анимированный arc-tween), колесо/кнопки — масштаб, перетаскивание — пан.
  - **Уровни** — icicle: колонки семейство/домен/роль с подписями, focus-zoom + хлебные крошки.
  - **Список** — доступное DOM-дерево.
- Все виды синхронизированы: выбор роли подсвечивает её во всех видах и фокусирует ветку.
- Доступность: единое DOM-дерево `role="tree"` (рельс / список) — источник для AT и клавиатуры;
  SVG-карта декоративна (`aria-hidden`). Фокус-trap в мобильном sheet, focus-restore, «почему приглушено».
- Без бэкенда: данные — статический типизированный датасет (`src/data/domains/*.ts`).

## Стек

Vite 7 · React 19 · TypeScript 5.9 (strict) · Zustand (+ immer) · d3 (hierarchy/shape/zoom/interpolate/selection)
· @radix-ui/react-slider · lucide-react · Lora (self-hosted, @fontsource) · zod (только build/CI).

## Команды

```bash
npm ci             # установка из package-lock
npm run dev        # дев-сервер
npm run build      # tsc -b && vite build
npm run typecheck  # проверка типов
npm run lint       # ESLint (FX-граница фильтра, запрет zod в рантайме, react/no-danger)
npm run test       # vitest (фильтр, URL, валюта, датасет + контент, RoleTree, DetailPanel)
npm run validate:data  # валидация датасета (схема + целостность + контент-пороги)
```

## Структура

- `src/types/` — модель данных (Domain/Role/LevelBand, фасеты, ViewMode).
- `src/data/` — `defineDomain` (авторинг), `domains/*.ts` (контент), `index.ts` (индекс + `stackNorm`), `schema.ts` (zod, dev/CI).
- `src/store/` — Zustand-стор (фильтры, рынок, зум, выбор).
- `src/lib/` — `filter` (чистый движок + `getFilterReason`), `currency` (рынки + display-FX),
  `urlState` (хардненный кодек), `hierarchy` (d3-дерево для видов), `search`, `normalize`, `labels`.
- `src/components/` — `map/` (SunburstView, IcicleView), `tree/` (доступное дерево),
  `panel/`, `filters/` (+ RangeSlider, Sheet), `ui/`, `onboarding/`.
- `src/i18n/ru.ts` — единый словарь строк интерфейса (i18n-ready).

## Производительность

Виды разнесены по чанкам: `react` · `d3` · `vendor` (radix/zustand/immer/lucide) · ленивый `IcicleView` ·
основной app+датасет ≈ **107 KB gzip**. Анимация зума — `requestAnimationFrame` с интерполяцией только
видимых колец; всё уважает `prefers-reduced-motion`.

## Данные

Зарплаты — курируемые ориентиры рынка РФ 2026 (`rub` обязателен; `usd/eur` опциональны, где есть
реальная оценка; иначе панель показывает «≈ по курсу [дата]»). Правки контента — в `src/data/domains/*.ts`,
после чего `npm run validate:data` (проверяет схему, целостность ссылок и контент-пороги:
≥3 обязанности, ≥2 сигнала найма, монотонность вилок, ≤13 ролей на домен).

## Безопасность

Статический клиент; CSP — в `public/_headers` (`script-src 'self'`, `frame-ancestors 'none'`,
`object-src 'none'`, `upgrade-insecure-requests`; `style-src` оставляет `'unsafe-inline'` —
карта/icicle/слайдер задают геометрию и цвета inline-стилями, при этом скриптовый вектор XSS заперт).
Недоверенный ввод (URL/поиск) проходит хардненный декодер (regex-диапазоны, кламп, пересечение enum,
whitelist параметров, защита от prototype-pollution). Без `dangerouslySetInnerHTML`, без CDN
(иконки — `lucide-react`, шрифт — self-hosted). zod в прод-бандле = 0 байт (eslint-гард + dev-only импорт).
