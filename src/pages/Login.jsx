import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, TriangleAlert } from 'lucide-react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { MAX_PASSWORD, MIN_PASSWORD, PASSWORD_HINT, isValidPassword } from '../lib/password.js'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'


export default function Login() {
  const { login, register } = useAuth()
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
      setError(`A senha não atende aos requisitos. ${PASSWORD_HINT}`)
      return
    }
    setBusy(true)
    try {
      /* PublicOnly redirects as soon as the session is set. */
      await (isRegister ? register : login)(email.trim(), password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Credenciais inválidas. Verifique e tente novamente.')
      else if (err instanceof ApiError && err.status === 409) setError('Este e-mail já está cadastrado. Entre com sua senha.')
      else if (err instanceof ApiError && err.status === 400) setError('Verifique o e-mail e a senha informados.')
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
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>Entrar</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>Criar conta</button>
        </div>
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h3>
        <div className="muted">{isRegister ? 'Leva menos de um minuto.' : 'Entre com seu e-mail e senha.'}</div>

        <label className="field">
          <span>E-mail</span>
          <div className="input">
            <Mail size={16} />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>
        </label>
        <label className="field">
          <span>Senha</span>
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
            <button type="button" className="reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {isRegister && <div className="hint">{PASSWORD_HINT}</div>}
        {!isRegister && (
          <div className="small" style={{ textAlign: 'right', marginTop: 8 }}>
            <Link to="/esqueci-senha" state={{ email: email.trim() }} className="link">Esqueci minha senha</Link>
          </div>
        )}

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !email || !password}>
          {busy ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
        </button>

        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          {isRegister ? 'Já tem conta? ' : 'Não tem conta? '}
          <button type="button" className="link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Entrar' : 'Cadastre-se'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
