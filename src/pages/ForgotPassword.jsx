import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, MailCheck, Mail, TriangleAlert } from 'lucide-react'
import { ApiError, api } from '../api/client.js'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import { useI18n } from '../i18n/index.jsx'

export default function ForgotPassword() {
  const location = useLocation()
  const { t } = useI18n()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotFound(false)
    setSentTo('')
    setBusy(true)
    try {
      await api.forgotPassword(email.trim())
      setSentTo(email.trim())
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else if (err instanceof ApiError && err.status === 400) setError(t('forgot.badEmail'))
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-box" onSubmit={onSubmit} noValidate>
        <AuthLogo />
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{t('forgot.title')}</h3>
        <div className="muted">{t('forgot.sub')}</div>

        <label className="field">
          <span>{t('common.email')}</span>
          <div className="input">
            <Mail size={16} />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>
        </label>

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !email.trim()}>
          {busy ? t('common.wait') : sentTo ? t('forgot.resend') : t('forgot.send')}
        </button>

        {sentTo && (
          <div className="hint" role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <MailCheck size={14} />{t('forgot.sent', { email: sentTo })}
          </div>
        )}
        {notFound && (
          <div className="alert-box error" role="alert">
            <TriangleAlert size={16} />
            <span>
              {t('forgot.notFound')}{' '}
              <Link to="/login" state={{ mode: 'register', email: email.trim() }} className="link">{t('login.register')}</Link>
            </span>
          </div>
        )}
        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          <Link to="/login" className="link"><ArrowLeft size={13} style={{ verticalAlign: -2 }} /> {t('forgot.back')}</Link>
          {' · '}
          <Link to="/redefinir-senha" className="link">{t('forgot.haveCode')}</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
