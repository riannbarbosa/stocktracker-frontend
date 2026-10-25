import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlarmClock, ArrowDownRight, ArrowUpRight, ChartLine, Search, Star, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { useQuotes } from '../hooks/useQuotes.js'
import { MAX_SYMBOLS_PER_REQUEST, SYMBOL_REGEX, brl, compactNumber, formatDateTime, parseSymbols, signed, percent } from '../lib/format.js'
import AlertForm from '../components/AlertForm.jsx'
import { Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

function alertStatus(alert) {
  if (!alert.active) return <span className="pill x">Inativo</span>
  if (alert.firedAt) return <span className="pill y">Disparado</span>
  return <span className="pill g">Monitorando</span>
}

export default function Quotes() {
  const toast = useToast()
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

  const quote = selected ? quotes.data?.bySymbol[selected] : null
  const inWatchlist = (watchlist.data ?? []).some((i) => i.symbol === selected)
  const symbolAlerts = (alerts.data ?? []).filter((a) => a.symbol === selected)

  const submit = (event) => {
    event.preventDefault()
    const parsed = parseSymbols(input)
    const invalid = parsed.filter((s) => !SYMBOL_REGEX.test(s))
    if (invalid.length) return toast.error(`Ticker inválido: ${invalid.join(', ')}`)
    if (parsed.length > MAX_SYMBOLS_PER_REQUEST) return toast.error(`Consulte no máximo ${MAX_SYMBOLS_PER_REQUEST} tickers por vez.`)
    setParams(parsed.length ? { s: parsed.join(',') } : {})
    setDraft(null)
  }

  const addToWatchlist = async () => {
    try {
      const item = await api.addToWatchlist(selected)
      watchlist.setData((list = []) => (list.some((i) => i.symbol === item.symbol) ? list : [...list, item]))
      toast.ok(`${selected} adicionado à watchlist.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const removeFromWatchlist = async () => {
    try {
      await api.removeFromWatchlist(selected)
      watchlist.setData((list = []) => list.filter((i) => i.symbol !== selected))
      toast.ok(`${selected} removido da watchlist.`)
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
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="PETR4, VALE3, ITUB4" aria-label="Tickers" maxLength={120} />
          <span className="suffix hm">até {MAX_SYMBOLS_PER_REQUEST} tickers</span>
        </div>
        <button type="submit" className="btn primary">Consultar</button>
        {found.length > 1 && (
          <div className="chips r">
            {found.map((s) => (
              <button key={s} type="button" className={`chip${s === selected ? ' on' : ''}`} onClick={() => setPicked(s)}>{s}</button>
            ))}
          </div>
        )}
      </form>

      <ErrorBox error={quotes.error} onRetry={quotes.reload} />
      {quotes.data?.missing.length > 0 && <div className="alert-box info" style={{ marginBottom: 16 }}>Sem cotação para: {quotes.data.missing.join(', ')} (ticker inexistente ou indisponível no provedor)</div>}

      {!symbols.length ? (
        <div className="card"><Empty icon={ChartLine} title="Consulte uma cotação">Digite um ou mais tickers da B3 separados por vírgula.</Empty></div>
      ) : quotes.loading && !quotes.data ? <Loading /> : !quote ? null : (
        <div className="cols">
          <section className="card grow">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Ticker symbol={quote.symbol} name={quote.name} logoUrl={quote.logoUrl} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {inWatchlist
                  ? <button type="button" className="btn sm" onClick={removeFromWatchlist} title="Remover da watchlist" aria-label="Remover da watchlist"><Star size={14} fill="currentColor" />Na watchlist</button>
                  : <button type="button" className="btn sm" onClick={addToWatchlist}><Star size={14} />Adicionar à watchlist</button>}
                <button type="button" className="btn sm primary" onClick={() => setAlertOpen(true)}><AlarmClock size={14} />Criar alerta</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, margin: '16px 0 4px', flexWrap: 'wrap' }}>
              <span className="price-big">{brl(quote.price, quote.currency)}</span>
              <span className={up ? 'up' : 'down'} style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 4 }}>
                {up ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}{signed(quote.change)} ({percent(quote.changePercent)})
              </span>
            </div>
            <div className="muted small">Cotação de {formatDateTime(quote.time)} · {quote.currency ?? 'BRL'}</div>

            {position != null && (
              <div style={{ marginTop: 24 }}>
                <div className="muted small" style={{ marginBottom: 8 }}>Faixa do dia</div>
                <div className="range"><div className="fill" style={{ width: `${position}%` }} /><div className="knob" style={{ left: `${position}%` }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="small muted">
                  <span>Mín {brl(quote.dayLow, quote.currency)}</span><span>Máx {brl(quote.dayHigh, quote.currency)}</span>
                </div>
              </div>
            )}
          </section>

          <div className="aside">
            <section className="card">
              <div className="h2">Resumo do pregão</div>
              {[
                ['Máxima do dia', brl(quote.dayHigh, quote.currency)],
                ['Mínima do dia', brl(quote.dayLow, quote.currency)],
                ['Volume', compactNumber(quote.volume)],
                ['Valor de mercado', compactNumber(quote.marketCap, 'R$ ')],
                ['Moeda', quote.currency ?? '—'],
              ].map(([label, value]) => <div key={label} className="stat"><span className="muted">{label}</span><b>{value}</b></div>)}
            </section>
            <section className="card">
              <div className="h2">Alertas deste ativo</div>
              {symbolAlerts.length === 0 ? <div className="muted small">Nenhum alerta para {quote.symbol}.</div> : symbolAlerts.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {a.direction === 'above' ? <TrendingUp size={16} className="up" /> : <TrendingDown size={16} className="down" />}
                    {a.direction === 'above' ? 'Acima de' : 'Abaixo de'} {brl(a.targetPrice)}
                  </span>
                  {alertStatus(a)}
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
          onCreated={(a) => { alerts.setData((list = []) => [a, ...list]); toast.ok(`Alerta criado para ${a.symbol}.`) }}
        />
      )}
    </>
  )
}
