import { apiUrl } from './apiFetch'
import {
  checkResetLink,
  confirmPasswordReset,
  getSession,
  requestPasswordReset,
  signIn,
  signOut,
} from './authApi'

const user = { id: 'u1', email: 'priya.raman@northwind.example', name: 'Priya Raman' }

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('authApi', () => {
  it('signs in with the cookie included (AC1)', async () => {
    const fetchMock = respond(200, user)
    await expect(signIn('priya.raman@northwind.example', 'pw')).resolves.toEqual({ ok: true, user })
    expect(fetchMock.mock.calls[0][0]).toBe(apiUrl('/auth/sign-in'))
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'priya.raman@northwind.example', password: 'pw' })
  })

  it('maps 401 to invalid and 423 to locked (AC6, AC10)', async () => {
    respond(401)
    await expect(signIn('a@b.c', 'x')).resolves.toEqual({ ok: false, reason: 'invalid' })
    respond(423)
    await expect(signIn('a@b.c', 'x')).resolves.toEqual({ ok: false, reason: 'locked' })
  })

  it('throws on a server error so the page can say so', async () => {
    respond(500)
    await expect(signIn('a@b.c', 'x')).rejects.toThrow()
  })

  it('signs out', async () => {
    const fetchMock = respond(204)
    await signOut()
    expect(fetchMock.mock.calls[0][0]).toBe(apiUrl('/auth/sign-out'))
  })

  it('returns the session user, or null on 401 (AC5)', async () => {
    respond(200, user)
    await expect(getSession()).resolves.toEqual(user)
    respond(401)
    await expect(getSession()).resolves.toBeNull()
  })

  it('requests a reset and fails on a network error status (AC13)', async () => {
    respond(202, { status: 'accepted' })
    await expect(requestPasswordReset('a@b.c')).resolves.toBeUndefined()
    respond(500)
    await expect(requestPasswordReset('a@b.c')).rejects.toThrow()
  })

  it('reports whether a reset link is usable (AC9)', async () => {
    respond(204)
    await expect(checkResetLink('t')).resolves.toBe(true)
    respond(410)
    await expect(checkResetLink('t')).resolves.toBe(false)
  })

  it('maps the confirm outcomes (AC3, AC9)', async () => {
    respond(204)
    await expect(confirmPasswordReset('t', 'new-passw0rd')).resolves.toBe('ok')
    respond(410)
    await expect(confirmPasswordReset('t', 'new-passw0rd')).resolves.toBe('invalid-link')
    respond(422)
    await expect(confirmPasswordReset('t', 'short')).resolves.toBe('weak-password')
  })
})
