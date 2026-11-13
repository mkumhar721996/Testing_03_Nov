import { act, renderHook, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

const user = { id: 'u1', email: 'sam@example.com', role: 'customer' }
const res = (status: number, body?: unknown) => ({ ok: status < 400, status, json: async () => body })

afterEach(() => vi.unstubAllGlobals())

describe('useAuth', () => {
  it('starts loading, then signed-out when the server refuses the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { message: 'Unauthorized' })))
    const { result } = renderHook(() => useAuth())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(result.current.user).toBeNull()
  })

  it('is signed-in when the session cookie is accepted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(200, user)))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    expect(result.current.user).toEqual(user)
  })

  it('signs in, then signs out (AC4)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(200, user))
      .mockResolvedValueOnce(res(204))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    await act(() => result.current.signIn('sam@example.com', 'Passw0rd1'))
    expect(result.current.status).toBe('signed-in')
    await act(() => result.current.signOut())
    expect(result.current.status).toBe('signed-out')
    expect(result.current.user).toBeNull()
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })

  it('rethrows a refusal and stays signed out', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(401, { message: 'Email or password is incorrect' }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    await expect(act(() => result.current.signIn('a@b.co', 'x'))).rejects.toMatchObject({ status: 401 })
    expect(result.current.status).toBe('signed-out')
  })
})
