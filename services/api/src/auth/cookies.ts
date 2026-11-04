import { SESSION_COOKIE } from './auth.config';

export interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
  ip?: string;
}

export interface HttpResponse {
  setHeader(name: string, value: string): unknown;
}

export function readCookie(header: string | string[] | undefined, name: string): string | undefined {
  const raw = Array.isArray(header) ? header.join(';') : header;
  for (const part of (raw ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function sessionTokenFrom(req: HttpRequest): string | undefined {
  return readCookie(req.headers.cookie, SESSION_COOKIE);
}

function attributes(): string {
  const secure = process.env.NODE_ENV === 'production';
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function setSessionCookie(res: HttpResponse, token: string, expiresAt: Date): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Expires=${expiresAt.toUTCString()}; ${attributes()}`,
  );
}

export function clearSessionCookie(res: HttpResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${attributes()}`,
  );
}
