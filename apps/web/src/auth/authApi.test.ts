import { AuthRefusedError, fetchSession, register, signIn, signOut } from './authApi'

const user = { id: 'u1', email: 'sam@example.com', role: 'customer' }

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('authApi', () => {
  it('POSTs credentials to register and sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 't', user }) }))
    await expect(register('sam@example.com', 'Passw0rd1')).resolves.toEqual({ token: 't', user })
    await signIn('sam@example.com', 'Passw0rd1')
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/auth/register',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'sam@example.com', password: 'Passw0rd1' }) }),
    )
    expect(fetch).toHaveBeenNthCalledWith(2, '/auth/sign-in', expect.anything())
  })

  it('surfaces the server message and status on refusal (AC4, AC15)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'Registration could not be completed' }) }),
    )
    const err = await register('a@b.co', 'Passw0rd1').catch((e) => e)
    expect(err).toBeInstanceOf(AuthRefusedError)
    expect(err).toMatchObject({ message: 'Registration could not be completed', status: 409 })
  })

  it('sends the bearer token for session and sign-out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => user }))
    await expect(fetchSession('tok')).resolves.toEqual(user)
    await signOut('tok')
    expect(fetch).toHaveBeenCalledWith('/auth/session', { headers: { authorization: 'Bearer tok' } })
    expect(fetch).toHaveBeenCalledWith('/auth/sign-out', { method: 'POST', headers: { authorization: 'Bearer tok' } })
  })

  it('throws a plain error for unexpected statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))
    await expect(signIn('a@b.co', 'x')).rejects.toThrow('500')
  })
})
