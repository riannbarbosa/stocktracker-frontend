import { useState } from 'react'
import { AlarmClock, Info, Plus, Trash2, TrendingDown, TrendingUp, Webhook } from 'lucide-react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks/useAsync.js'
import { brl, timeAgo } from '../lib/format.js'
import AlertForm from '../components/AlertForm.jsx'
import { DirectionPill, Empty, ErrorBox, Loading, Ticker } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'
import { useI18n } from '../i18n/index.jsx'

function statusOf(alert) {
  if (!alert.active) return 'inactive'
  return alert.firedAt ? 'fired' : 'watching'
}

const STATUS_CLASS = { watching: 'b', fired: 'y', inactive: 'x' }

const FILTERS = ['all', 'watching', 'fired']

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
  const { t } = useI18n()
  const status = (alert) => {
    const key = statusOf(alert)
    return <span className={`pill ${STATUS_CLASS[key]}`}>{t(`status.${key}`)}</span>
  }
  const alerts = useAsync(() => api.alerts(), [], { refreshMs: 60_000 })
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  const list = alerts.data ?? []
  const count = (key) => (key === 'all' ? list.length : list.filter((a) => statusOf(a) === key).length)
  const visible = list.filter((a) => filter === 'all' || statusOf(a) === filter)

  const remove = async (alert) => {
    if (!window.confirm(t('alerts.confirmDelete', { symbol: alert.symbol, price: brl(alert.targetPrice) }))) return
    try {
      await api.deleteAlert(alert.id)
      alerts.setData((items = []) => items.filter((a) => a.id !== alert.id))
      toast.ok(t('alerts.deleted'))
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {FILTERS.map((key) => (
            <button key={key} type="button" className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>{t(`alerts.${key}`)} ({count(key)})</button>
          ))}
        </div>
        <button type="button" className="btn primary r hm" onClick={() => setCreating(true)}><Plus size={16} />{t('alerts.new')}</button>
      </div>

      <section className="card">
        <ErrorBox error={alerts.error} onRetry={alerts.reload} />
        {alerts.loading && !alerts.data ? <Loading /> : visible.length === 0 ? (
          <Empty icon={AlarmClock} title={list.length ? t('alerts.emptyFilter') : t('alerts.empty')}>
            {!list.length && t('alerts.emptyHint')}
          </Empty>
        ) : (
          <>
            <div className="table-wrap desk">
              <table>
                <thead>
                  <tr><th>{t('common.asset')}</th><th>{t('alerts.condition')}</th><th className="n">{t('alerts.target')}</th><th className="n">{t('common.lastPrice')}</th><th>{t('alerts.status')}</th><th>{t('alerts.lastCheck')}</th><th>Webhook</th><th className="n"><span className="sr-only">{t('alerts.actions')}</span></th></tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id}>
                      <td><Ticker symbol={a.symbol} /></td>
                      <td><DirectionPill direction={a.direction} /></td>
                      <td className="n"><b>{brl(a.targetPrice)}</b></td>
                      <td className="n">{brl(a.lastPrice)}</td>
                      <td>{status(a)}</td>
                      <td className="muted">{a.lastCheckedAt ? timeAgo(a.lastCheckedAt) : t('alerts.pending')}</td>
                      <td className="muted small">{a.webhookUrl ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Webhook size={13} />{webhookHost(a.webhookUrl)}</span> : '—'}</td>
                      <td className="n"><button type="button" className="btn sm danger icon" onClick={() => remove(a)} aria-label={t('alerts.delete', { symbol: a.symbol })}><Trash2 size={15} /></button></td>
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
                      {a.direction === 'above' ? t('common.above') : t('common.below')} {brl(a.targetPrice)}
                      {a.webhookUrl && <Webhook size={12} aria-label={t('alerts.withWebhook')} />}
                    </div>
                  </div>
                  {status(a)}
                  <button type="button" className="iconbtn" onClick={() => remove(a)} aria-label={t('alerts.delete', { symbol: a.symbol })}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="muted small" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('alerts.rearm')}</span>
        </div>
      </section>

      <button type="button" className="fab" onClick={() => setCreating(true)} aria-label={t('alerts.new')}><Plus size={24} /></button>

      {creating && (
        <AlertForm
          onClose={() => setCreating(false)}
          onCreated={(a) => { alerts.setData((items = []) => [a, ...items]); toast.ok(t('common.alertCreated', { symbol: a.symbol })) }}
        />
      )}
    </>
  )
}
