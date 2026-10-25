import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, isValidPassword, passwordHint } from '../lib/password.js'
import { useI18n } from '../i18n/index.jsx'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'


export default function Login() {
  const { login, register } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  /* "Criar conta" on the forgot-password page lands here on the register tab. */
  const [mode, setMode] = useState(location.state?.mode === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (isRegister && !isValidPassword(password)) {
      setError(t('password.invalid', { hint: passwordHint(t) }))
      return
    }
    setBusy(true)
    try {
      /* PublicOnly redirects as soon as the session is set. */
      await (isRegister ? register : login)(email.trim(), password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t('login.badCredentials'))
      else if (err instanceof ApiError && err.status === 409) setError(t('login.taken'))
      else if (err instanceof ApiError && err.status === 400) setError(t('login.badInput'))
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-box" onSubmit={onSubmit} noValidate>
        <AuthLogo />
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>{t('login.signIn')}</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>{t('login.register')}</button>
        </div>
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{isRegister ? t('login.registerTitle') : t('login.signInTitle')}</h3>
        <div className="muted">{isRegister ? t('login.registerSub') : t('login.signInSub')}</div>

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
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={isRegister ? MIN_PASSWORD : undefined}
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? t('password.hide') : t('password.show')}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {isRegister && <div className="hint">{passwordHint(t)}</div>}
        {!isRegister && (
          <div className="small" style={{ textAlign: 'right', marginTop: 8 }}>
            <Link to="/esqueci-senha" state={{ email: email.trim() }} className="link">{t('login.forgot')}</Link>
          </div>
        )}

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !email || !password}>
          {busy ? t('common.wait') : isRegister ? t('login.register') : t('login.signIn')}
        </button>

        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          {isRegister ? t('login.hasAccount') : t('login.noAccount')}
          <button type="button" className="link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? t('login.signIn') : t('login.signUp')}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
