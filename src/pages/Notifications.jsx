import { useState } from 'react'
import { BellRing, CheckCheck } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { brl, formatDateTime, percent } from '../lib/format.js'
import { DirectionIcon, Empty, ErrorBox, Loading } from '../components/ui.jsx'
import { useUnread } from '../components/UnreadContext.jsx'
import { useToast } from '../components/Toasts.jsx'

const LIMIT = 50

export default function Notifications() {
  const toast = useToast()
  const { unread, refreshUnread } = useUnread()
  const [onlyUnread, setOnlyUnread] = useState(false)
  const list = useAsync(() => api.notifications({ unread: onlyUnread, limit: LIMIT }), [onlyUnread], { refreshMs: 60_000 })

  const markRead = async (id) => {
    try {
      const updated = await api.markNotificationRead(id)
      list.setData((items = []) => (onlyUnread ? items.filter((n) => n.id !== id) : items.map((n) => (n.id === id ? updated : n))))
      refreshUnread()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const markAll = async () => {
    try {
      const { updated } = await api.markAllNotificationsRead()
      toast.ok(updated ? `${updated} marcada${updated === 1 ? '' : 's'} como lida${updated === 1 ? '' : 's'}.` : 'Nada para marcar.')
      list.reload({ silent: true })
      refreshUnread()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          <button type="button" className={`chip${!onlyUnread ? ' on' : ''}`} onClick={() => setOnlyUnread(false)}>Todas</button>
          <button type="button" className={`chip${onlyUnread ? ' on' : ''}`} onClick={() => setOnlyUnread(true)}>Não lidas ({unread})</button>
        </div>
        <button type="button" className="btn r" onClick={markAll} disabled={!unread}><CheckCheck size={16} />Marcar todas como lidas</button>
      </div>

      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? <Loading /> : !list.data?.length ? (
        <div className="card"><Empty icon={BellRing} title={onlyUnread ? 'Tudo lido por aqui' : 'Nenhuma notificação'}>Elas aparecem quando um alerta dispara.</Empty></div>
      ) : (
        <section className="card flush">
          {list.data.map((n) => (
            <div key={n.id} className={`notif${n.readAt ? '' : ' unread'}`}>
              <span className="dot" style={{ background: n.readAt ? 'transparent' : '#38bdf8' }} />
              <DirectionIcon direction={n.direction} size={18} />
              <div className="grow">
                <div><b>{n.symbol}</b> {n.direction === 'above' ? 'subiu acima do alvo de' : 'caiu abaixo do alvo de'} <b>{brl(n.targetPrice)}</b></div>
                <div className="muted small" style={{ marginTop: 3 }}>
                  Preço no disparo: {brl(n.price)}
                  <span className="hm"> · {percent(((n.price - n.targetPrice) / n.targetPrice) * 100)} do alvo</span>
                  <span className="mob">{formatDateTime(n.createdAt)}</span>
                </div>
              </div>
              <div className="when">{formatDateTime(n.createdAt)}</div>
              {n.readAt
                ? <span className="muted small hm" style={{ width: 92, textAlign: 'center' }}>Lida</span>
                : <button type="button" className="btn sm" onClick={() => markRead(n.id)} aria-label={`Marcar notificação de ${n.symbol} como lida`}><CheckCheck size={14} /><span className="hm">Marcar como lida</span></button>}
            </div>
          ))}
        </section>
      )}
      {list.data?.length === LIMIT && <div className="muted small" style={{ marginTop: 12 }}>Exibindo as {LIMIT} mais recentes.</div>}
    </>
  )
}
