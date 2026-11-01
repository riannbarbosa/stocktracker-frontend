import { useEffect, useImperativeHandle, useRef } from 'react'
import { useI18n } from '../i18n/index.jsx'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/* Without a site key the widget renders nothing and the forms send no token,
 * which matches an API running without TURNSTILE_SECRET_KEY. */
// oxlint-disable-next-line react/only-export-components
export const captchaEnabled = Boolean(SITE_KEY)

let scriptPromise = null

/* Loaded once, on the first page that needs it, instead of on every page. */
function loadTurnstile() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/* Cloudflare Turnstile. Reports each token through onToken, and '' when it
 * expires or fails. A token is single use: call ref.current.reset() after
 * every submit, successful or not, to get a fresh one. */
export default function Turnstile({ onToken, ref }) {
  const { locale } = useI18n()
  const container = useRef(null)
  const widget = useRef(null)
  /* Kept in a ref so a new callback identity does not re-render the widget. */
  const report = useRef(onToken)
  useEffect(() => {
    report.current = onToken
  })

  useImperativeHandle(ref, () => ({
    reset: () => {
      report.current('')
      if (widget.current !== null) window.turnstile?.reset(widget.current)
    },
  }), [])

  useEffect(() => {
    if (!captchaEnabled) return
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return
        widget.current = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          theme: 'auto',
          language: locale.toLowerCase(),
          callback: (token) => report.current(token),
          'expired-callback': () => report.current(''),
          'error-callback': () => report.current(''),
        })
      })
      .catch(() => report.current(''))
    return () => {
      cancelled = true
      if (widget.current !== null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [locale])

  if (!captchaEnabled) return null
  return <div ref={container} style={{ marginTop: 18, minHeight: 65 }} />
}
