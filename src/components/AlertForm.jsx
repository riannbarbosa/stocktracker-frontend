import { useEffect, useState } from 'react'
import { Plus, TrendingDown, TrendingUp, Webhook } from 'lucide-react'
import { api } from '../api/client.js'
import { SYMBOL_REGEX, brl, percent } from '../lib/format.js'
import { useI18n } from '../i18n/index.jsx'
import { Modal } from './ui.jsx'

/* pt-BR input: "36,50", "1.234,56" and "1.234" (thousands). A lone dot with
 * other than three digits after it ("36.5") is read as a decimal point.
 * English input uses commas only as thousands separators ("1,234.56"). */
function parsePrice(raw, locale) {
  const text = raw.trim().replace(/\s/g, '')
  if (locale !== 'pt-BR') {
    const plain = text.replace(/,/g, '')
    return /^\d+(\.\d+)?$/.test(plain) ? Number(plain) : NaN
  }
  const grouped = /^\d{1,3}(\.\d{3})+$/.test(text)
  const normalized = text.includes(',') || grouped ? text.replace(/\./g, '').replace(',', '.') : text
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN
  return Number(normalized)
}

function validWebhook(raw) {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function AlertForm({ initialSymbol = '', onClose, onCreated }) {
  const { t, locale } = useI18n()
  const [symbol, setSymbol] = useState(initialSymbol)
  const [direction, setDirection] = useState('above')
  const [price, setPrice] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [lookup, setLookup] = useState({ symbol: null, price: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cleanSymbol = symbol.trim().toUpperCase()
  const symbolOk = SYMBOL_REGEX.test(cleanSymbol)
  const current = lookup.symbol === cleanSymbol ? lookup.price : null
  const target = parsePrice(price, locale)

  /* Debounced lookup of the current price, shown as context for the target. */
  useEffect(() => {
    if (!symbolOk) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const [quote] = await api.quotes([cleanSymbol])
        if (!cancelled) setLookup({ symbol: cleanSymbol, price: quote?.price ?? null })
      } catch {
        if (!cancelled) setLookup({ symbol: cleanSymbol, price: null })
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [cleanSymbol, symbolOk])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!symbolOk) return setError(t('alertForm.invalidTicker'))
    if (!(target > 0)) return setError(t('alertForm.invalidPrice'))
    const hook = webhookUrl.trim()
    if (hook && !validWebhook(hook)) return setError(t('alertForm.invalidWebhook'))

    setBusy(true)
    try {
      const alert = await api.createAlert({ symbol: cleanSymbol, direction, targetPrice: target, webhookUrl: hook || null })
      onCreated?.(alert)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const distance = current && target > 0 ? ((target - current) / current) * 100 : null

  return (
    <Modal title={t('alertForm.title')} description={t('alertForm.description')} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>{t('alertForm.ticker')}</span>
          <div className="input">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="PETR4" maxLength={9} autoCapitalize="characters" required />
            {current != null && <span className="suffix">{t('alertForm.now', { price: brl(current) })}</span>}
          </div>
        </label>

        <div className="field">
          <span>{t('alertForm.trigger')}</span>
          <div className="seg">
            <button type="button" aria-pressed={direction === 'above'} onClick={() => setDirection('above')}><TrendingUp size={16} />{t('common.above')}</button>
            <button type="button" aria-pressed={direction === 'below'} onClick={() => setDirection('below')}><TrendingDown size={16} />{t('common.below')}</button>
          </div>
        </div>

        <label className="field">
          <span>{t('alertForm.target')}</span>
          <div className="input"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('alertForm.pricePlaceholder')} required /></div>
        </label>
        {distance != null && <div className="hint">{t('alertForm.distance', { percent: percent(distance) })}</div>}

        <label className="field">
          <span>{t('alertForm.webhook')}</span>
          <div className="input"><Webhook size={16} /><input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://…" maxLength={2048} /></div>
        </label>
        <div className="hint">{t('alertForm.webhookHint')}</div>

        {error && <div className="alert-box error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn primary" disabled={busy}><Plus size={16} />{busy ? t('alertForm.creating') : t('alertForm.create')}</button>
        </div>
      </form>
    </Modal>
  )
}
