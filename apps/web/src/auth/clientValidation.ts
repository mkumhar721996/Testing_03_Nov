// Same rules as the server (services/api/src/auth/auth.validation.ts); the server stays the authority.
export function isValidEmail(raw: string): boolean {
  const email = raw.trim()
  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (!local || /\s/.test(email)) return false
  return domain.indexOf('.') > 0 && !domain.endsWith('.')
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
}
