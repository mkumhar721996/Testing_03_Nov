import { fetchPaytable } from './paytableApi'

afterEach(() => vi.unstubAllGlobals())

describe('fetchPaytable', () => {
  it('returns the parsed server paytable', async () => {
    const body = { symbols: [], rules: { wild: 'w', scatter: 's' } }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchPaytable()).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/paytable$/), expect.anything())
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchPaytable()).rejects.toThrow('Paytable failed: 500')
  })
})
