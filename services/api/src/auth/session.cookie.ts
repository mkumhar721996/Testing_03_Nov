import { SESSION_TTL_MS } from './auth.constants';

export interface CookieOptions {
  httpOnly: true;
  path: '/';
  secure: boolean;
  sameSite: 'none' | 'lax';
  maxAge?: number;
}

/** Production serves the web and API from separate origins over HTTPS, so the cookie must be cross-site. */
export function setCookieOptions(nodeEnv: string | undefined): CookieOptions {
  const production = nodeEnv === 'production';
  return {
    httpOnly: true,
    path: '/',
    secure: production,
    sameSite: production ? 'none' : 'lax',
    maxAge: SESSION_TTL_MS,
  };
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}
