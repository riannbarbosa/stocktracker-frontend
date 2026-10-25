import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlarmClock, ArrowDownRight, ArrowUpRight, ChartLine, History, Search, Star, TrendingDown, TrendingUp, X } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { useQuotes } from '../hooks/useQuotes.js'
import { useSearchHistory } from '../hooks/useSearchHistory.js'
import { MAX_SYMBOLS_PER_REQUEST, SYMBOL_REGEX, brl, compactNumber, formatDateTime, parseSymbols, signed, percent } from '../lib/format.js'
import AlertForm from '../components/AlertForm.jsx'
import { Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'
import { useI18n } from '../i18n/index.jsx'

function alertStatus(alert, t) {
  if (!alert.active) return <span className="pill x">{t('status.inactive')}</span>
  if (alert.firedAt) return <span className="pill y">{t('status.fired')}</span>
  return <span className="pill g">{t('status.watching')}</span>
}

export default function Quotes() {
  const toast = useToast()
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const symbols = parseSymbols(params.get('s') ?? '').filter((s) => SYMBOL_REGEX.test(s)).slice(0, MAX_SYMBOLS_PER_REQUEST)
  const [draft, setDraft] = useState(null)
  const [picked, setPicked] = useState(null)
  const [alertOpen, setAlertOpen] = useState(false)

  const quotes = useQuotes(symbols)
  const found = symbols.filter((s) => quotes.data?.bySymbol[s])
  const selected = found.includes(picked) ? picked : found[0] ?? null
  const input = draft ?? symbols.join(', ')
  const setInput = setDraft
  const watchlist = useAsync(() => api.watchlist())
  const alerts = useAsync(() => api.alerts())
  const { history, add: addToHistory, remove: removeFromHistory, clear: clearHistory } = useSearchHistory()

  /* Only tickers that came back with a quote are kept, so typos stay out. */
  const foundKey = found.join(',')
  useEffect(() => {
    if (foundKey) addToHistory(foundKey.split(','))
  }, [foundKey, addToHistory])

  const openSearch = (entry) => {
    setParams({ s: entry })
    setDraft(null)
  }

  const quote = selected ? quotes.data?.bySymbol[selected] : null
  const inWatchlist = (watchlist.data ?? []).some((i) => i.symbol === selected)
  const symbolAlerts = (alerts.data ?? []).filter((a) => a.symbol === selected)

  const submit = (event) => {
    event.preventDefault()
    const parsed = parseSymbols(input)
    const invalid = parsed.filter((s) => !SYMBOL_REGEX.test(s))
    if (invalid.length) return toast.error(t('common.invalidTicker', { symbols: invalid.join(', ') }))
    if (parsed.length > MAX_SYMBOLS_PER_REQUEST) return toast.error(t('quotes.searchMax', { max: MAX_SYMBOLS_PER_REQUEST }))
    setParams(parsed.length ? { s: parsed.join(',') } : {})
    setDraft(null)
  }

  const addToWatchlist = async () => {
    try {
      const item = await api.addToWatchlist(selected)
      watchlist.setData((list = []) => (list.some((i) => i.symbol === item.symbol) ? list : [...list, item]))
      toast.ok(t('common.addedToWatchlist', { symbol: selected }))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const removeFromWatchlist = async () => {
    try {
      await api.removeFromWatchlist(selected)
      watchlist.setData((list = []) => list.filter((i) => i.symbol !== selected))
      toast.ok(t('quotes.removed', { symbol: selected }))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const up = (quote?.change ?? 0) >= 0
  const span = quote && quote.dayHigh > quote.dayLow ? quote.dayHigh - quote.dayLow : null
  const position = span ? Math.min(100, Math.max(0, ((quote.price - quote.dayLow) / span) * 100)) : null

  return (
    <>
      <form className="toolbar" onSubmit={submit}>
        <div className="input full" style={{ width: '100%', maxWidth: 520 }}>
          <Search size={16} />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="PETR4, VALE3, ITUB4" aria-label={t('quotes.tickers')} maxLength={120} />
          <span className="suffix hm">{t('quotes.upTo', { max: MAX_SYMBOLS_PER_REQUEST })}</span>
        </div>
        <button type="submit" className="btn primary">{t('quotes.submit')}</button>
        {found.length > 1 && (
          <div className="chips r">
            {found.map((s) => (
              <button key={s} type="button" className={`chip${s === selected ? ' on' : ''}`} onClick={() => setPicked(s)}>{s}</button>
            ))}
          </div>
        )}
      </form>

      {history.length > 0 && (
        <div className="history">
          <span className="muted small"><History size={14} />{t('quotes.recent')}</span>
          {history.map((entry) => {
            const label = entry.split(',').join(', ')
            return (
              <span key={entry} className={`chip hchip${entry === symbols.join(',') ? ' on' : ''}`}>
                <button type="button" onClick={() => openSearch(entry)}>{label}</button>
                <button type="button" className="x" onClick={() => removeFromHistory(entry)} aria-label={t('quotes.removeSearch', { search: label })}><X size={12} /></button>
              </span>
            )
          })}
          <button type="button" className="linkbtn" onClick={clearHistory}>{t('quotes.clearHistory')}</button>
        </div>
      )}

      <ErrorBox error={quotes.error} onRetry={quotes.reload} />
      {quotes.data?.missing.length > 0 && <div className="alert-box info" style={{ marginBottom: 16 }}>{t('common.noQuote', { symbols: quotes.data.missing.join(', ') })}</div>}

      {!symbols.length ? (
        <div className="card"><Empty icon={ChartLine} title={t('quotes.emptyTitle')}>{t('quotes.emptyHint')}</Empty></div>
      ) : quotes.loading && !quotes.data ? <Loading /> : !quote ? null : (
        <div className="cols">
          <section className="card grow">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Ticker symbol={quote.symbol} name={quote.name} logoUrl={quote.logoUrl} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {inWatchlist
                  ? <button type="button" className="btn sm" onClick={removeFromWatchlist} title={t('quotes.removeFromWatchlist')} aria-label={t('quotes.removeFromWatchlist')}><Star size={14} fill="currentColor" />{t('quotes.inWatchlist')}</button>
                  : <button type="button" className="btn sm" onClick={addToWatchlist}><Star size={14} />{t('quotes.addToWatchlist')}</button>}
                <button type="button" className="btn sm primary" onClick={() => setAlertOpen(true)}><AlarmClock size={14} />{t('quotes.createAlert')}</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '16px 0 4px', flexWrap: 'wrap' }}>
              <span className="price-big">{brl(quote.price, quote.currency)}</span>
              <span className={up ? 'up' : 'down'} style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 4 }}>
                {up ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}{signed(quote.change)} ({percent(quote.changePercent)})
              </span>
            </div>
            <div className="muted small">{t('quotes.quotedAt', { when: formatDateTime(quote.time), currency: quote.currency ?? 'BRL' })}</div>

            {position != null && (
              <div style={{ marginTop: 24 }}>
                <div className="muted small" style={{ marginBottom: 8 }}>{t('quotes.dayRange')}</div>
                <div className="range"><div className="fill" style={{ width: `${position}%` }} /><div className="knob" style={{ left: `${position}%` }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="small muted">
                  <span>{t('quotes.min', { price: brl(quote.dayLow, quote.currency) })}</span><span>{t('quotes.max', { price: brl(quote.dayHigh, quote.currency) })}</span>
                </div>
              </div>
            )}
          </section>

          <div className="aside">
            <section className="card">
              <div className="h2">{t('quotes.session')}</div>
              {[
                [t('quotes.dayHigh'), brl(quote.dayHigh, quote.currency)],
                [t('quotes.dayLow'), brl(quote.dayLow, quote.currency)],
                [t('common.volume'), compactNumber(quote.volume)],
                [t('common.marketCap'), compactNumber(quote.marketCap, 'R$ ')],
                [t('quotes.currency'), quote.currency ?? '—'],
              ].map(([label, value]) => <div key={label} className="stat"><span className="muted">{label}</span><b>{value}</b></div>)}
            </section>
            <section className="card">
              <div className="h2">{t('quotes.assetAlerts')}</div>
              {symbolAlerts.length === 0 ? <div className="muted small">{t('quotes.noAlerts', { symbol: quote.symbol })}</div> : symbolAlerts.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {a.direction === 'above' ? <TrendingUp size={16} className="up" /> : <TrendingDown size={16} className="down" />}
                    {a.direction === 'above' ? t('common.above') : t('common.below')} {brl(a.targetPrice)}
                  </span>
                  {alertStatus(a, t)}
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {alertOpen && (
        <AlertForm
          initialSymbol={selected}
          onClose={() => setAlertOpen(false)}
          onCreated={(a) => { alerts.setData((list = []) => [a, ...list]); toast.ok(t('common.alertCreated', { symbol: a.symbol })) }}
        />
      )}
    </>
  )
}
