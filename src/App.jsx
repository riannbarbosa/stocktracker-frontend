import { Fragment } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { ToastProvider } from './components/Toasts.jsx'
import { I18nProvider } from './i18n/index.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Quotes from './pages/Quotes.jsx'
import Alerts from './pages/Alerts.jsx'
import Notifications from './pages/Notifications.jsx'
import Account from './pages/Account.jsx'

function RequireAuth({ children }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  /* Keyed by account: if another tab logs in as someone else, every page
   * remounts instead of showing the previous user's data. */
  return <Fragment key={session.email}>{children}</Fragment>
}

/* Only same-app paths are honoured, so a crafted state cannot send the user
 * to another origin after login. */
function safeReturnPath(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : '/'
}

/* Owns the post-login redirect: once a session exists this sends the user back
 * to where RequireAuth intercepted them. */
function PublicOnly({ children }) {
  const { session } = useAuth()
  const location = useLocation()
  return session ? <Navigate to={safeReturnPath(location.state?.from)} replace /> : children
}

export default function App() {
  return (
    <I18nProvider>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/esqueci-senha" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            {/* Not PublicOnly: the e-mail link must work even in a tab that is
              * still logged in, possibly as someone else. */}
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="cotacoes" element={<Quotes />} />
              <Route path="alertas" element={<Alerts />} />
              <Route path="notificacoes" element={<Notifications />} />
              <Route path="conta" element={<Account />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </I18nProvider>
  )
}
