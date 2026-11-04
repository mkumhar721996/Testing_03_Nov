import { apiUrl } from './apiFetch'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export type SignInResult = { ok: true; user: SessionUser } | { ok: false; reason: 'invalid' | 'locked' }
export type ConfirmResult = 'ok' | 'invalid-link' | 'weak-password'

// These calls use plain fetch, not apiFetch: a 401 here is an answer (wrong password, no session),
// not an expired session.
function call(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
}

const post = (path: string, body?: unknown) =>
  call(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const res = await post('/auth/sign-in', { email, password })
  if (res.ok) return { ok: true, user: (await res.json()) as SessionUser }
  if (res.status === 423) return { ok: false, reason: 'locked' }
  if (res.status === 401) return { ok: false, reason: 'invalid' }
  throw new Error(`Sign-in failed: ${res.status}`)
}

export async function signOut(): Promise<void> {
  await post('/auth/sign-out')
}

export async function getSession(): Promise<SessionUser | null> {
  const res = await call('/auth/session')
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Session check failed: ${res.status}`)
  return (await res.json()) as SessionUser
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await post('/auth/password-reset/request', { email })
  if (!res.ok) throw new Error(`Password reset request failed: ${res.status}`)
}

export async function checkResetLink(token: string): Promise<boolean> {
  const res = await call(`/auth/password-reset/${encodeURIComponent(token)}`)
  if (res.status === 410) return false
  if (!res.ok) throw new Error(`Reset link check failed: ${res.status}`)
  return true
}

export async function confirmPasswordReset(token: string, password: string): Promise<ConfirmResult> {
  const res = await post('/auth/password-reset/confirm', { token, password })
  if (res.ok) return 'ok'
  if (res.status === 410) return 'invalid-link'
  if (res.status === 422) return 'weak-password'
  throw new Error(`Password reset failed: ${res.status}`)
}
