import { Link } from 'react-router-dom'
import { AlarmClock, BellRing, CheckCheck, ChevronRight, Mail, Star } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { useQuotes } from '../hooks/useQuotes.js'
import { FREQUENCY_LABELS, brl, formatDateTime, formatTime, signed, timeAgo } from '../lib/format.js'
import { ChangePill, DirectionIcon, Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useUnread } from '../components/UnreadContext.jsx'
import { useToast } from '../components/Toasts.jsx'

function Kpi({ icon: Icon, label, value, sub, text, style }) {
  return (
    <div className="card kpi">
      <div className="l"><Icon size={15} />{label}</div>
      <div className={`v${text ? ' text' : ''}`} style={style}>{value}</div>
      <div className="s">{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const toast = useToast()
  const { unread, refreshUnread } = useUnread()
  const watchlist = useAsync(() => api.watchlist())
  const alerts = useAsync(() => api.alerts(), [], { refreshMs: 60_000 })
  const notifications = useAsync(() => api.notifications({ limit: 5 }), [unread], { keepPrevious: true })
  const digest = useAsync(() => api.digest())

  const symbols = (watchlist.data ?? []).map((item) => item.symbol)
  const quotes = useQuotes(symbols, { keepPrevious: true })
  const rows = symbols.map((s) => quotes.data?.bySymbol[s] ?? { symbol: s })
  const priced = rows.filter((q) => typeof q.changePercent === 'number')
  const ups = priced.filter((q) => q.changePercent >= 0).length

  const active = (alerts.data ?? []).filter((a) => a.active)
  const firedToday = active.filter((a) => a.firedAt && new Date(a.firedAt).toDateString() === new Date().toDateString()).length

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead()
      refreshUnread()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const best = priced.length ? priced.reduce((a, b) => (b.changePercent > a.changePercent ? b : a)) : null
  const worst = priced.length ? priced.reduce((a, b) => (b.changePercent < a.changePercent ? b : a)) : null

  return (
    <>
      <div className="kpis">
        <Kpi icon={Star} label="Watchlist" value={watchlist.data ? symbols.length : '—'} sub={priced.length ? `${ups} em alta · ${priced.length - ups} em queda` : 'Nenhum ticker ainda'} />
        <Kpi icon={AlarmClock} label="Alertas ativos" value={alerts.data ? active.length : '—'} sub={`${firedToday} disparado${firedToday === 1 ? '' : 's'} hoje`} />
        <Kpi icon={BellRing} label="Não lidas" value={unread} style={{ color: unread ? '#38bdf8' : undefined }} sub={notifications.data?.[0] ? `Última ${timeAgo(notifications.data[0].createdAt)}` : 'Nada por aqui'} />
        <Kpi icon={Mail} label="Resumo por e-mail" text value={digest.data ? FREQUENCY_LABELS[digest.data.frequency] : '—'} sub={digest.data?.lastSentAt ? `Último: ${formatDateTime(digest.data.lastSentAt)}` : 'Nenhum envio ainda'} />
      </div>

      <div className="cols">
        <section className="card wide">
          <div className="h2">
            Minha watchlist
            {quotes.data && <span className="muted ht small" style={{ fontWeight: 400 }}>atualizado {formatTime(quotes.data.fetchedAt)}</span>}
            <Link to="/watchlist" className="r btn sm">Ver tudo <ChevronRight size={14} /></Link>
          </div>
          <ErrorBox error={watchlist.error ?? quotes.error} onRetry={watchlist.error ? watchlist.reload : quotes.reload} />
          {watchlist.loading && !watchlist.data ? <Loading /> : symbols.length === 0 ? (
            <Empty icon={Star} title="Sua watchlist está vazia">Adicione tickers em <Link to="/watchlist" className="link">Watchlist</Link>.</Empty>
          ) : (
            <>
              <div className="table-wrap desk">
                <table>
                  <thead><tr><th>Ativo</th><th className="n">Preço</th><th className="n">Variação</th><th className="n">%</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 6).map((q) => (
                      <tr key={q.symbol}>
                        <td><Link to={`/cotacoes?s=${q.symbol}`}><Ticker symbol={q.symbol} name={q.name} logoUrl={q.logoUrl} /></Link></td>
                        <td className="n"><b>{brl(q.price, q.currency)}</b></td>
                        <td className={`n ${q.change >= 0 ? 'up' : 'down'}`}>{signed(q.change)}</td>
                        <td className="n"><ChangePill value={q.changePercent} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mob">
                {rows.slice(0, 5).map((q) => (
                  <Link key={q.symbol} to={`/cotacoes?s=${q.symbol}`} className="list-item">
                    <div className="grow"><Ticker symbol={q.symbol} name={q.name} logoUrl={q.logoUrl} /></div>
                    <div className="n"><b>{brl(q.price, q.currency)}</b><div style={{ marginTop: 3 }}><ChangePill value={q.changePercent} /></div></div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card narrow">
          <div className="h2">
            Notificações recentes
            {unread > 0 && <button type="button" className="r linkbtn" onClick={markAll}><CheckCheck size={14} />Marcar como lidas</button>}
          </div>
          <ErrorBox error={notifications.error} onRetry={notifications.reload} />
          {notifications.loading && !notifications.data ? <Loading /> : notifications.data?.length ? (
            notifications.data.slice(0, 4).map((n) => (
              <Link to="/notificacoes" key={n.id} className="list-item">
                <DirectionIcon direction={n.direction} />
                <div className="grow">
                  <b>{n.symbol}</b> {n.direction === 'above' ? 'subiu acima de' : 'caiu abaixo de'} {brl(n.targetPrice)}
                  <div className="muted small">Preço: {brl(n.price)} · {timeAgo(n.createdAt)}</div>
                </div>
                {!n.readAt && <span className="dot" style={{ background: '#38bdf8' }} aria-label="Não lida" />}
              </Link>
            ))
          ) : <Empty icon={BellRing} title="Nenhuma notificação">Elas aparecem quando um alerta dispara.</Empty>}

          {best && worst && best !== worst && (
            <div className="hm">
              <div className="h2" style={{ marginTop: 20 }}>Destaque do dia</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="card grow" style={{ padding: 12, background: 'var(--surface-2)' }}><div className="muted small">Maior alta</div><b>{best.symbol}</b> <ChangePill value={best.changePercent} /></div>
                <div className="card grow" style={{ padding: 12, background: 'var(--surface-2)' }}><div className="muted small">Maior queda</div><b>{worst.symbol}</b> <ChangePill value={worst.changePercent} /></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
