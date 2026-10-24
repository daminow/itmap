import { describe, expect, it } from 'vitest'
import { domains } from '@/data/registry'
import { domainPath, mapLink, rolePath } from '@/lib/seoPaths'
import { canonical, escapeHtml, jsonLd, roleBody, catalogueBody } from './render'

describe('public profession pages', () => {
  it('has stable distinct URLs for every profession and valid map deep links', () => {
    const roles = domains.flatMap((d) => d.roles)
    const paths = roles.map(rolePath)
    expect(new Set(paths).size).toBe(roles.length)
    for (const role of roles) {
      expect(rolePath(role)).toMatch(/^professions\/[a-z0-9-]+\/[a-z0-9-]+\/$/)
      expect(mapLink('/itmap/', role)).toBe(`/itmap/?sel=${encodeURIComponent(role.id)}`)
      expect(canonical(rolePath(role))).toMatch(/^https:\/\/daminow.github.io\/itmap\/professions\//)
    }
    expect(domainPath('frontend')).toBe('directions/frontend/')
  })

  it('escapes authored text and JSON-LD without letting it become executable markup', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    const ld = jsonLd({ name: '</script><script>bad()</script>' })
    expect(ld.match(/<\/script>/g)).toHaveLength(1)
    expect(ld).toContain('\\u003c/script>')
  })

  it('puts real profession information and crawlable links in the HTML', () => {
    const domain = domains[0]
    const role = domain.roles[0]
    const roles = new Map(domains.flatMap((d) => d.roles).map((r) => [r.id as string, r]))
    const page = roleBody(role, domain, roles, '/itmap/')
    expect(page).toContain(`<h1>${escapeHtml(role.name)}</h1>`)
    expect(page).toContain(escapeHtml(role.responsibilities[0]))
    expect(page).toContain(escapeHtml(role.stack[0]))
    expect(page).toContain('не текущие вакансии')
    const catalogue = catalogueBody(domains, '/itmap/')
    for (const profession of roles.values()) expect(catalogue).toContain(`href="/itmap/${rolePath(profession)}"`)
  })
})
