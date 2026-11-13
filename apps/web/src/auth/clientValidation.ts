// Same rules as the API; the server stays the authority.
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2 || !parts[0] || /\s/.test(trimmed)) return false
  return parts[1].indexOf('.') > 0 && !parts[1].endsWith('.')
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
}

export const EMAIL_PROBLEM = 'Enter an email address with one @ and a domain such as example.com.'
export const PASSWORD_PROBLEM = 'Password needs at least 8 characters, a letter and a digit.'
