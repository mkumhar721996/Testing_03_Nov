import { getGuestId } from './guestId'
import { fetchBalance } from './playerBalance'

afterEach(() => vi.unstubAllGlobals())

describe('fetchBalance', () => {
  it('sends the guest id header and returns the server balance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ balance: 37 }) })
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchBalance()).toBe(37)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/balance$/),
      expect.objectContaining({ headers: { 'x-guest-id': getGuestId() } }),
    )
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchBalance()).rejects.toThrow()
  })
})
