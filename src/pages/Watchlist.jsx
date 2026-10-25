import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { useQuotes } from '../hooks/useQuotes.js'
import { SYMBOL_REGEX, brl, compactNumber, formatTime, signed } from '../lib/format.js'
import AlertForm from '../components/AlertForm.jsx'
import { ChangePill, Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

const FILTERS = { all: 'Todos', up: 'Em alta', down: 'Em queda' }

export default function Watchlist() {
  const toast = useToast()
  const watchlist = useAsync(() => api.watchlist())
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all')
  const [alertFor, setAlertFor] = useState(null)

  const symbols = (watchlist.data ?? []).map((item) => item.symbol).sort()
  const quotes = useQuotes(symbols, { keepPrevious: true })
  const rows = symbols
    .map((s) => quotes.data?.bySymbol[s] ?? { symbol: s })
    .filter((q) => filter === 'all' || (filter === 'up' ? q.changePercent >= 0 : q.changePercent < 0))

  const add = async (event) => {
    event.preventDefault()
    const symbol = input.trim().toUpperCase()
    if (!SYMBOL_REGEX.test(symbol)) return toast.error('Informe um ticker válido da B3 (ex.: BBDC4).')
    setAdding(true)
    try {
      /* Checked first so a typo does not end up saved on the watchlist. */
      const [quote] = await api.quotes([symbol])
      if (!quote) throw new Error(`${symbol} não encontrado.`)
      const item = await api.addToWatchlist(symbol)
      watchlist.setData((list = []) => (list.some((i) => i.symbol === item.symbol) ? list : [...list, item]))
      setInput('')
      toast.ok(`${item.symbol} adicionado à watchlist.`)
    } catch (err) {
      if (err.status === 404) toast.error(`${symbol} não foi encontrado na B3.`)
      else if (err.status === 502) toast.error(`Não foi possível obter a cotação de ${symbol}. Verifique o ticker.`)
      else toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const remove = async (symbol) => {
    if (!window.confirm(`Remover ${symbol} da watchlist?`)) return
    try {
      await api.removeFromWatchlist(symbol)
      watchlist.setData((list = []) => list.filter((i) => i.symbol !== symbol))
      toast.ok(`${symbol} removido.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const counts = symbols.length

  return (
    <>
      <div className="toolbar">
        <form className="full" style={{ display: 'flex', gap: 10 }} onSubmit={add}>
          <div className="input grow" style={{ maxWidth: 280 }}>
            <Search size={16} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ticker B3, ex.: BBDC4" aria-label="Ticker para adicionar" maxLength={9} />
          </div>
          <button type="submit" className="btn primary" disabled={adding || !input.trim()} aria-label="Adicionar ticker">
            <Plus size={16} /><span className="hm">{adding ? 'Adicionando…' : 'Adicionar ticker'}</span>
          </button>
        </form>
        <div className="chips r">
          {Object.entries(FILTERS).map(([key, label]) => (
            <button key={key} type="button" className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>
              {label}{key === 'all' ? ` (${counts})` : ''}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        <ErrorBox error={watchlist.error ?? quotes.error} onRetry={watchlist.error ? watchlist.reload : quotes.reload} />
        {quotes.data?.missing.length > 0 && (
          <div className="alert-box info">Sem cotação para: {quotes.data.missing.join(', ')} (ticker inexistente ou indisponível no provedor)</div>
        )}
        {watchlist.loading && !watchlist.data ? <Loading /> : symbols.length === 0 ? (
          <Empty icon={Star} title="Sua watchlist está vazia">Adicione um ticker acima para acompanhar a cotação.</Empty>
        ) : rows.length === 0 ? (
          <Empty title="Nenhum ativo neste filtro" />
        ) : (
          <>
            <div className="table-wrap desk">
              <table>
                <thead>
                  <tr><th>Ativo</th><th className="n">Último preço</th><th className="n">Variação</th><th className="n">Mín – Máx do dia</th><th className="n">Volume</th><th className="n">Valor de mercado</th><th className="n">Ações</th></tr>
                </thead>
                <tbody>
                  {rows.map((q) => (
                    <tr key={q.symbol}>
                      <td><Link to={`/cotacoes?s=${q.symbol}`}><Ticker symbol={q.symbol} name={q.name} logoUrl={q.logoUrl} /></Link></td>
                      <td className="n"><b>{brl(q.price, q.currency)}</b></td>
                      <td className="n"><span className={q.change >= 0 ? 'up' : 'down'} style={{ marginRight: 8 }}>{signed(q.change)}</span><ChangePill value={q.changePercent} /></td>
                      <td className="n">{brl(q.dayLow, q.currency)} – {brl(q.dayHigh, q.currency)}</td>
                      <td className="n">{compactNumber(q.volume)}</td>
                      <td className="n">{compactNumber(q.marketCap, 'R$ ')}</td>
                      <td className="n">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" className="btn sm" onClick={() => setAlertFor(q.symbol)}><AlarmClock size={14} />Alerta</button>
                          <button type="button" className="btn sm danger icon" onClick={() => remove(q.symbol)} aria-label={`Remover ${q.symbol}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mob">
              {rows.map((q) => (
                <div key={q.symbol} className="list-item">
                  <Link to={`/cotacoes?s=${q.symbol}`} className="grow"><Ticker symbol={q.symbol} name={q.name} logoUrl={q.logoUrl} /></Link>
                  <div className="n"><b>{brl(q.price, q.currency)}</b><div style={{ marginTop: 3 }}><ChangePill value={q.changePercent} /></div></div>
                  <button type="button" className="iconbtn" onClick={() => setAlertFor(q.symbol)} aria-label={`Criar alerta para ${q.symbol}`}><AlarmClock size={17} /></button>
                  <button type="button" className="iconbtn" onClick={() => remove(q.symbol)} aria-label={`Remover ${q.symbol}`}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="muted small" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          <RefreshCw size={13} />Atualizadas automaticamente a cada 60 s{quotes.data && ` · última às ${formatTime(quotes.data.fetchedAt)}`}
        </div>
      </section>

      {alertFor && (
        <AlertForm initialSymbol={alertFor} onClose={() => setAlertFor(null)} onCreated={(a) => toast.ok(`Alerta criado para ${a.symbol}.`)} />
      )}
    </>
  )
}
