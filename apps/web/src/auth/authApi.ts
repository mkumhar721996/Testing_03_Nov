export type Role = 'customer' | 'technician' | 'admin'

export interface SessionUser {
  id: string
  email: string
  role: Role
}

/** The server refused the request; `message` is the server's wording. */
export class AuthRefusedError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

// The session lives in an httpOnly cookie, so the browser never sees the token.
async function call(path: string, init: { method: string; body?: unknown }): Promise<Response> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    method: init.method,
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'bounteous-web' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null
    throw new AuthRefusedError(res.status, typeof body?.message === 'string' ? body.message : `Request failed: ${res.status}`)
  }
  return res
}

export async function register(email: string, password: string): Promise<SessionUser> {
  return (await call('/auth/register', { method: 'POST', body: { email, password } })).json()
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  return (await call('/auth/sign-in', { method: 'POST', body: { email, password } })).json()
}

export async function signOut(): Promise<void> {
  await call('/auth/sign-out', { method: 'POST' })
}

/** Rejects with AuthRefusedError(401) when nobody is signed in. */
export async function fetchSession(): Promise<SessionUser> {
  return (await call('/auth/session', { method: 'GET' })).json()
}
