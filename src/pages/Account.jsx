import { useState } from 'react'
import { Languages, LogOut, Mail, ShieldAlert, UserRound } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { FREQUENCIES, formatDateTime } from '../lib/format.js'
import { useI18n } from '../i18n/index.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import { ErrorBox, Loading } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

function minutesLeft(expiresAt) {
  return Math.max(0, Math.round((expiresAt - Date.now()) / 60_000))
}

export default function Account() {
  const toast = useToast()
  const { t } = useI18n()
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
      toast.ok(t('account.saved'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const revokeAll = async () => {
    if (!window.confirm(t('account.confirmRevoke'))) return
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
        <div className="h2"><UserRound size={17} />{t('account.profile')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 19 }}>{session.email.slice(0, 2)}</div>
          <div className="grow">
            <b className="truncate" style={{ fontSize: 16, display: 'block' }}>{session.email}</b>
            <div className="muted" style={{ fontSize: 13 }}>{t('account.expiresIn', { minutes: minutesLeft(session.expiresAt) })}</div>
          </div>
          <button type="button" className="btn" onClick={logout}><LogOut size={15} />{t('account.logout')}</button>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="h2"><Mail size={17} />{t('account.digestTitle')}</div>
        <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>{t('account.digestSub', { email: session.email })}</p>
        <ErrorBox error={digest.error} onRetry={digest.reload} />
        {digest.loading && !digest.data ? <Loading /> : digest.data && (
          <>
            <div className="opts" role="radiogroup" aria-label={t('account.frequency')}>
              {FREQUENCIES.map((key) => (
                <button key={key} type="button" role="radio" aria-checked={choice === key} className="opt" onClick={() => setPicked(key)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="radio" /><b>{t(`frequency.${key}`)}</b></div>
                  <div className="muted small" style={{ marginTop: 6 }}>{t(`account.descriptions.${key}`)}</div>
                </button>
              ))}
            </div>
            <div className="stackm" style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>{t('account.lastSent', { when: digest.data.lastSentAt ? formatDateTime(digest.data.lastSentAt) : t('account.neverSent') })}</span>
              <button type="button" className="btn primary" style={{ marginLeft: 'auto' }} onClick={save} disabled={saving || choice === digest.data.frequency}>
                {saving ? t('account.saving') : t('account.save')}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="h2"><Languages size={17} />{t('common.language')}</div>
        <div className="stackm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="muted" style={{ fontSize: 13 }}>{t('account.languageSub')}</span>
          <div style={{ marginLeft: 'auto' }}><LanguageSwitch /></div>
        </div>
      </section>

      <section className="card" style={{ borderColor: '#5b1d22' }}>
        <div className="h2" style={{ color: '#f87171' }}><ShieldAlert size={17} />{t('account.security')}</div>
        <div className="stackm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <b>{t('account.revokeTitle')}</b>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('account.revokeSub')}</div>
          </div>
          <button type="button" className="btn danger" style={{ marginLeft: 'auto' }} onClick={revokeAll} disabled={revoking}>
            <LogOut size={15} />{t('account.revoke')}
          </button>
        </div>
      </section>
    </div>
  )
}
