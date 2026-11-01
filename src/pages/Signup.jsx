import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, isValidPassword, passwordHint } from '../lib/password.js'
import { useI18n } from '../i18n/index.jsx'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import CodeStep from '../components/CodeStep.jsx'
import Turnstile, { captchaEnabled } from '../components/Turnstile.jsx'


export default function Signup() {
  const { login, register } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const captcha = useRef(null)
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [taken, setTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  /* Set once the account exists: { challenge, expiresIn } from the API. */
  const [pending, setPending] = useState(null)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setTaken(false)
    if (!isValidPassword(password)) {
      setError(t('password.invalid', { hint: passwordHint(t) }))
      return
    }
    setBusy(true)
    try {
      setPending(await register(email.trim(), password, captchaToken || undefined))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setTaken(true)
      else if (err instanceof ApiError && err.status === 400) setError(captchaEnabled ? t('signup.badInputOrCaptcha') : t('login.badInput'))
      else setError(err.message)
      /* The token was spent on this attempt, whatever the outcome. */
      captcha.current?.reset()
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
          /* Through login: the account exists by now, so register would
           * answer 409. */
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
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{t('login.registerTitle')}</h3>
        <div className="muted">{t('login.registerSub')}</div>

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
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? t('password.hide') : t('password.show')}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <div className="hint">{passwordHint(t)}</div>

        <Turnstile ref={captcha} onToken={setCaptchaToken} />

        <button
          type="submit"
          className="btn primary block"
          style={{ marginTop: 22 }}
          disabled={busy || !email || !password || (captchaEnabled && !captchaToken)}
        >
          {busy ? t('common.wait') : t('login.register')}
        </button>

        {taken && (
          <div className="alert-box error" role="alert">
            <TriangleAlert size={16} />
            <span>
              {t('signup.taken')}{' '}
              <Link to="/login" state={{ email: email.trim(), from: location.state?.from }} className="link">{t('login.signIn')}</Link>
            </span>
          </div>
        )}
        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          {t('login.hasAccount')}
          <Link to="/login" state={{ email: email.trim(), from: location.state?.from }} className="link">{t('login.signIn')}</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
