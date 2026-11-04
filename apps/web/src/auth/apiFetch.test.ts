import { apiFetch, apiUrl, setUnauthorizedHandler } from './apiFetch'

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('sends the session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    await apiFetch('/patients/me')
    expect(fetchMock.mock.calls[0][0]).toBe(apiUrl('/patients/me'))
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
  })

  it('reports a 401 and still returns the response (AC5)', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const res = await apiFetch('/patients/me')
    expect(res.status).toBe(401)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not report other failures', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await apiFetch('/patients/me')
    expect(handler).not.toHaveBeenCalled()
  })
})
