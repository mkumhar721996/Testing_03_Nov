import { afterEach, describe, expect, it, vi } from 'vitest'
import { claimTopUp, startGuestSession } from './guest-session'

const view = { balance: 1000, startingBalance: 1000, resumed: false, canClaimTopUp: false }

afterEach(() => vi.unstubAllGlobals())

describe('guest session api client', () => {
  it('starts a session with same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => view })
    vi.stubGlobal('fetch', fetchMock)
    expect(await startGuestSession()).toEqual(view)
    expect(fetchMock).toHaveBeenCalledWith('/api/guest-sessions', {
      method: 'POST',
      credentials: 'same-origin',
    })
  })

  it('claims a top-up with same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => view })
    vi.stubGlobal('fetch', fetchMock)
    await claimTopUp()
    expect(fetchMock).toHaveBeenCalledWith('/api/guest-sessions/current/top-up', {
      method: 'POST',
      credentials: 'same-origin',
    })
  })

  it('throws when the server answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409 }))
    await expect(claimTopUp()).rejects.toThrow()
  })
})
