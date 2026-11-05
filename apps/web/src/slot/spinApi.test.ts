import { BetRejectedError, getGuestId, postSpin } from './spinApi'

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

  it('throws BetRejectedError with the server message on a 400 (AC12)', async () => {
    const message = 'Bet of 10 is more than your balance of 7.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message }) }))
    const err = await postSpin(10, 'g').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(BetRejectedError)
    expect((err as Error).message).toBe(message)
  })
})
