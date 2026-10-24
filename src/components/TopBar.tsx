import { useEffect, useState } from 'react'
import { t } from '@/i18n/ru'
import { useITmapStore } from '@/store/useITmapStore'
import type { Market } from '@/types/taxonomy'
import { FilterBar } from '@/components/filters/FilterBar'
import { SearchBox } from '@/components/SearchBox'
import { BookOpen, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.setAttribute('data-theme', theme)
    else root.removeAttribute('data-theme')
  }, [theme])
  const isDark =
    theme === 'dark' ||
    (theme === null &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  return { isDark, toggle: () => setTheme(isDark ? 'light' : 'dark') }
}

export function TopBar() {
  const market = useITmapStore((s) => s.market)
  const setMarket = useITmapStore((s) => s.setMarket)
  const railOpen = useITmapStore((s) => s.railOpen)
  const toggleRail = useITmapStore((s) => s.toggleRail)
  const { isDark, toggle } = useTheme()

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__icon topbar__rail-toggle"
        aria-label={railOpen ? t.a11y.railHide : t.a11y.railShow}
        aria-pressed={railOpen}
        onClick={toggleRail}
      >
        {railOpen ? <PanelLeftClose size={19} aria-hidden /> : <PanelLeftOpen size={19} aria-hidden />}
      </button>
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden>
          ◎
        </span>
        <span className="topbar__name">ITmap</span>
      </div>

      <a className="topbar__catalog" href={`${import.meta.env.BASE_URL}professions/`} aria-label="Справочник IT-профессий">
        <BookOpen size={17} aria-hidden /> <span>Профессии</span>
      </a>

      <FilterBar />

      <SearchBox />

      <div className="topbar__right">
        <label className="topbar__market">
          <span className="visually-hidden">{t.a11y.marketSelect}</span>
          <select value={market} onChange={(e) => setMarket(e.target.value as Market)}>
            <option value="rub">Рынок РФ ₽</option>
            <option value="usd">Рынок US $</option>
            <option value="eur">Рынок EU €</option>
          </select>
        </label>
        <button
          type="button"
          className="topbar__icon"
          aria-label={isDark ? t.a11y.themeLight : t.a11y.themeDark}
          onClick={toggle}
        >
          {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>
      </div>
    </header>
  )
}
