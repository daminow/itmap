import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { domains } from '@/data/registry'
import { domainPath, rolePath } from '@/lib/seoPaths'
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL, breadcrumbData, canonical, catalogueBody, documentPage, domainBody, head, homeContent, jsonLd, roleBody } from './render'

export function extractAssets(source: string): string {
  return [...source.matchAll(/<(?:script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script\s*>|link\b[^>]*(?:rel=["'](?:modulepreload|stylesheet)["'])[^>]*>)/g)].map((m) => m[0]).join('\n')
}

export async function generatePages(output: string, base: string): Promise<void> {
  const roles = domains.flatMap((d) => d.roles)
  const roleMap = new Map(roles.map((r) => [r.id as string, r]))
  const paths: string[] = ['']
  const writePage = async (path: string, html: string) => {
    const target = join(output, path, 'index.html')
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, html)
    paths.push(path)
  }
  const source = await readFile(join(output, 'index.html'), 'utf8')
  const assets = extractAssets(source)
  const application = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'IT Map', url: SITE_URL, description: SITE_DESCRIPTION, applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser', inLanguage: 'ru', isAccessibleForFree: true }
  const website = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'IT Map', url: SITE_URL, inLanguage: 'ru', description: SITE_DESCRIPTION }
  const rootFallback = `<div class="guide-app-placeholder"><p class="guide-brand">◎ IT Map</p><p>Интерактивная карта IT-профессий</p><a href="${base}professions/">Перейти в справочник профессий</a><noscript><p>Для интерактивной карты нужен JavaScript. Справочник доступен без него.</p></noscript></div>`
  await writeFile(join(output, 'index.html'), `<!doctype html><html lang="ru"><head>${head(SITE_TITLE, SITE_DESCRIPTION, '', base)}${jsonLd(application)}${jsonLd(website)}${assets}</head><body><div id="root">${rootFallback}</div>${homeContent(domains, base)}</body></html>`)

  const catalogCrumbs = [{ name: 'IT Map', path: '' }, { name: 'Профессии', path: 'professions/' }]
  await writePage('professions/', documentPage('IT-профессии — справочник специальностей, навыков и грейдов | IT Map', SITE_DESCRIPTION, 'professions/', catalogueBody(domains, base), base, [breadcrumbData(catalogCrumbs), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Справочник IT-профессий', url: canonical('professions/'), mainEntity: { '@type': 'ItemList', numberOfItems: roles.length, itemListElement: roles.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: canonical(rolePath(r)) })) } }]))
  for (const domain of domains) {
    const path = domainPath(domain.id)
    await writePage(path, documentPage(`${domain.name} — профессии и карьерные направления | IT Map`, `${domain.description ?? domain.name} Сравните ${domain.roles.length} профессий: задачи, навыки, грейды и карьерные пути.`, path, domainBody(domain, base), base, [breadcrumbData([{ name: 'IT Map', path: '' }, { name: 'Профессии', path: 'professions/' }, { name: domain.name, path }])]))
    for (const role of domain.roles) {
      const path = rolePath(role)
      const description = `${role.summary} Навыки, обязанности и карьерный путь в справочнике IT Map.`.slice(0, 240)
      await writePage(path, documentPage(`${role.name}: обязанности, навыки и грейды | IT Map`, description, path, roleBody(role, domain, roleMap, base), base, [breadcrumbData([{ name: 'IT Map', path: '' }, { name: domain.name, path: domainPath(domain.id) }, { name: role.name, path }]), { '@context': 'https://schema.org', '@type': 'WebPage', name: role.name, url: canonical(path), inLanguage: 'ru', about: { '@type': 'Occupation', name: role.name, description: role.summary, responsibilities: role.responsibilities.join('; '), skills: role.stack.join(', ') } }]))
    }
  }
  const about = `<div class="guide-hero"><p class="guide-kicker">О проекте</p><h1>Как устроен справочник IT Map</h1><p class="guide-lead">Открытая карта профессий помогает ориентироваться в IT, сравнивать роли и обсуждать развитие команды.</p></div><section class="guide-section"><h2>Что есть в справочнике</h2><p>${roles.length} профессий в ${domains.length} направлениях: описания задач, технологии, специализации, грейды, карьерные переходы и критерии найма. Данные хранятся в открытом репозитории проекта и доступны для проверки.</p></section><section class="guide-section"><h2>Откуда взялись данные</h2><p>Это авторский образовательный справочник, а не автоматическая выгрузка вакансий и не регулярно обновляемое исследование рынка труда. Описания обобщают типичные задачи; в конкретной компании содержание роли может отличаться.</p><p>Зарплаты, годы опыта и оценка востребованности — ориентиры внутри набора данных. У них нет подтверждённой даты актуальности или репрезентативной выборки, поэтому не используйте их как точную статистику рынка.</p></section><section class="guide-section"><h2>Как проверять ожидания</h2><ul class="guide-list"><li>Сравнивайте реальные требования нескольких работодателей в нужном регионе.</li><li>Уточняйте, указан ли доход до налогов или после, и какие выплаты входят в диапазон.</li><li>Оценивайте задачи и самостоятельность, а не только название грейда и стаж.</li><li>Проверяйте нужные рынки отдельно: пересчёт валюты не делает зарплату оценкой другого рынка.</li></ul></section><section class="guide-section"><h2>Как сообщить об ошибке</h2><p>Предложите исправление через <a href="https://github.com/daminow/itmap/issues">задачу в репозитории</a>. Укажите профессию, конкретную неточность и проверяемый источник. Код и данные доступны в <a href="https://github.com/daminow/itmap">репозитории IT Map</a>; условия использования описаны в LICENSE и LICENSE-DATA.</p></section>`
  await writePage('about/', documentPage('О данных, зарплатах и методике справочника | IT Map', 'Как пользоваться картой IT-профессий: происхождение данных, ограничения зарплатных ориентиров и способы предложить исправление.', 'about/', about, base))
  const privacy = `<div class="guide-hero"><p class="guide-kicker">Приватность</p><h1>Техническая статистика посещений</h1><p class="guide-lead">Статистика помогает понять, какие страницы справочника востребованы и где стоит улучшить проект.</p></div><section class="guide-section"><h2>Что передаёт сайт</h2><p>Счётчик Daminov Analytics передаёт путь страницы, домен источника перехода и время события. Система также получает IP-адрес, тип устройства и браузера; по IP может определяться страна и приблизительное число уникальных посетителей.</p><p>Счётчик не создаёт аналитические cookies и не хранит идентификатор посетителя в localStorage. Текст поиска, параметры URL и фрагменты после # в событие не включаются. Случайный идентификатор отдельного события нужен только для защиты от повторной записи посещения.</p></section><section class="guide-section"><h2>Настройки браузера</h2><p>Счётчик учитывает Do Not Track и Global Privacy Control. При включённом сигнале отказа событие не отправляется. Известные поисковые роботы и автоматические проверки не включаются в статистику посещений.</p></section><section class="guide-section"><h2>Вопросы по работе сайта</h2><p>О технической ошибке можно сообщить через <a href="https://github.com/daminow/itmap/issues">репозиторий проекта</a>. Не публикуйте персональные данные или секреты в открытом обсуждении.</p></section>`
  await writePage('privacy/', documentPage('Приватность и техническая статистика | IT Map', 'Какие технические данные использует счётчик посещений IT Map и как учитываются настройки приватности браузера.', 'privacy/', privacy, base))
  await writeFile(join(output, '404.html'), documentPage('Страница не найдена | IT Map', 'Проверьте адрес или найдите профессию в справочнике IT Map.', '', `<div class="guide-hero"><p class="guide-kicker">404</p><h1>Страница не найдена</h1><p class="guide-lead">Возможно, в адресе опечатка. Найдите нужную профессию в справочнике или вернитесь на карту.</p><div class="guide-actions"><a class="guide-button" href="${base}professions/">Найти профессию</a><a class="guide-link" href="${base}">На карту</a></div></div>`, base, [], 'noindex,follow'))
  await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${canonical(p)}</loc></url>`).join('')}</urlset>\n`)
  await writeFile(join(output, '.nojekyll'), '')
  const tracker = await readFile(join(output, 'analytics.js'))
  const hash = createHash('sha384').update(tracker).digest('base64')
  const version = createHash('sha256').update(tracker).digest('hex').slice(0, 12)
  const trackingTag = `<script defer src="${base}analytics.js?v=${version}" integrity="sha384-${hash}" crossorigin="anonymous" data-site="itmap.daminov.net" data-endpoint="https://analytics.daminov.net/api/collect"></script>`
  for (const path of [...paths.map((p) => join(output, p, 'index.html')), join(output, '404.html')]) {
    const html = await readFile(path, 'utf8')
    await writeFile(path, html.replace('</head>', `${trackingTag}</head>`))
  }
  console.log(`Static catalogue: ${roles.length} professions, ${domains.length} directions, ${paths.length} canonical pages.`)
}
