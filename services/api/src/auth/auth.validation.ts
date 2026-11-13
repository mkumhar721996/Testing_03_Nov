import { MAX_PASSWORD_LENGTH } from './auth.constants';

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Exactly one '@', a non-empty local part, and a domain with a dot that has text on both sides. */
export function isValidEmail(email: string): boolean {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || /\s/.test(email)) return false;
  const dot = domain.indexOf('.');
  return dot > 0 && !domain.endsWith('.');
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && pw.length <= MAX_PASSWORD_LENGTH && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
