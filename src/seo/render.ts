import type { Domain, Role } from '@/types/taxonomy'
import { domainPath, mapLink, rolePath } from '@/lib/seoPaths'

export const SITE_URL = 'https://daminow.github.io/itmap/'
export const SITE_TITLE = 'IT Map — карта IT-профессий, навыков и карьерных путей'
export const SITE_DESCRIPTION =
  'Найдите свой путь в IT: сравните профессии, навыки, грейды и ориентиры зарплат. Интерактивная карта и подробный справочник для выбора карьеры и найма.'

export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function jsonLd(value: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`
}

export function canonical(path = ''): string {
  return new URL(path, SITE_URL).href
}

const money = (n: number) => new Intl.NumberFormat('ru-RU').format(n)
const list = (items: string[]) => `<ul class="guide-list">${items.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`
const chips = (items: string[]) => `<ul class="guide-chips">${items.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`

function roleCard(role: Role, base: string): string {
  return `<li class="guide-card" data-search="${escapeHtml(`${role.name} ${role.stack.join(' ')} ${role.specializations.join(' ')}`.toLocaleLowerCase('ru'))}">
    <a href="${base}${rolePath(role)}"><h3>${escapeHtml(role.name)}</h3><p>${escapeHtml(role.summary)}</p><span class="guide-card-meta">${escapeHtml(role.levels.map((l) => l.level).join(' · '))}</span></a>
  </li>`
}

export function breadcrumbs(items: { name: string; path: string }[], base: string): string {
  return `<nav aria-label="Хлебные крошки" class="guide-breadcrumbs"><ol>${items.map((v, i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${escapeHtml(v.name)}</span>` : `<a href="${base}${v.path}">${escapeHtml(v.name)}</a>`}</li>`).join('')}</ol></nav>`
}

export function breadcrumbData(items: { name: string; path: string }[]): object {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.name, item: canonical(v.path) })) }
}

export function header(base: string): string {
  return `<a class="guide-skip" href="#content">К содержанию</a><header class="guide-header"><a class="guide-brand" href="${base}"><span aria-hidden="true">◎</span> IT Map</a><nav aria-label="Основная навигация"><a href="${base}">Карта</a><a href="${base}professions/">Профессии</a><a href="${base}about/">О данных</a></nav></header>`
}

export function footer(base: string): string {
  return `<footer class="guide-footer"><p>IT Map — открытый справочник IT-профессий и карьерных направлений.</p><nav aria-label="Дополнительные ссылки"><a href="${base}">Интерактивная карта</a><a href="${base}professions/">Все профессии</a><a href="${base}about/">О данных</a><a href="${base}privacy/">Приватность</a><a href="${base}sitemap.xml">Карта сайта</a><a href="https://github.com/daminow/itmap" rel="noopener noreferrer">Исходный код</a></nav></footer>`
}

export function head(title: string, description: string, path: string, base: string, robots = 'index,follow,max-image-preview:large'): string {
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><meta name="theme-color" content="#3b5bdb">
${robots.startsWith('noindex') ? '' : `<link rel="canonical" href="${canonical(path)}">`}<link rel="icon" type="image/svg+xml" href="${base}favicon.svg"><link rel="stylesheet" href="${base}guide.css">
<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="IT Map"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical(path)}"><meta property="og:image" content="${canonical('social/og-image.png')}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="IT Map — справочник профессий и интерактивная карта IT">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${canonical('social/og-image.png')}">`
}

export function documentPage(title: string, description: string, path: string, body: string, base: string, structured: object[] = [], robots?: string): string {
  return `<!doctype html><html lang="ru"><head>${head(title, description, path, base, robots)}${structured.map(jsonLd).join('')}<script defer src="${base}guide.js"></script></head><body class="guide-page">${header(base)}<main id="content" class="guide-main">${body}</main>${footer(base)}</body></html>`
}

export function homeContent(domains: Domain[], base: string): string {
  const roles = domains.flatMap((d) => d.roles)
  return `<section class="guide-home guide-main" id="guide-content" aria-labelledby="guide-title"><div class="guide-hero"><p class="guide-kicker">Профессии · навыки · карьера</p><h1 id="guide-title">Карта IT-профессий</h1><p class="guide-lead">${roles.length} профессий в ${domains.length} направлениях. Разберитесь, чем занимаются специалисты, какие навыки им нужны и как может развиваться карьера.</p><div class="guide-actions"><a class="guide-button" href="${base}professions/">Открыть справочник профессий</a><a class="guide-link" href="${base}about/">Как пользоваться данными</a></div></div>
<section class="guide-section"><h2>Кому поможет IT Map</h2><div class="guide-columns"><article><h3>Выбираете первую профессию</h3><p>Сравните обязанности и технологии. Посмотрите, какие роли подходят вашим интересам и что обычно требуется от начинающего специалиста.</p></article><article><h3>Планируете развитие</h3><p>Изучите грейды, соседние специальности и карьерные переходы. Сопоставьте текущие навыки с задачами следующего уровня.</p></article><article><h3>Нанимаете в команду</h3><p>Уточните зону ответственности роли, необходимые компетенции и критерии оценки кандидата.</p></article></div></section>
<section class="guide-section" id="directions"><h2>Направления в IT</h2><p class="guide-muted">Начните с интересующей области — внутри есть описания всех входящих в неё профессий.</p><ul class="guide-grid">${domains.map((d) => `<li class="guide-card"><a href="${base}${domainPath(d.id)}"><h3>${escapeHtml(d.name)}</h3><p>${escapeHtml(d.description ?? '')}</p><span class="guide-card-meta">Профессий: ${d.roles.length}</span></a></li>`).join('')}</ul></section>
<section class="guide-section"><h2>Как пользоваться картой</h2><ol class="guide-steps"><li>Выберите направление или найдите профессию через поиск.</li><li>Сравните обязанности, стек и требования к разным грейдам.</li><li>Используйте фильтры опыта, зарплаты и технологий, чтобы сузить выбор.</li><li>Откройте подробную страницу профессии и изучите смежные роли.</li></ol></section>
<section class="guide-section"><h2>Вопросы о выборе IT-профессии</h2><details><summary>Нужно ли уметь программировать, чтобы работать в IT?</summary><p>Не во всех ролях. В IT есть дизайн, продукт, управление, поддержка, подбор персонала и другие направления. Сравните обязанности и навыки конкретных профессий.</p></details><details><summary>Чем Junior отличается от Middle и Senior?</summary><p>Уровни отличаются самостоятельностью, сложностью задач и ответственностью. Годы опыта — только ориентир: одинаковое число лет не означает одинаковую квалификацию.</p></details><details><summary>Можно ли считать зарплаты в карте точными?</summary><p>Нет. Это ориентиры из авторского справочника, а не предложения работодателей и не регулярно обновляемая статистика вакансий. Условия зависят от компании, региона и специализации. <a href="${base}about/">Подробнее о данных</a>.</p></details><details><summary>Можно ли поделиться конкретной профессией?</summary><p>Да. У каждой профессии есть постоянная страница в справочнике и ссылка, открывающая её карточку на интерактивной карте.</p></details></section></section>${footer(base)}`
}

export function catalogueBody(domains: Domain[], base: string): string {
  const roles = domains.flatMap((d) => d.roles)
  return `${breadcrumbs([{ name: 'IT Map', path: '' }, { name: 'Профессии', path: 'professions/' }], base)}<div class="guide-hero"><p class="guide-kicker">Справочник</p><h1>Все IT-профессии</h1><p class="guide-lead">${roles.length} профессий: обязанности, технологии, грейды и карьерные пути. Выберите направление или найдите название и навык.</p><label class="guide-search" for="role-search">Поиск по профессиям и технологиям<input id="role-search" type="search" placeholder="Например, Frontend, Python или аналитик" autocomplete="off"></label><p id="search-status" class="guide-muted" role="status" aria-live="polite">Профессий: ${roles.length}</p></div><nav class="guide-directions" aria-label="Быстрый переход к направлению">${domains.map((d) => `<a href="#${d.id}">${escapeHtml(d.name)}</a>`).join('')}</nav>${domains.map((d) => `<section class="guide-section guide-domain-group" id="${d.id}"><div class="guide-section-head"><h2><a href="${base}${domainPath(d.id)}">${escapeHtml(d.name)}</a></h2><a class="guide-link" href="${base}${domainPath(d.id)}">О направлении →</a></div><ul class="guide-grid">${d.roles.map((r) => roleCard(r, base)).join('')}</ul></section>`).join('')}`
}

export function domainBody(domain: Domain, base: string): string {
  return `${breadcrumbs([{ name: 'IT Map', path: '' }, { name: 'Профессии', path: 'professions/' }, { name: domain.name, path: domainPath(domain.id) }], base)}<div class="guide-hero"><p class="guide-kicker">${escapeHtml(domain.family)}</p><h1>${escapeHtml(domain.name)}</h1><p class="guide-lead">${escapeHtml(domain.description ?? '')}</p><p class="guide-muted">В справочнике: ${domain.roles.length} профессий. Сравните роли по обязанностям, стеку и карьерным перспективам.</p><a class="guide-button" href="${base}?z=domain%3A${domain.id}">Открыть направление на карте</a></div><section class="guide-section"><h2>Профессии направления</h2><ul class="guide-grid">${domain.roles.map((r) => roleCard(r, base)).join('')}</ul></section><aside class="guide-note"><h2>Как выбрать подходящую роль</h2><p>Начните с реальных задач: разработка продукта, работа с данными, поддержка пользователей или управление командой. Затем сравните нужные технологии и требования к уровню самостоятельности.</p><a href="${base}professions/">Сравнить с другими направлениями</a></aside>`
}

export function roleBody(role: Role, domain: Domain, roles: Map<string, Role>, base: string): string {
  const adjacent = role.adjacentRoles.map((id) => roles.get(id)).filter((r): r is Role => !!r)
  return `${breadcrumbs([{ name: 'IT Map', path: '' }, { name: domain.name, path: domainPath(domain.id) }, { name: role.name, path: rolePath(role) }], base)}<article><div class="guide-hero"><p class="guide-kicker">${escapeHtml(domain.name)}</p><h1>${escapeHtml(role.name)}</h1><p class="guide-lead">${escapeHtml(role.summary)}</p><div class="guide-actions"><a class="guide-button" href="${mapLink(base, role)}">Открыть профессию на карте</a><a class="guide-link" href="${base}${domainPath(domain.id)}">Все профессии направления</a></div></div><div class="guide-article-layout"><div><section class="guide-section" id="responsibilities"><h2>Чем занимается ${escapeHtml(role.name)}</h2>${list(role.responsibilities)}</section><section class="guide-section" id="skills"><h2>Технологии и навыки</h2>${chips(role.stack)}</section>${role.specializations.length ? `<section class="guide-section"><h2>Специализации</h2>${chips(role.specializations)}</section>` : ''}<section class="guide-section" id="salary"><h2>Грейды, опыт и ориентиры зарплат</h2><p>Диапазоны из справочника для рынка РФ, рублей в месяц. Это оценочные ориентиры, а не текущие вакансии или гарантия дохода.</p><div class="guide-table-wrap"><table><caption>Уровни профессии «${escapeHtml(role.name)}»</caption><thead><tr><th scope="col">Грейд</th><th scope="col">Опыт, лет</th><th scope="col">Ориентир, ₽/мес.</th></tr></thead><tbody>${role.levels.map((l) => `<tr><th scope="row">${l.level}</th><td>${l.experienceYears[0]}–${l.experienceYears[1]}</td><td>${money(l.salary.rub[0])}–${money(l.salary.rub[1])}</td></tr>`).join('')}</tbody></table></div><p class="guide-muted"><a href="${base}about/">Ограничения данных и как проверять зарплатные ожидания</a></p></section>${role.growthPath ? `<section class="guide-section" id="career"><h2>Карьерный путь</h2><p>${escapeHtml(role.growthPath)}</p></section>` : ''}${role.employment ? `<section class="guide-section"><h2>Как обычно нанимают на эту роль</h2><p>${escapeHtml(role.employment)}</p></section>` : ''}<section class="guide-section"><h2>Что оценить при найме и подготовке</h2>${list(role.whatToLookFor)}</section></div><aside class="guide-contents"><h2>На этой странице</h2><nav aria-label="Содержание профессии"><a href="#responsibilities">Обязанности</a><a href="#skills">Навыки и технологии</a><a href="#salary">Грейды и зарплаты</a>${role.growthPath ? '<a href="#career">Карьерный путь</a>' : ''}<a href="${mapLink(base, role)}">Карточка на карте →</a></nav></aside></div></article>${adjacent.length ? `<section class="guide-section"><h2>Смежные профессии</h2><ul class="guide-grid">${adjacent.map((r) => roleCard(r, base)).join('')}</ul></section>` : ''}`
}
