const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* Statuses whose API message is not meant for end users. */
const FRIENDLY = {
  429: 'Muitas requisições. Aguarde um instante e tente de novo.',
  500: 'Erro interno da API. Tente novamente.',
  502: 'O provedor de cotações está indisponível no momento. Tente novamente em instantes.',
  503: 'A API está indisponível no momento.',
}

let token = null
let onUnauthorized = () => {}

/* Set by AuthProvider. Kept at module scope so the api functions below can be
 * called from anywhere without threading the token through props. */
export function setSession(nextToken, handleUnauthorized) {
  token = nextToken
  onUnauthorized = handleUnauthorized ?? (() => {})
}

async function request(method, path, { body, query, auth = true } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const sentToken = auth ? token : null
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API.')
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    /* A 401 on an authenticated call means the token expired or was revoked
     * (logout-all); /auth/login answers 401 for bad credentials, which is not
     * a reason to drop the session. */
    if (response.status === 401 && sentToken && sentToken === token) onUnauthorized()
    throw new ApiError(response.status, FRIENDLY[response.status] ?? data?.message ?? data?.error ?? `Erro ${response.status}`)
  }
  return data
}

export const api = {
  login: (email, password) => request('POST', '/auth/login', { body: { email, password }, auth: false }),
  register: (email, password) => request('POST', '/auth/register', { body: { email, password }, auth: false }),
  logoutAll: () => request('POST', '/auth/logout-all'),
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { body: { email }, auth: false }),
  resetPassword: (token, password) => request('POST', '/auth/reset-password', { body: { token, password }, auth: false }),

  quotes: (symbols) => request('GET', `/quotes/${symbols.map(encodeURIComponent).join(',')}`, { auth: false }),

  watchlist: () => request('GET', '/watchlist'),
  addToWatchlist: (symbol) => request('POST', '/watchlist', { body: { symbol } }),
  removeFromWatchlist: (symbol) => request('DELETE', `/watchlist/${encodeURIComponent(symbol)}`),

  alerts: () => request('GET', '/alerts'),
  createAlert: (alert) => request('POST', '/alerts', { body: alert }),
  deleteAlert: (id) => request('DELETE', `/alerts/${encodeURIComponent(id)}`),

  notifications: ({ unread = false, limit = 50 } = {}) => request('GET', '/notifications', { query: { unread, limit } }),
  markNotificationRead: (id) => request('PATCH', `/notifications/${encodeURIComponent(id)}/read`),
  markAllNotificationsRead: () => request('POST', '/notifications/read-all'),

  digest: () => request('GET', '/account/digest'),
  setDigest: (frequency) => request('PUT', '/account/digest', { body: { frequency } }),
}
