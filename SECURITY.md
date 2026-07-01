# Security Policy · Политика безопасности

## Supported versions

ITmap is a continuously deployed static single-page app. Security fixes are applied to the latest
`main` branch, which is what the reference deployment at <https://itmap.daminov.net> serves. There are
no separately maintained older release lines.

| Version | Supported |
| --- | --- |
| `main` (latest) | Yes |
| older tags/commits | No |

## Reporting a vulnerability (English)

**Please do not open a public issue for security problems.**

Report privately through GitHub's built-in flow:

1. Go to the repository's **Security** tab → **Report a vulnerability**
   (<https://github.com/daminow/itmap/security/advisories/new>).
2. Describe the issue, the impact, and clear reproduction steps (a shareable URL that triggers it is
   ideal — ITmap encodes state in the URL).

What to expect:

- Acknowledgement within **72 hours**.
- An initial assessment and severity triage within **7 days**.
- Coordinated disclosure once a fix is available. Reporters who wish to be credited will be, in the
  release notes and the advisory.

## Как сообщить об уязвимости (Русский)

**Не открывайте публичный issue для проблем безопасности.**

Сообщите приватно через встроенный механизм GitHub: вкладка **Security** →
**Report a vulnerability** (<https://github.com/daminow/itmap/security/advisories/new>). Опишите суть,
влияние и шаги воспроизведения (лучше всего — ссылка с параметрами, которая воспроизводит проблему,
т.к. состояние ITmap кодируется в URL). Ответ — в течение 72 часов, первичная оценка — в течение 7 дней,
раскрытие — согласованное, после выпуска исправления. По желанию репортёр указывается в благодарностях.

## Scope

**In scope**

- Cross-site scripting (XSS), CSP bypasses, or DOM-based injection.
- Flaws in the hardened URL/search decoder (`src/lib/urlState.ts`) — e.g. prototype pollution,
  clamp/enum bypasses, unexpected state injection.
- Client-side logic bugs with a security impact.
- Vulnerable dependencies that are actually reachable in the shipped bundle.

**Out of scope**

- Accuracy of the salary/role dataset (that is a data correction — use the
  "Data correction" issue template instead).
- Denial-of-service or volumetric attacks against the demo host or its infrastructure.
- Missing security headers on third-party mirrors/forks you do not control.
- Social engineering, physical access, or issues requiring a compromised device/browser.

## Hardening already in place

ITmap ships with defence-in-depth for a static client:

- **Strict Content-Security-Policy** ([`public/_headers`](public/_headers)) — `script-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'none'`,
  `upgrade-insecure-requests`. The reference deployment additionally sends **HSTS**.
- **No `dangerouslySetInnerHTML`** and no runtime HTML injection anywhere in the source — all rendered
  content is plain React text nodes.
- **Hardened untrusted-input decoder** for URL and search state: range validation, clamping, enum
  intersection, a strict parameter whitelist, and prototype-pollution guards.
- **No third-party CDNs** — icons come from `lucide-react`, the Lora font is self-hosted via
  `@fontsource`. Everything is `'self'`.
- **zod is dev/CI only** — it is dynamically imported under `import.meta.env.DEV` and an ESLint guard
  bans runtime imports, so it contributes 0 bytes to the production bundle and no validation code path
  is reachable in production.
- **No backend, no cookies, no tracking, no user data** — there is nothing to exfiltrate server-side.

## Safe harbour

Good-faith security research that respects this policy — avoids privacy violations, data destruction,
and service disruption, and gives us reasonable time to remediate before public disclosure — is welcome,
and we will not pursue or support legal action against it.
