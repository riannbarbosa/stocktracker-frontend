import { useCallback, useEffect, useRef, useState } from 'react'

/* Runs `load` on mount and whenever `deps` change, and again every
 * `refreshMs` while the tab is visible. Results from a superseded run are
 * dropped so a slow response cannot overwrite a newer one, and a deps change
 * clears the previous data (unless `keepPrevious`) so a new filter or search
 * never shows the old result as if it were current. */
export function useAsync(load, deps = [], { refreshMs, keepPrevious = false } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const runId = useRef(0)
  const loadRef = useRef(load)
  /* Declared before the fetch effect so it always runs first. */
  useEffect(() => { loadRef.current = load })

  const reload = useCallback(async ({ silent = false, reset = false } = {}) => {
    const id = ++runId.current
    if (reset) setState({ data: undefined, error: null, loading: true })
    else if (!silent) setState((s) => ({ ...s, loading: true }))
    try {
      const data = await loadRef.current()
      if (id === runId.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === runId.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  const first = useRef(true)
  useEffect(() => {
    reload({ reset: !first.current && !keepPrevious })
    first.current = false
  }, deps)

  useEffect(() => {
    if (!refreshMs) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') reload({ silent: true })
    }, refreshMs)
    return () => clearInterval(timer)
  }, [refreshMs, reload])

  /* A local edit supersedes any poll already in flight: that response was
   * produced before the edit and would put the old row back. */
  const setData = useCallback((update) => {
    runId.current++
    setState((s) => ({ ...s, loading: false, data: typeof update === 'function' ? update(s.data) : update }))
  }, [])

  return { ...state, reload, setData }
}
