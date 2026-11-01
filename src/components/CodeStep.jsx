import { useState } from 'react'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { AuthLogo } from './AuthLayout.jsx'
import { useToast } from './Toasts.jsx'

/* Second step of both sign-in and sign-up: the API answered the password with
 * a challenge and e-mailed a code, which together buy the session. */
export default function CodeStep({ email, challenge, expiresIn, onResend, onBack }) {
  const { verifyCode } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      /* PublicOnly redirects as soon as the session is set. */
      await verifyCode(challenge, code.trim())
    } catch (err) {
      /* The API does not say whether the code was wrong, expired, superseded
       * or out of attempts. */
      if (err instanceof ApiError && err.status === 400) setError(t('login.badCode'))
      else setError(err.message)
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    setBusy(true)
    try {
      await onResend()
      setCode('')
      toast.ok(t('login.resent'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-box" onSubmit={onSubmit} noValidate>
      <AuthLogo />
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{t('login.codeTitle')}</h3>
      <div className="muted">{t('login.codeSub', { email, minutes: Math.round(expiresIn / 60) })}</div>

      <label className="field">
        <span>{t('login.code')}</span>
        <div className="input">
          <KeyRound size={16} />
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            required
            maxLength={6}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </label>

      <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || code.length !== 6}>
        {busy ? t('common.wait') : t('login.verify')}
      </button>

      {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontSize: 13 }}>
        <button type="button" className="link" onClick={onBack} disabled={busy}>{t('login.back')}</button>
        <button type="button" className="link" onClick={resend} disabled={busy}>{t('login.resend')}</button>
      </div>
    </form>
  )
}
