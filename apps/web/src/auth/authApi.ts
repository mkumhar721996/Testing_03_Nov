export type Role = 'customer' | 'technician' | 'admin'

export interface SessionUser {
  id: string
  email: string
  role: Role
}

export interface AuthResult {
  token: string
  user: SessionUser
}

/** The server refused the request; the message is the server's wording. */
export class AuthRefusedError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

const url = (path: string) => `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/auth/${path}`

async function refusal(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null
  if ([400, 401, 409, 429].includes(res.status) && typeof body?.message === 'string') {
    return new AuthRefusedError(body.message, res.status)
  }
  return new Error(`Request failed: ${res.status}`)
}

async function post(path: string, email: string, password: string): Promise<AuthResult> {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw await refusal(res)
  return (await res.json()) as AuthResult
}

export const register = (email: string, password: string) => post('register', email, password)
export const signIn = (email: string, password: string) => post('sign-in', email, password)

export async function signOut(token: string): Promise<void> {
  const res = await fetch(url('sign-out'), { method: 'POST', headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw await refusal(res)
}

export async function fetchSession(token: string): Promise<SessionUser> {
  const res = await fetch(url('session'), { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw await refusal(res)
  return (await res.json()) as SessionUser
}
