const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' })
const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const isNum = (value) => typeof value === 'number' && Number.isFinite(value)

export function brl(value, currencyCode = 'BRL') {
  if (!isNum(value)) return '—'
  if (currencyCode && currencyCode !== 'BRL') {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(value)
    } catch {
      return `${decimal.format(value)} ${currencyCode}`
    }
  }
  return currency.format(value)
}

export function signed(value) {
  if (!isNum(value)) return '—'
  return (value > 0 ? '+' : '') + decimal.format(value)
}

export function percent(value) {
  if (!isNum(value)) return '—'
  return signed(value) + '%'
}

export function compactNumber(value, prefix = '') {
  if (!isNum(value)) return '—'
  return prefix + compact.format(value)
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(iso) {
  const date = toDate(iso)
  return date ? dateTime.format(date) : '—'
}

export function formatTime(date) {
  return date ? time.format(date) : '—'
}

export function timeAgo(iso) {
  const date = toDate(iso)
  if (!date) return '—'
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']]
  let amount = seconds
  for (const [size, unit] of steps) {
    if (Math.abs(amount) < size) return relative.format(Math.round(amount), unit)
    amount /= size
  }
  return dateTime.format(date)
}

/* Mirrors SYMBOL_PATTERN in stocktracker-api/src/lib/symbols.ts. */
export const SYMBOL_REGEX = /^[A-Za-z]{2,6}[0-9]{0,2}[Ff]?$/
export const MAX_SYMBOLS_PER_REQUEST = 10

export function parseSymbols(raw) {
  const seen = new Set()
  for (const part of raw.split(/[\s,;]+/)) {
    const symbol = part.trim().toUpperCase()
    if (symbol) seen.add(symbol)
  }
  return [...seen]
}

export const FREQUENCY_LABELS = { off: 'Desligado', daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' }
