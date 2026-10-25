export const MIN_PASSWORD = 8
export const MIN_PASSWORD_ANY = 15
export const MAX_PASSWORD = 256

export function passwordHint(t) {
  return t('password.hint', { any: MIN_PASSWORD_ANY, min: MIN_PASSWORD })
}

/* Same rule as the API: long enough on its own, or shorter with a digit and a lowercase letter. */
export function isValidPassword(password) {
  if (password.length >= MIN_PASSWORD_ANY) return true
  return password.length >= MIN_PASSWORD && /\d/.test(password) && /\p{Ll}/u.test(password)
}
