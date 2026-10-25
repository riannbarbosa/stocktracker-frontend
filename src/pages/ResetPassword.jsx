import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, isValidPassword, passwordHint } from '../lib/password.js'
import { useI18n } from '../i18n/index.jsx'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import { useToast } from '../components/Toasts.jsx'


export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  /* The e-mail link carries the token in the fragment (#token=…), which the
   * browser never sends to a server. Without a link, the user pastes it. */
  const [linkToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [token, setToken] = useState(linkToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Drops the token from the address bar and history once it is in state. */
  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true })
  }, [location.hash, location.pathname, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setExpired(false)
    if (!isValidPassword(password)) {
      setError(t('password.invalid', { hint: passwordHint(t) }))
      return
    }
    if (password !== confirm) {
      setError(t('reset.mismatch'))
      return
    }
    setBusy(true)
    try {
      await resetPassword(token.trim(), password)
      toast.ok(t('reset.done'))
      navigate('/', { replace: true })
    } catch (err) {
      /* The password was checked above, so a 400 is the token: malformed,
       * expired, used or superseded — the API does not say which. */
      if (err instanceof ApiError && err.status === 400) setExpired(true)
      else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-box" onSubmit={onSubmit} noValidate>
        <AuthLogo />
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{t('reset.title')}</h3>
        <div className="muted">{t('reset.sub')}</div>

        {!linkToken && (
          <label className="field">
            <span>{t('reset.code')}</span>
            <div className="input">
              <KeyRound size={16} />
              <input autoComplete="one-time-code" required value={token} onChange={(e) => setToken(e.target.value)} maxLength={128} spellCheck={false} />
            </div>
          </label>
        )}
        <label className="field">
          <span>{t('reset.newPassword')}</span>
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
        <label className="field">
          <span>{t('reset.confirm')}</span>
          <div className="input">
            <Lock size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={MAX_PASSWORD}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </label>

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !token.trim() || !password || !confirm}>
          {busy ? t('common.wait') : t('reset.save')}
        </button>

        {expired && (
          <div className="alert-box error" role="alert">
            <TriangleAlert size={16} />
            <span>
              {t('reset.expired', { link: <Link to="/esqueci-senha" className="link">{t('reset.requestNew')}</Link> })}
            </span>
          </div>
        )}
        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          <Link to="/login" className="link">{t('forgot.back')}</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
