import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, PASSWORD_HINT, isValidPassword } from '../lib/password.js'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'
import { useToast } from '../components/Toasts.jsx'


export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const toast = useToast()
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
      setError(`A senha não atende aos requisitos. ${PASSWORD_HINT}`)
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(token.trim(), password)
      toast.ok('Senha redefinida. As outras sessões foram encerradas.')
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
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>Criar nova senha</h3>
        <div className="muted">Depois de salvar, você entra direto e as sessões abertas em outros lugares são encerradas.</div>

        {!linkToken && (
          <label className="field">
            <span>Código do e-mail</span>
            <div className="input">
              <KeyRound size={16} />
              <input autoComplete="one-time-code" required value={token} onChange={(e) => setToken(e.target.value)} maxLength={128} spellCheck={false} />
            </div>
          </label>
        )}
        <label className="field">
          <span>Nova senha</span>
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
            <button type="button" className="reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <div className="hint">{PASSWORD_HINT}</div>
        <label className="field">
          <span>Confirme a nova senha</span>
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
          {busy ? 'Aguarde…' : 'Salvar nova senha'}
        </button>

        {expired && (
          <div className="alert-box error" role="alert">
            <TriangleAlert size={16} />
            <span>
              Este link é inválido, expirou ou já foi usado. <Link to="/esqueci-senha" className="link">Peça um novo</Link>.
            </span>
          </div>
        )}
        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          <Link to="/login" className="link">Voltar para entrar</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
