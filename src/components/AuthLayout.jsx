import { AlarmClock, ChartCandlestick, ChartLine, Mail } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'
import LanguageSwitch from './LanguageSwitch.jsx'

/* Shared by every signed-out page: the hero on the left (hidden on mobile) and
 * the form column on the right. */
export default function AuthLayout({ children }) {
  const { t } = useI18n()
  return (
    <div className="auth">
      <section className="hero">
        <div className="brand" style={{ padding: 0 }}><div className="logo"><ChartCandlestick size={18} /></div>StockTracker</div>
        <div>
          <div className="eyebrow"><span className="dot" />{t('hero.eyebrow')}</div>
          <h2>{t('hero.title', { highlight: <span className="grad">{t('hero.highlight')} <span className="nowrap">{t('hero.highlightEnd')}</span></span> })}</h2>
          <p>{t('hero.lead')}</p>
          <div className="feat">
            <div className="card"><div className="chip blue"><ChartLine size={20} /></div><b>{t('hero.quotes')}</b><div className="muted small" style={{ marginTop: 4 }}>{t('hero.quotesSub')}</div></div>
            <div className="card"><div className="chip amber"><AlarmClock size={20} /></div><b>{t('hero.alerts')}</b><div className="muted small" style={{ marginTop: 4 }}>{t('hero.alertsSub')}</div></div>
            <div className="card"><div className="chip sky"><Mail size={20} /></div><b>{t('hero.digest')}</b><div className="muted small" style={{ marginTop: 4 }}>{t('hero.digestSub')}</div></div>
          </div>
        </div>
        <div className="muted small">{t('hero.source')}</div>
      </section>

      <section className="auth-form"><LanguageSwitch className="auth-lang" />{children}</section>
    </div>
  )
}

/* The brand line the form shows in place of the hero on small screens. */
export function AuthLogo() {
  return <div className="mlogo"><div className="logo"><ChartCandlestick size={18} /></div>StockTracker</div>
}
