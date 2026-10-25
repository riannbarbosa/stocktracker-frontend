export const MIN_PASSWORD = 8
export const MIN_PASSWORD_ANY = 15
export const MAX_PASSWORD = 256

export const PASSWORD_HINT = `Mínimo de ${MIN_PASSWORD_ANY} caracteres, ou ${MIN_PASSWORD} se incluir um número e uma letra minúscula.`

/* Same rule as the API: long enough on its own, or shorter with a digit and a lowercase letter. */
export function isValidPassword(password) {
  if (password.length >= MIN_PASSWORD_ANY) return true
  return password.length >= MIN_PASSWORD && /\d/.test(password) && /\p{Ll}/u.test(password)
}
