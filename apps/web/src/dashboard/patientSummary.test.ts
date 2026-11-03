import { fetchPatientSummary } from './patientSummary'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('fetchPatientSummary', () => {
  it('builds the URL from VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'A', consultancy: null, condition: null }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchPatientSummary()).resolves.toEqual({
      name: 'A',
      consultancy: null,
      condition: null,
    })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/patients/me')
  })

  it('is same-origin relative when the base URL is unset', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchPatientSummary()
    expect(fetchMock.mock.calls[0][0]).toBe('/patients/me')
  })

  it('rejects on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchPatientSummary()).rejects.toThrow('500')
  })
})
