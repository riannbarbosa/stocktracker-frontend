import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LOCALES, currentLocale, format, saveLocale, setLocaleGlobal, translate } from './translate.js'

const I18nContext = createContext({ locale: currentLocale(), setLocale: () => {}, t: translate })

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(currentLocale)

  /* Synchronous so formatters and translate() already use it in this render. */
  setLocaleGlobal(locale)

  useEffect(() => { document.documentElement.lang = locale }, [locale])

  const setLocale = useCallback((next) => {
    if (!(next in LOCALES)) return
    saveLocale(next)
    setLocaleState(next)
  }, [])

  const value = useMemo(() => ({ locale, setLocale, t: (key, vars) => format(locale, key, vars) }), [locale, setLocale])

  /* Keyed by locale: components that only call the formatters (prices, dates)
   * do not read the context, so the tree is remounted to redraw them. */
  return <I18nContext.Provider value={value}><Fragment key={locale}>{children}</Fragment></I18nContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useI18n() {
  return useContext(I18nContext)
}
