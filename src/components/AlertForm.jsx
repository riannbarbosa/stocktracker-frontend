import { useEffect, useState } from 'react'
import { Plus, TrendingDown, TrendingUp, Webhook } from 'lucide-react'
import { api } from '../api/client.js'
import { SYMBOL_REGEX, brl, percent } from '../lib/format.js'
import { Modal } from './ui.jsx'

/* pt-BR input: "36,50", "1.234,56" and "1.234" (thousands). A lone dot with
 * other than three digits after it ("36.5") is read as a decimal point. */
function parsePrice(raw) {
  const text = raw.trim().replace(/\s/g, '')
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
  const target = parsePrice(price)

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
    if (!symbolOk) return setError('Informe um ticker válido da B3 (ex.: PETR4).')
    if (!(target > 0)) return setError('Informe um preço-alvo maior que zero.')
    const hook = webhookUrl.trim()
    if (hook && !validWebhook(hook)) return setError('O webhook precisa ser uma URL https:// válida.')

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
    <Modal title="Novo alerta de preço" description="Verificado a cada minuto. Ao disparar, você recebe uma notificação no app." onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Ticker</span>
          <div className="input">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="PETR4" maxLength={9} autoCapitalize="characters" required />
            {current != null && <span className="suffix">{brl(current)} agora</span>}
          </div>
        </label>

        <div className="field">
          <span>Disparar quando o preço ficar</span>
          <div className="seg">
            <button type="button" aria-pressed={direction === 'above'} onClick={() => setDirection('above')}><TrendingUp size={16} />Acima de</button>
            <button type="button" aria-pressed={direction === 'below'} onClick={() => setDirection('below')}><TrendingDown size={16} />Abaixo de</button>
          </div>
        </div>

        <label className="field">
          <span>Preço-alvo (R$)</span>
          <div className="input"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="36,00" required /></div>
        </label>
        {distance != null && <div className="hint">{percent(distance)} em relação ao preço atual</div>}

        <label className="field">
          <span>Webhook (opcional)</span>
          <div className="input"><Webhook size={16} /><input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://…" maxLength={2048} /></div>
        </label>
        <div className="hint">Receberá um POST quando o alerta disparar. Endereços internos ou privados são recusados pela API.</div>

        {error && <div className="alert-box error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={busy}><Plus size={16} />{busy ? 'Criando…' : 'Criar alerta'}</button>
        </div>
      </form>
    </Modal>
  )
}
