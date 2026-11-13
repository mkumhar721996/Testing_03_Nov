import { assignTechnician, getTechnicianOptions, listBookings, LockedError, NotAdminError, ValidationError } from './bookingsApi'

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }))

describe('bookingsApi', () => {
  it('lists bookings by assignment', async () => {
    respond(200, [])
    await listBookings('unassigned')
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/bookings?assignment=unassigned')
  })

  it('reads the technician options for a booking', async () => {
    respond(200, [])
    await getTechnicianOptions('b 1')
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/bookings/b%201/technician-options')
  })

  it('POSTs the chosen technician', async () => {
    respond(200, { booking: {}, notified: [] })
    await assignTechnician('b1', 't1')
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, { method: string; body: string }]
    expect(url).toBe('/bookings/b1/technician')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ technicianId: 't1' })
  })

  it('maps 403 to NotAdminError, 409 to LockedError and 400 to ValidationError', async () => {
    respond(403)
    await expect(assignTechnician('b1', 't1')).rejects.toBeInstanceOf(NotAdminError)
    respond(409, { message: 'locked' })
    await expect(assignTechnician('b1', 't1')).rejects.toBeInstanceOf(LockedError)
    respond(400, { message: 'Choose a different technician' })
    await expect(assignTechnician('b1', 't1')).rejects.toBeInstanceOf(ValidationError)
  })
})
