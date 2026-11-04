import { getGuestId, postSpin } from './spinApi'

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('spinApi', () => {
  it('POSTs the bet with the guest id header (AC4)', async () => {
    const outcome = { grid: [], bet: 1, evaluation: { totalWin: 0 }, jackpotTrigger: false }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => outcome }))
    const guestId = getGuestId()
    expect(getGuestId()).toBe(guestId)
    await expect(postSpin(1, guestId)).resolves.toEqual(outcome)
    expect(fetch).toHaveBeenCalledWith(
      '/spin',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ bet: 1 }),
        headers: expect.objectContaining({ 'x-guest-id': guestId }),
      }),
    )
  })

  it('rejects when the server answers an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(postSpin(1, 'g')).rejects.toThrow('500')
  })
})
