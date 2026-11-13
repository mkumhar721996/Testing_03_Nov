import { AuthRefusedError, fetchSession, register, signIn, signOut } from './authApi'

const user = { id: 'u1', email: 'sam@example.com', role: 'customer' }
const reply = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('authApi', () => {
  it('POSTs credentials with the cookie and the CSRF header', async () => {
    vi.stubGlobal('fetch', reply(201, user))
    await expect(register('sam@example.com', 'Passw0rd')).resolves.toEqual(user)
    expect(fetch).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'sam@example.com', password: 'Passw0rd' }),
        headers: expect.objectContaining({ 'x-requested-with': 'bounteous-web' }),
      }),
    )
  })

  it('carries the server wording and status on a refusal', async () => {
    vi.stubGlobal('fetch', reply(401, { message: 'Email or password is incorrect' }))
    await expect(signIn('a@b.co', 'x')).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect',
    })
    await expect(signIn('a@b.co', 'x')).rejects.toBeInstanceOf(AuthRefusedError)
  })

  it('fetches the session with the cookie, refusing with 401 when signed out', async () => {
    vi.stubGlobal('fetch', reply(200, user))
    await expect(fetchSession()).resolves.toEqual(user)
    expect(fetch).toHaveBeenCalledWith('/auth/session', expect.objectContaining({ credentials: 'include' }))
    vi.stubGlobal('fetch', reply(401, { message: 'Unauthorized' }))
    await expect(fetchSession()).rejects.toMatchObject({ status: 401 })
  })

  it('signs out with a POST', async () => {
    vi.stubGlobal('fetch', reply(204))
    await expect(signOut()).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith('/auth/sign-out', expect.objectContaining({ method: 'POST' }))
  })
})
