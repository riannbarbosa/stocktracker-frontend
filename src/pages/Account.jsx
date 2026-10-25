import { useState } from 'react'
import { LogOut, Mail, ShieldAlert, UserRound } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { FREQUENCY_LABELS, formatDateTime } from '../lib/format.js'
import { ErrorBox, Loading } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

const DESCRIPTIONS = {
  off: 'Nenhum e-mail de resumo',
  daily: 'Uma vez por dia',
  weekly: 'Uma vez por semana',
  monthly: 'Uma vez por mês',
}

function minutesLeft(expiresAt) {
  return Math.max(0, Math.round((expiresAt - Date.now()) / 60_000))
}

export default function Account() {
  const toast = useToast()
  const { session, logout } = useAuth()
  const digest = useAsync(() => api.digest())
  const [picked, setPicked] = useState(null)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const choice = picked ?? digest.data?.frequency

  const save = async () => {
    setSaving(true)
    try {
      digest.setData(await api.setDigest(choice))
      setPicked(null)
      toast.ok('Preferência salva.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const revokeAll = async () => {
    if (!window.confirm('Encerrar todas as sessões? Você também será desconectado deste dispositivo.')) return
    setRevoking(true)
    try {
      await api.logoutAll()
      logout()
    } catch (err) {
      toast.error(err.message)
      setRevoking(false)
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="h2"><UserRound size={17} />Perfil</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 19 }}>{session.email.slice(0, 2)}</div>
          <div className="grow">
            <b className="truncate" style={{ fontSize: 16, display: 'block' }}>{session.email}</b>
            <div className="muted" style={{ fontSize: 13 }}>Sessão expira em {minutesLeft(session.expiresAt)} min</div>
          </div>
          <button type="button" className="btn" onClick={logout}><LogOut size={15} />Sair</button>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="h2"><Mail size={17} />Resumo da watchlist por e-mail</div>
        <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>Enviamos para {session.email} a variação de cada ticker da sua watchlist desde o último resumo.</p>
        <ErrorBox error={digest.error} onRetry={digest.reload} />
        {digest.loading && !digest.data ? <Loading /> : digest.data && (
          <>
            <div className="opts" role="radiogroup" aria-label="Frequência do resumo">
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                <button key={key} type="button" role="radio" aria-checked={choice === key} className="opt" onClick={() => setPicked(key)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="radio" /><b>{label}</b></div>
                  <div className="muted small" style={{ marginTop: 6 }}>{DESCRIPTIONS[key]}</div>
                </button>
              ))}
            </div>
            <div className="stackm" style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>Último envio: {digest.data.lastSentAt ? formatDateTime(digest.data.lastSentAt) : 'nenhum ainda'}</span>
              <button type="button" className="btn primary" style={{ marginLeft: 'auto' }} onClick={save} disabled={saving || choice === digest.data.frequency}>
                {saving ? 'Salvando…' : 'Salvar preferência'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card" style={{ borderColor: '#5b1d22' }}>
        <div className="h2" style={{ color: '#f87171' }}><ShieldAlert size={17} />Segurança</div>
        <div className="stackm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <b>Encerrar todas as sessões</b>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Invalida todos os tokens emitidos para sua conta, inclusive este. Use se suspeitar de vazamento.</div>
          </div>
          <button type="button" className="btn danger" style={{ marginLeft: 'auto' }} onClick={revokeAll} disabled={revoking}>
            <LogOut size={15} />Sair de todos os dispositivos
          </button>
        </div>
      </section>
    </div>
  )
}
