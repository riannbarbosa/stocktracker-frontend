import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD } from '../lib/password.js'
import { useI18n } from '../i18n/index.jsx'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import CodeStep from '../components/CodeStep.jsx'


export default function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  /* Set once the password checked out: { challenge, expiresIn } from the API. */
  const [pending, setPending] = useState(null)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      setPending(await login(email.trim(), password))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t('login.badCredentials'))
      else if (err instanceof ApiError && err.status === 400) setError(t('login.badInput'))
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pending) {
    return (
      <AuthLayout>
        <CodeStep
          email={email.trim()}
          challenge={pending.challenge}
          expiresIn={pending.expiresIn}
          onResend={async () => setPending(await login(email.trim(), password))}
          onBack={() => setPending(null)}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form className="auth-box" onSubmit={onSubmit} noValidate>
        <AuthLogo />
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{t('login.signInTitle')}</h3>
        <div className="muted">{t('login.signInSub')}</div>

        <label className="field">
          <span>{t('common.email')}</span>
          <div className="input">
            <Mail size={16} />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>
        </label>
        <label className="field">
          <span>{t('login.password')}</span>
          <div className="input">
            <Lock size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? t('password.hide') : t('password.show')}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <div className="small" style={{ textAlign: 'right', marginTop: 8 }}>
          <Link to="/esqueci-senha" state={{ email: email.trim() }} className="link">{t('login.forgot')}</Link>
        </div>

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !email || !password}>
          {busy ? t('common.wait') : t('login.signIn')}
        </button>

        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          {t('login.noAccount')}
          <Link to="/signup" state={{ email: email.trim(), from: location.state?.from }} className="link">{t('login.signUp')}</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
