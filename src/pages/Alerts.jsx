import { useState } from 'react'
import { AlarmClock, Info, Plus, Trash2, TrendingDown, TrendingUp, Webhook } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { brl, timeAgo } from '../lib/format.js'
import AlertForm from '../components/AlertForm.jsx'
import { DirectionPill, Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

function statusOf(alert) {
  if (!alert.active) return 'inactive'
  return alert.firedAt ? 'fired' : 'watching'
}

const STATUS = {
  watching: <span className="pill b">Monitorando</span>,
  fired: <span className="pill y">Disparado</span>,
  inactive: <span className="pill x">Inativo</span>,
}

const FILTERS = { all: 'Todos', watching: 'Monitorando', fired: 'Disparados' }

/* Only the host is shown: the path or query of a webhook often carries a secret. */
function webhookHost(url) {
  try {
    return new URL(url).host
  } catch {
    return 'webhook'
  }
}

export default function Alerts() {
  const toast = useToast()
  const alerts = useAsync(() => api.alerts(), [], { refreshMs: 60_000 })
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  const list = alerts.data ?? []
  const count = (key) => (key === 'all' ? list.length : list.filter((a) => statusOf(a) === key).length)
  const visible = list.filter((a) => filter === 'all' || statusOf(a) === filter)

  const remove = async (alert) => {
    if (!window.confirm(`Excluir o alerta de ${alert.symbol} em ${brl(alert.targetPrice)}?`)) return
    try {
      await api.deleteAlert(alert.id)
      alerts.setData((items = []) => items.filter((a) => a.id !== alert.id))
      toast.ok('Alerta excluído.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {Object.entries(FILTERS).map(([key, label]) => (
            <button key={key} type="button" className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>{label} ({count(key)})</button>
          ))}
        </div>
        <button type="button" className="btn primary r hm" onClick={() => setCreating(true)}><Plus size={16} />Novo alerta</button>
      </div>

      <section className="card">
        <ErrorBox error={alerts.error} onRetry={alerts.reload} />
        {alerts.loading && !alerts.data ? <Loading /> : visible.length === 0 ? (
          <Empty icon={AlarmClock} title={list.length ? 'Nenhum alerta neste filtro' : 'Nenhum alerta ainda'}>
            {!list.length && 'Crie um alerta para ser avisado quando um preço-alvo for atingido.'}
          </Empty>
        ) : (
          <>
            <div className="table-wrap desk">
              <table>
                <thead>
                  <tr><th>Ativo</th><th>Condição</th><th className="n">Preço-alvo</th><th className="n">Último preço</th><th>Status</th><th>Última verificação</th><th>Webhook</th><th className="n"><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id}>
                      <td><Ticker symbol={a.symbol} /></td>
                      <td><DirectionPill direction={a.direction} /></td>
                      <td className="n"><b>{brl(a.targetPrice)}</b></td>
                      <td className="n">{brl(a.lastPrice)}</td>
                      <td>{STATUS[statusOf(a)]}</td>
                      <td className="muted">{a.lastCheckedAt ? timeAgo(a.lastCheckedAt) : 'Aguardando'}</td>
                      <td className="muted small">{a.webhookUrl ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Webhook size={13} />{webhookHost(a.webhookUrl)}</span> : '—'}</td>
                      <td className="n"><button type="button" className="btn sm danger icon" onClick={() => remove(a)} aria-label={`Excluir alerta de ${a.symbol}`}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mob">
              {visible.map((a) => (
                <div key={a.id} className="list-item">
                  <div className="grow">
                    <Ticker symbol={a.symbol} />
                    <div className="muted small" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {a.direction === 'above' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {a.direction === 'above' ? 'Acima de' : 'Abaixo de'} {brl(a.targetPrice)}
                      {a.webhookUrl && <Webhook size={12} aria-label="com webhook" />}
                    </div>
                  </div>
                  {STATUS[statusOf(a)]}
                  <button type="button" className="iconbtn" onClick={() => remove(a)} aria-label={`Excluir alerta de ${a.symbol}`}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="muted small" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Um alerta disparado fica em silêncio até o preço cruzar de volta para o outro lado; então é rearmado automaticamente.</span>
        </div>
      </section>

      <button type="button" className="fab" onClick={() => setCreating(true)} aria-label="Novo alerta"><Plus size={24} /></button>

      {creating && (
        <AlertForm
          onClose={() => setCreating(false)}
          onCreated={(a) => { alerts.setData((items = []) => [a, ...items]); toast.ok(`Alerta criado para ${a.symbol}.`) }}
        />
      )}
    </>
  )
}
