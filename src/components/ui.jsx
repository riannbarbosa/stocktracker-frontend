import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Inbox, TrendingDown, TrendingUp, X } from 'lucide-react'
import { percent } from '../lib/format.js'

const LOGO_COLORS = ['#0a7a3d', '#0d6b6b', '#ec7000', '#cc092f', '#00579d', '#0086ff', '#1b3d8f', '#b59a00', '#7c3aed']

function colorFor(symbol) {
  let hash = 0
  for (const char of symbol) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length]
}

/* Only https logos are rendered: the URL comes from a third party (brapi) by
 * way of the API, so anything else falls back to the initials. */
export function TickerLogo({ symbol, logoUrl }) {
  const [failed, setFailed] = useState(false)
  const safe = typeof logoUrl === 'string' && logoUrl.startsWith('https://') && !failed
  return (
    <div className="tl" style={safe ? undefined : { background: colorFor(symbol) }} aria-hidden="true">
      {safe
        ? <img src={logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : symbol.slice(0, 2)}
    </div>
  )
}

export function Ticker({ symbol, name, logoUrl }) {
  return (
    <div className="tk">
      <TickerLogo symbol={symbol} logoUrl={logoUrl} />
      <div className="grow">
        <b>{symbol}</b>
        {name && name !== symbol && <div className="sub truncate">{name}</div>}
      </div>
    </div>
  )
}

export function ChangePill({ value }) {
  if (typeof value !== 'number') return <span className="pill x">—</span>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className={`pill ${up ? 'g' : 'r'}`}><Icon size={13} />{percent(value)}</span>
}

export function DirectionIcon({ direction, size = 16 }) {
  const above = direction === 'above'
  const Icon = above ? TrendingUp : TrendingDown
  return <div className={`dir ${above ? 'g' : 'r'}`}><Icon size={size} /></div>
}

export function DirectionPill({ direction }) {
  const above = direction === 'above'
  const Icon = above ? TrendingUp : TrendingDown
  return <span className={`pill ${above ? 'g' : 'r'}`}><Icon size={13} />{above ? 'Acima de' : 'Abaixo de'}</span>
}

export function Loading() {
  return <div className="loading" role="status"><div className="spinner" /><span className="sr-only">Carregando…</span></div>
}

export function Empty({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="empty">
      <Icon size={36} />
      <b>{title}</b>
      {children && <div className="small">{children}</div>}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="alert-box error" role="alert">
      <span className="grow">{error.message}</span>
      {onRetry && <button type="button" className="btn sm" onClick={() => onRetry()}>Tentar de novo</button>}
    </div>
  )
}

export function Modal({ title, description, onClose, children }) {
  const titleId = useId()
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const previous = document.activeElement
    ref.current?.querySelector('input, button:not([data-close]), select')?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') return onCloseRef.current()
      if (event.key !== 'Tab' || !ref.current) return
      /* Keep Tab inside the dialog. */
      const focusable = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select, [href], [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" data-close className="iconbtn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {description && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{description}</p>}
        {children}
      </div>
    </div>
  )
}
