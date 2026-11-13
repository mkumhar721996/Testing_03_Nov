import { act, renderHook, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

const user = { id: 'u1', email: 'sam@example.com', role: 'customer' }
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

beforeEach(() => {
  sessionStorage.clear()
  vi.stubEnv('VITE_API_BASE_URL', '')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('useAuth', () => {
  it('registers, stores the token, then signs out and clears it (AC1, AC5)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ token: 't1', user })))
    const { result } = renderHook(() => useAuth())
    expect(result.current.status).toBe('signed-out')
    await act(() => result.current.register('sam@example.com', 'Passw0rd1'))
    expect(result.current.status).toBe('signed-in')
    expect(sessionStorage.getItem('auth-token')).toBe('t1')
    await act(() => result.current.signOut())
    expect(result.current.status).toBe('signed-out')
    expect(sessionStorage.getItem('auth-token')).toBeNull()
  })

  it('restores a stored session on load', async () => {
    sessionStorage.setItem('auth-token', 't1')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(user)))
    const { result } = renderHook(() => useAuth())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    expect(result.current.user).toEqual(user)
  })

  it('drops a token the server refuses', async () => {
    sessionStorage.setItem('auth-token', 'stale')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Not signed in' }) }))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(sessionStorage.getItem('auth-token')).toBeNull()
  })
})
