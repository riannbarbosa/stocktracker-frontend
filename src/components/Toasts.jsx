import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'

const ToastContext = createContext(() => {})
let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, kind = 'ok') => {
    const id = ++nextId
    setToasts((list) => [...list, { id, message, kind }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])

  const toast = useMemo(() => ({
    ok: (message) => push(message, 'ok'),
    error: (message) => push(message, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'error' ? <TriangleAlert size={16} /> : <CircleCheck size={16} className="up" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
