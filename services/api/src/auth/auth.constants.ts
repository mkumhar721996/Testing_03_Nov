export const ROLES = ['customer', 'technician', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'session';

export const REGISTER_REFUSED = 'Registration could not be completed';
export const SIGN_IN_REFUSED = 'Email or password is incorrect';
export const SIGN_IN_LOCKED = 'Too many failed sign-in attempts for this email. Try again in 15 minutes.';
