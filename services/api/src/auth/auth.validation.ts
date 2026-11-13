export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Exactly one '@', a non-empty local part, and a domain with a dot that is neither first nor last. */
export function isValidEmail(email: string): boolean {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || /\s/.test(email)) return false;
  return domain.indexOf('.') > 0 && !domain.endsWith('.');
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
