import { useEffect, useRef } from 'react'
import { useITmapStore } from '@/store/useITmapStore'
import { useIndex } from '@/hooks/useIndex'
import { displayBand, formatSalary, FX_DATE, MARKET_LABEL } from '@/lib/currency'
import { ROLE_TYPE_LABEL } from '@/lib/labels'
import { DemandBadge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { t } from '@/i18n/ru'
import type { Market, RoleId } from '@/types/taxonomy'
import { ArrowRight, X } from 'lucide-react'

export function DetailPanel({ onClose }: { onClose?: () => void }) {
  const index = useIndex()
  const selectedRoleId = useITmapStore((s) => s.selectedRoleId)
  const market = useITmapStore((s) => s.market)
  const setMarket = useITmapStore((s) => s.setMarket)
  const selectRole = useITmapStore((s) => s.selectRole)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const role = selectedRoleId ? index.roleById.get(selectedRoleId) : undefined

  useEffect(() => {
    if (role) headingRef.current?.focus()
  }, [role])

  if (!role) {
    const top = [...index.flatRoles]
      .sort((a, b) => demandRank(b.demand) - demandRank(a.demand) || a.name.localeCompare(b.name, 'ru'))
      .slice(0, 3)
    return (
      <div className="panel panel--empty" role="complementary" aria-label={t.a11y.detail}>
        <p className="panel__empty-title">{t.panel.choose}</p>
        <p className="panel__empty-sub">{t.panel.chooseHint}</p>
        <p className="panel__empty-label">{t.panel.topDemand}</p>
        <div className="panel__quick">
          {top.map((r) => (
            <Chip key={r.id} onClick={() => selectRole(r.id)}>
              {r.name}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  const anyUsd = role.levels.some((b) => b.salary[market])
  const domainName = role.domainName

  return (
    <div className="panel" role="complementary" aria-labelledby="panel-heading">
      <div className="panel__head">
        <div>
          <h2 id="panel-heading" className="panel__title" tabIndex={-1} ref={headingRef}>
            {role.name}
          </h2>
          <p className="panel__meta">
            {domainName} · {ROLE_TYPE_LABEL[role.type]}
          </p>
          <div className="panel__badges">
            <DemandBadge demand={role.demand} />
          </div>
        </div>
        {onClose && (
          <button type="button" className="panel__close" aria-label={t.panel.close} onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        )}
      </div>

      <div className="panel__body">
        <section className="panel__section">
          <p className="panel__summary">{role.summary}</p>
        </section>

        <section className="panel__section">
          <div className="panel__sec-head">
            <h3>{t.panel.salaryByLevel}</h3>
            <select
              className="panel__market"
              aria-label="Рынок зарплат"
              value={market}
              onChange={(e) => setMarket(e.target.value as Market)}
            >
              <option value="rub">Рынок РФ ₽</option>
              <option value="usd">Рынок US $</option>
              <option value="eur">Рынок EU €</option>
            </select>
          </div>
          <table className="panel__salary">
            <thead>
              <tr>
                <th>{t.panel.levelCol}</th>
                <th>{t.panel.expCol}</th>
                <th>{MARKET_LABEL[market]}</th>
              </tr>
            </thead>
            <tbody>
              {role.levels.map((b) => {
                const disp = displayBand(b, market)
                return (
                  <tr key={b.level}>
                    <td>{b.level}</td>
                    <td>
                      {b.experienceYears[0]}–{b.experienceYears[1]} лет
                    </td>
                    <td className="panel__salary-val">
                      {disp.approximate ? '≈ ' : ''}
                      {formatSalary(disp.range, market)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!anyUsd && market !== 'rub' && (
            <p className="panel__note">Нет данных по этому рынку — показан ≈ пересчёт по курсу на {FX_DATE}.</p>
          )}
          {anyUsd && market !== 'rub' && (
            <p className="panel__note">Зарплаты — независимые рыночные оценки, не конвертация по курсу.</p>
          )}
        </section>

        <section className="panel__section">
          <h3>{t.panel.responsibilities}</h3>
          <ul className="panel__list">
            {role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="panel__section">
          <h3>{t.panel.whatToLookFor}</h3>
          <ul className="panel__list panel__list--hire">
            {role.whatToLookFor.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="panel__section">
          <h3>{t.panel.stack}</h3>
          <div className="panel__chips">
            {role.stack.map((s) => (
              <span key={s} className="panel__tech" lang="en">
                {s}
              </span>
            ))}
          </div>
        </section>

        {role.specializations.length > 0 && (
          <section className="panel__section">
            <h3>{t.panel.specializations}</h3>
            <div className="panel__chips">
              {role.specializations.map((s) => (
                <span key={s} className="panel__tech panel__tech--spec">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {role.growthPath && (
          <section className="panel__section">
            <h3>{t.panel.growth}</h3>
            <p className="panel__growth">{role.growthPath}</p>
          </section>
        )}

        {role.adjacentRoles.length > 0 && (
          <section className="panel__section">
            <h3>{t.panel.adjacent}</h3>
            <div className="panel__chips">
              {role.adjacentRoles.map((id) => {
                const adj = index.roleById.get(id as RoleId)
                if (!adj) return null
                return (
                  <button
                    key={id}
                    type="button"
                    className="panel__adjacent"
                    onClick={() => selectRole(id as RoleId)}
                  >
                    {adj.name}
                    <ArrowRight size={13} aria-hidden />
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function demandRank(d: string): number {
  return d === 'high' ? 3 : d === 'medium' ? 2 : 1
}
