import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock, Mail, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, isValidPassword, passwordHint } from '../lib/password.js'
import { useI18n } from '../i18n/index.jsx'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import { useToast } from '../components/Toasts.jsx'


/* Second step of both sign-in and sign-up: the API answered the password with
 * a challenge and e-mailed a code, which together buy the session. */
function CodeStep({ email, challenge, expiresIn, onResend, onBack }) {
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
  /* Set once the password checked out: { challenge, expiresIn } from the API. */
  const [pending, setPending] = useState(null)

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
      setPending(await (isRegister ? register : login)(email.trim(), password))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t('login.badCredentials'))
      else if (err instanceof ApiError && err.status === 409) setError(t('login.taken'))
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
          /* Through login even after sign-up: the account exists by now, so
           * register would answer 409. */
          onResend={async () => setPending(await login(email.trim(), password))}
          onBack={() => {
            setPending(null)
            if (isRegister) switchMode('login')
          }}
        />
      </AuthLayout>
    )
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
