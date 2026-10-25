import { Fragment, createElement, isValidElement } from 'react'
import ptBR from './pt-BR.js'
import en from './en.js'
import { setFormatLocale } from '../lib/format.js'

const STORAGE_KEY = 'stocktracker.locale'

export const LOCALES = { 'pt-BR': ptBR, en }
export const LOCALE_NAMES = { 'pt-BR': 'Português', en: 'English' }

function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored in LOCALES) return stored
  } catch {
    /* storage blocked: fall back to the browser language */
  }
  return (navigator.language ?? '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

let current = detectLocale()
setFormatLocale(current)

export function currentLocale() {
  return current
}

/* Set by I18nProvider. Kept at module scope so code outside React (API client,
 * auth) translates with the language the provider last rendered with. */
export function setLocaleGlobal(locale) {
  current = locale
  setFormatLocale(locale)
}

export function saveLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* not persisted, still applied for this visit */
  }
}

function lookup(locale, key) {
  return key.split('.').reduce((node, part) => node?.[part], LOCALES[locale])
}

/* `{name}` placeholders are filled from `vars`; an entry given as
 * { one, other } is picked with `vars.count`. A React element among the vars
 * (a link, say) makes the result an array of nodes instead of a string.
 * Keys missing from a locale fall back to pt-BR. */
export function format(locale, key, vars = {}) {
  let entry = lookup(locale, key) ?? lookup('pt-BR', key)
  if (entry && typeof entry === 'object') entry = entry[new Intl.PluralRules(locale).select(vars.count ?? 0)] ?? entry.other
  if (typeof entry !== 'string') return key
  const parts = entry.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? vars[part] ?? `{${part}}` : part))
  if (!parts.some(isValidElement)) return parts.join('')
  return parts.map((part, i) => createElement(Fragment, { key: i }, part))
}

export function translate(key, vars) {
  return format(current, key, vars)
}
