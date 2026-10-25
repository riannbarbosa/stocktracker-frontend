import { translate } from '../i18n/translate.js'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* Statuses whose API message is not meant for end users. */
const FRIENDLY = new Set([429, 500, 502, 503])

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
    throw new ApiError(0, translate('api.network'))
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    /* A 401 on an authenticated call means the token expired or was revoked
     * (logout-all); /auth/login answers 401 for bad credentials, which is not
     * a reason to drop the session. */
    if (response.status === 401 && sentToken && sentToken === token) onUnauthorized()
    const message = FRIENDLY.has(response.status) ? translate(`api.${response.status}`) : data?.message ?? data?.error
    throw new ApiError(response.status, message ?? translate('api.status', { status: response.status }))
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
