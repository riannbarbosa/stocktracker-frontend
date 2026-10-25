import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AlarmClock, Bell, ChartCandlestick, ChartLine, LayoutDashboard, PanelLeftClose,
  PanelLeftOpen, Search, Settings, Star,
} from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { MAX_SYMBOLS_PER_REQUEST, SYMBOL_REGEX, parseSymbols } from '../lib/format.js'
import { useI18n } from '../i18n/index.jsx'
import { useToast } from './Toasts.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { UnreadContext } from './UnreadContext.jsx'

const COLLAPSED_KEY = 'stocktracker.sidebarCollapsed'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'nav.dashboard', end: true },
  { to: '/watchlist', icon: Star, label: 'nav.watchlist', mobile: true },
  { to: '/cotacoes', icon: ChartLine, label: 'nav.quotes', mobile: true },
  { to: '/alertas', icon: AlarmClock, label: 'nav.alerts', mobile: true },
  { to: '/notificacoes', icon: Bell, label: 'nav.notifications', badge: true },
  { to: '/conta', icon: Settings, label: 'nav.account', mobile: true },
]

export default function Layout() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')
  const [query, setQuery] = useState('')
  const toast = useToast()
  const { t } = useI18n()

  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0') }, [collapsed])

  const unreadState = useAsync(() => api.notifications({ unread: true, limit: 100 }), [], { refreshMs: 60_000 })
  const unread = unreadState.data?.length ?? 0
  const { reload: reloadUnread } = unreadState
  const refreshUnread = useCallback(() => reloadUnread({ silent: true }), [reloadUnread])
  const unreadValue = useMemo(() => ({ unread, refreshUnread }), [unread, refreshUnread])

  const page = NAV.find((item) => item.to === pathname)
  const title = page ? t(page.label) : 'StockTracker'
  const badge = unread > 99 ? '99+' : String(unread)

  const onSearch = (event) => {
    event.preventDefault()
    const symbols = parseSymbols(query)
    if (!symbols.length) return
    const invalid = symbols.filter((s) => !SYMBOL_REGEX.test(s))
    if (invalid.length) return toast.error(t('common.invalidTicker', { symbols: invalid.join(', ') }))
    if (symbols.length > MAX_SYMBOLS_PER_REQUEST) return toast.error(t('nav.searchMax', { max: MAX_SYMBOLS_PER_REQUEST }))
    navigate(`/cotacoes?s=${encodeURIComponent(symbols.join(','))}`)
    setQuery('')
  }

  return (
    <UnreadContext.Provider value={unreadValue}>
      <div className={`app${collapsed ? ' collapsed' : ''}`}>
        <aside className="side">
          <div className="brand"><div className="logo"><ChartCandlestick size={18} /></div><span className="lbl">StockTracker</span></div>
          <nav className="nav" aria-label={t('nav.main')}>
            {NAV.map(({ to, icon: Icon, label: key, end, badge: hasBadge }) => {
              const label = t(key)
              return (
              <NavLink key={to} to={to} end={end} aria-label={hasBadge && unread > 0 ? t('nav.unreadLabel', { label, count: unread }) : label}>
                <Icon size={19} />
                <span className="lbl">{label}</span>
                {hasBadge && unread > 0 && <span className="badge">{badge}</span>}
                <span className="tip" aria-hidden="true">{label}</span>
              </NavLink>
              )
            })}
          </nav>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            <span className="lbl">{t('nav.collapse')}</span>
          </button>
        </aside>

        <div className="main">
          <header className="top">
            <div className="mbrand"><div className="logo"><ChartCandlestick size={16} /></div>StockTracker</div>
            <h1>{title}</h1>
            <form className="search" onSubmit={onSearch} role="search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.searchLabel')}
                maxLength={120}
              />
            </form>
            <NavLink to="/cotacoes" className="iconbtn msearch" aria-label={t('nav.search')}><Search size={20} /></NavLink>
            <NavLink to="/notificacoes" className="iconbtn" aria-label={t('nav.unreadLabel', { label: t('nav.notifications'), count: unread })}>
              <Bell size={20} />{unread > 0 && <span className="pip" />}
            </NavLink>
            <NavLink to="/conta" className="avatar" title={session?.email} aria-label={t('nav.account')}>
              {(session?.email ?? '?').slice(0, 2)}
            </NavLink>
          </header>

          <main className="content">
            <div className="ptitle">{title}</div>
            <ErrorBoundary resetKey={pathname}><Outlet /></ErrorBoundary>
          </main>
        </div>

        <nav className="bottom" aria-label={t('nav.mobile')}>
          {NAV.filter((item) => item.mobile || item.end).map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}><Icon size={21} />{t(label)}</NavLink>
          ))}
        </nav>
      </div>
    </UnreadContext.Provider>
  )
}
