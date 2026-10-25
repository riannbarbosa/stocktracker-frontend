import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'

const MAX_ENTRIES = 8

/* Recent quote lookups, newest first. Kept per account so a shared browser
 * does not show one user's searches to the next. Each entry is a list of
 * symbols, stored joined ("PETR4,VALE3") so equal searches dedupe. */
export function useSearchHistory() {
  const { session } = useAuth()
  const key = `stocktracker.searchHistory.${session?.email ?? ''}`
  const [history, setHistory] = useState(() => read(key))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(history))
    } catch {
      /* storage full or blocked: history just is not kept */
    }
  }, [key, history])

  const add = useCallback((symbols) => {
    if (!symbols.length) return
    const entry = symbols.join(',')
    setHistory((list) => (list[0] === entry ? list : [entry, ...list.filter((e) => e !== entry)].slice(0, MAX_ENTRIES)))
  }, [])

  const remove = useCallback((entry) => setHistory((list) => list.filter((e) => e !== entry)), [])
  const clear = useCallback(() => setHistory([]), [])

  return { history, add, remove, clear }
}

function read(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key))
    return Array.isArray(list) ? list.filter((e) => typeof e === 'string').slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}
