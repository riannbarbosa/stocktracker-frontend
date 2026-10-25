import { ApiError, api } from '../api/client.js'
import { MAX_SYMBOLS_PER_REQUEST, SYMBOL_REGEX } from '../lib/format.js'
import { useAsync } from './useAsync.js'

export const QUOTE_REFRESH_MS = 60_000

/* One bad ticker fails the whole batch: the API answers 404 when brapi does
 * not know it, 502 when brapi refuses it (brapi replies 401 for tickers outside
 * the plan, which the API reports as a provider failure) and 400 when the
 * batch exceeds its QUOTE_MAX_SYMBOLS. The batch is halved and retried, so a
 * bad ticker costs O(log n) extra requests and the rest still show up. */
const SPLITTABLE = new Set([400, 404, 502])

async function fetchChunk(symbols) {
  try {
    return { quotes: await api.quotes(symbols), missing: [] }
  } catch (error) {
    if (!(error instanceof ApiError) || !SPLITTABLE.has(error.status)) throw error
    if (symbols.length === 1) {
      if (error.status === 400 && SYMBOL_REGEX.test(symbols[0])) throw error
      return { quotes: [], missing: symbols, lastError: error }
    }
    const middle = Math.ceil(symbols.length / 2)
    const halves = await Promise.all([fetchChunk(symbols.slice(0, middle)), fetchChunk(symbols.slice(middle))])
    return {
      quotes: halves.flatMap((r) => r.quotes),
      missing: halves.flatMap((r) => r.missing),
      lastError: halves.find((r) => r.lastError)?.lastError,
    }
  }
}

export async function fetchQuotes(symbols) {
  const chunks = []
  for (let i = 0; i < symbols.length; i += MAX_SYMBOLS_PER_REQUEST) {
    chunks.push(symbols.slice(i, i + MAX_SYMBOLS_PER_REQUEST))
  }
  const results = await Promise.all(chunks.map(fetchChunk))
  /* Nothing resolved and the provider was failing: that is an outage, not a
   * list of bad tickers, so surface it as an error. */
  const outage = results.find((r) => r.lastError?.status === 502)?.lastError
  if (outage && results.every((r) => r.quotes.length === 0)) throw outage
  const bySymbol = {}
  for (const quote of results.flatMap((r) => r.quotes)) bySymbol[quote.symbol.toUpperCase()] = quote
  return { bySymbol, missing: results.flatMap((r) => r.missing), fetchedAt: new Date() }
}

export function useQuotes(symbols, options) {
  const key = symbols.join(',')
  return useAsync(
    () => (symbols.length ? fetchQuotes(symbols) : { bySymbol: {}, missing: [], fetchedAt: new Date() }),
    [key],
    { refreshMs: QUOTE_REFRESH_MS, ...options },
  )
}
