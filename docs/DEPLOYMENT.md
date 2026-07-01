# Развёртывание / Deployment

ITmap — это статический клиентский SPA без бэкенда. Сборка производит папку
`dist/` из статических файлов, которую можно раздавать с любого статического
хостинга или CDN.

ITmap is a static, client-side SPA with no backend. The build produces a `dist/`
folder of static files that can be served from any static host or CDN.

Референсное развёртывание / Reference deployment: <https://itmap.daminov.net>

## Сборка / Build

Требуется Node 22 и npm 10.
Requires Node 22 and npm 10.

```bash
npm ci
npm run build
```

Результат — папка `dist/` со статическими ассетами. Ассеты в `dist/assets/`
содержат хэш контента в имени файла (content-hashed).

The result is a `dist/` folder of static assets. Files in `dist/assets/` are
content-hashed (the hash is part of the filename).

Локальная проверка собранной версии / Preview the production build locally:

```bash
npm run preview
```

## Общие требования / General requirements

Любой хостинг должен обеспечить два условия / Any host must satisfy two things:

1. **SPA-маршрутизация / SPA routing.** Все неизвестные пути должны отдавать
   `/index.html` (fallback), чтобы клиентская маршрутизация работала при прямом
   заходе и обновлении страницы. / All unknown paths must fall back to
   `/index.html` so client-side routing works on direct navigation and reload.

2. **Кэширование / Caching.**
   - `assets/*` — иммутабельные, кэшировать надолго (`Cache-Control:
     public, max-age=31536000, immutable`), так как имена содержат хэш. /
     immutable, cache long-term because filenames are content-hashed.
   - `index.html` — без кэша (`Cache-Control: no-cache`), чтобы клиенты всегда
     получали ссылки на актуальные ассеты. / no-cache, so clients always pick up
     references to the latest assets.

## Заголовки безопасности / Security headers

Единственный источник истины для заголовков безопасности (в том числе CSP) —
файл [`public/_headers`](../public/_headers). Не дублируйте эти значения вручную:
берите их из этого файла.

The single source of truth for security headers (including CSP) is
[`public/_headers`](../public/_headers). Do not duplicate the values by hand;
take them from that file.

- **Cloudflare Pages** и **Netlify** читают `public/_headers` автоматически —
  дополнительная настройка не нужна. / **Cloudflare Pages** and **Netlify**
  consume `public/_headers` automatically; no extra configuration is required.
- Для **nginx** и других хостингов те же заголовки нужно задать в конфигурации
  сервера вручную, опираясь на `public/_headers` как на источник истины. / For
  **nginx** and other hosts, set the same headers in the server configuration
  manually, using `public/_headers` as the source of truth.

## Хостинги / Hosts

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22 (переменная окружения / environment variable
  `NODE_VERSION=22`)
- Заголовки из `public/_headers` применяются автоматически. / Headers from
  `public/_headers` are applied automatically.
- SPA fallback: Cloudflare Pages по умолчанию отдаёт `/index.html` для
  ненайденных путей одностраничного приложения. / Cloudflare Pages serves
  `/index.html` for unmatched SPA paths by default.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 22 (через `NODE_VERSION=22` или файл `.nvmrc` / via
  `NODE_VERSION=22` or a `.nvmrc` file)
- Заголовки из `public/_headers` применяются автоматически. / Headers from
  `public/_headers` are applied automatically.
- SPA fallback: добавьте правило редиректа. / Add a redirect rule. Например, в
  `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22
- SPA fallback: Vercel корректно обрабатывает SPA-маршрутизацию для Vite. При
  необходимости добавьте rewrite всех путей на `/index.html`. / Vercel handles
  SPA routing for Vite correctly. If needed, add a rewrite of all paths to
  `/index.html`.
- Заголовки безопасности: Vercel не читает `public/_headers`. Задайте те же
  значения через настройки заголовков Vercel, взяв их из `public/_headers`. /
  Vercel does not read `public/_headers`. Set the same values via Vercel's
  headers configuration, taken from `public/_headers`.

### GitHub Pages

- Соберите проект (`npm run build`) и опубликуйте содержимое `dist/`. /
  Build the project (`npm run build`) and publish the contents of `dist/`.
- SPA fallback на GitHub Pages: скопируйте `dist/index.html` в `dist/404.html`
  перед публикацией — GitHub Pages отдаёт `404.html` для ненайденных путей, что
  даёт fallback для клиентской маршрутизации. / SPA fallback on GitHub Pages:
  copy `dist/index.html` to `dist/404.html` before publishing — GitHub Pages
  serves `404.html` for unmatched paths, providing the client-routing fallback.
- Заголовки безопасности: GitHub Pages не поддерживает произвольные HTTP-заголовки
  и не читает `public/_headers`. Полноценный CSP через заголовок недоступен. Для
  строгого CSP используйте хостинг с поддержкой заголовков. / GitHub Pages does
  not support custom HTTP headers and does not read `public/_headers`. A full CSP
  via header is not available there. For strict CSP, use a host that supports
  headers.
- Если сайт размещается в подкаталоге (`user.github.io/repo`), настройте base
  path сборки соответствующим образом. / If the site is served from a
  subdirectory (`user.github.io/repo`), configure the build base path
  accordingly.

### nginx (общий / generic)

- Раздавайте содержимое `dist/` как статические файлы. / Serve the contents of
  `dist/` as static files.
- Настройте SPA fallback: неизвестные пути отдают `index.html`. / Configure the
  SPA fallback: unknown paths return `index.html`. Ориентир — директива
  `try_files $uri $uri/ /index.html;` в блоке `location /`.
- Настройте кэширование: долгий immutable-кэш для `assets/*`, `no-cache` для
  `index.html` (см. раздел «Кэширование» выше). / Configure caching: long-term
  immutable cache for `assets/*`, `no-cache` for `index.html` (see the caching
  section above).
- Пропишите заголовки безопасности из `public/_headers` в конфигурации сервера
  (директивы `add_header`). Значения берите из
  [`public/_headers`](../public/_headers), не выдумывайте свои. / Add the
  security headers from `public/_headers` in the server configuration
  (`add_header` directives). Take the values from
  [`public/_headers`](../public/_headers); do not invent your own.
