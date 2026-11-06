import { NotAdminError, fetchDayBookings, fetchSlots, fetchVisitLimits, putVisitLimit } from './capacityApi'

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', '')
  localStorage.setItem('userId', 'a1')
  localStorage.setItem('userRole', 'admin')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe('capacityApi', () => {
  it('PUTs the limit with the identity headers (AC1)', async () => {
    const row = { day: '2026-11-09', limit: 7, booked: 0, placesLeft: 7 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => row }))
    await expect(putVisitLimit('2026-11-09', 7)).resolves.toEqual(row)
    expect(fetch).toHaveBeenCalledWith(
      '/visit-limits/2026-11-09',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ limit: 7 }),
        headers: expect.objectContaining({ 'x-user-id': 'a1', 'x-user-role': 'admin' }),
      }),
    )
  })

  it('raises NotAdminError on 403 (AC7) and Error on other failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(putVisitLimit('2026-11-09', 7)).rejects.toBeInstanceOf(NotAdminError)
    await expect(fetchVisitLimits('2026-11-09', 5)).rejects.toBeInstanceOf(NotAdminError)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchSlots('2026-11-09')).rejects.toThrow('500')
  })

  it('reads days, slots and bookings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))
    await fetchVisitLimits('2026-11-09', 5)
    await fetchDayBookings('2026-11-09')
    await fetchSlots('2026-11-09')
    const urls = vi.mocked(fetch).mock.calls.map((c) => c[0])
    expect(urls).toEqual([
      '/visit-limits?from=2026-11-09&days=5',
      '/visit-limits/2026-11-09/bookings',
      '/slots/2026-11-09',
    ])
  })
})
