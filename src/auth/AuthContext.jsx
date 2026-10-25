import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setSession } from '../api/client.js'

const STORAGE_KEY = 'stocktracker.session'
const AuthContext = createContext(null)

/* Reads the payload only to show the e-mail and schedule the expiry; the API
 * verifies the signature on every call, so nothing here is trusted for access. */
function decodePayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      [...atob(part)].map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function sessionFrom(token, expiresIn) {
  const payload = decodePayload(token)
  if (!payload) return null
  const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + expiresIn * 1000
  return { token, email: payload.email ?? '', expiresAt }
}

function loadStored() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (session?.token && session.expiresAt > Date.now()) return session
  } catch {
    /* corrupted entry: fall through and clear it */
  }
  localStorage.removeItem(STORAGE_KEY)
  return null
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(loadStored)

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSessionState(null)
  }, [])

  /* Synchronous so the very first request after a render already carries it. */
  setSession(session?.token ?? null, logout)

  useEffect(() => {
    if (!session) return
    /* setTimeout fires immediately for delays above 2^31-1 ms (~24.8 days),
     * so a long-lived token is re-checked instead of logged out at once. */
    const MAX_DELAY = 2_147_483_647
    const remaining = session.expiresAt - Date.now()
    const timer = remaining > MAX_DELAY
      ? setTimeout(() => setSessionState(loadStored()), MAX_DELAY)
      : setTimeout(logout, Math.max(0, remaining))
    return () => clearTimeout(timer)
  }, [session, logout])

  /* Logging out in one tab logs out the others. */
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setSessionState(loadStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const start = useCallback(({ token, expiresIn }) => {
    const next = sessionFrom(token, expiresIn)
    if (!next) throw new Error('Token inválido recebido da API.')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSessionState(next)
  }, [])

  const value = useMemo(() => ({
    session,
    login: async (email, password) => start(await api.login(email, password)),
    register: async (email, password) => start(await api.register(email, password)),
    /* The API revokes every older token on reset and returns a fresh one, so
     * this replaces whatever session the tab had. */
    resetPassword: async (token, password) => start(await api.resetPassword(token, password)),
    logout,
  }), [session, start, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
