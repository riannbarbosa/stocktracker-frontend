import { useI18n } from '../i18n/index.jsx'
import { LOCALE_NAMES } from '../i18n/translate.js'

export default function LanguageSwitch({ className = '' }) {
  const { t, locale, setLocale } = useI18n()
  return (
    <div className={`seg ${className}`} role="group" aria-label={t('common.language')}>
      {Object.entries(LOCALE_NAMES).map(([key, name]) => (
        <button key={key} type="button" lang={key} aria-pressed={locale === key} onClick={() => setLocale(key)}>{name}</button>
      ))}
    </div>
  )
}
