import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, MailCheck, Mail, TriangleAlert } from 'lucide-react'
import { ApiError, api } from '../api/client.js'
import AuthLayout, { AuthLogo } from '../components/AuthLayout.jsx'

export default function ForgotPassword() {
  const location = useLocation()
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
      else if (err instanceof ApiError && err.status === 400) setError('Informe um e-mail válido.')
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-box" onSubmit={onSubmit} noValidate>
        <AuthLogo />
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>Esqueceu a senha?</h3>
        <div className="muted">Informe o e-mail da conta e enviaremos um link para criar uma nova.</div>

        <label className="field">
          <span>E-mail</span>
          <div className="input">
            <Mail size={16} />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>
        </label>

        <button type="submit" className="btn primary block" style={{ marginTop: 22 }} disabled={busy || !email.trim()}>
          {busy ? 'Aguarde…' : sentTo ? 'Enviar de novo' : 'Enviar link'}
        </button>

        {sentTo && (
          <div className="hint" role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <MailCheck size={14} />Enviamos o link para {sentTo}. Ele chega em instantes.
          </div>
        )}
        {notFound && (
          <div className="alert-box error" role="alert">
            <TriangleAlert size={16} />
            <span>
              Não encontramos uma conta com este e-mail.{' '}
              <Link to="/login" state={{ mode: 'register', email: email.trim() }} className="link">Criar conta</Link>
            </span>
          </div>
        )}
        {error && <div className="alert-box error" role="alert"><TriangleAlert size={16} />{error}</div>}

        <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
          <Link to="/login" className="link"><ArrowLeft size={13} style={{ verticalAlign: -2 }} /> Voltar para entrar</Link>
          {' · '}
          <Link to="/redefinir-senha" className="link">Já tenho o código</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
