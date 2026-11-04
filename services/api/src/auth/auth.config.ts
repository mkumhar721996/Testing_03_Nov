export const AUTH_CONFIG = 'AUTH_CONFIG';
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const SESSION_COOKIE = 'sid';

export interface AuthConfig {
  sessionAbsoluteMs: number;
  sessionIdleMs: number;
  resetLinkMs: number;
  webBaseUrl: string;
}

/** A positive number from the environment, else the fallback. */
function positive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : fallback;
}

/** The only place the auth settings are read; every default is safe when unset. */
export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  if (env.NODE_ENV === 'production' && !env.WEB_BASE_URL) {
    throw new Error('WEB_BASE_URL is required in production: reset links are built from it');
  }
  return {
    sessionAbsoluteMs: positive(env.SESSION_ABSOLUTE_HOURS, 8) * 3_600_000,
    sessionIdleMs: positive(env.SESSION_IDLE_MINUTES, 30) * 60_000,
    resetLinkMs: positive(env.RESET_LINK_MINUTES, 60) * 60_000,
    webBaseUrl: (env.WEB_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  };
}
