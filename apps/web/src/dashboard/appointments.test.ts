import { appointmentHref, fetchAppointments, upcomingAppointments, type Appointment } from './appointments'

const now = new Date('2026-11-04T09:00:00Z')
const x: Appointment = {
  id: 'x',
  startsAt: '2026-11-05T09:00:00Z',
  endsAt: '2026-11-05T09:30:00Z',
  bookedAt: '2026-11-01T10:00:00Z',
}

describe('upcomingAppointments', () => {
  it('sorts by start time (AC1)', () => {
    const later = { ...x, id: 'later', startsAt: '2026-11-06T09:00:00Z', endsAt: '2026-11-06T09:30:00Z' }
    expect(upcomingAppointments([later, x], now).map((a) => a.id)).toEqual(['x', 'later'])
  })

  it('puts the first booked first when starts are equal (AC8)', () => {
    const r = upcomingAppointments(
      [
        { ...x, id: 'late', bookedAt: '2026-11-02T10:00:00Z' },
        { ...x, id: 'early', bookedAt: '2026-11-01T10:00:00Z' },
      ],
      now,
    )
    expect(r[0].id).toBe('early')
  })

  it('keeps an appointment that started but has not ended (AC9)', () => {
    const inProgress = { ...x, id: 'inProgress', startsAt: '2026-11-04T08:30:00Z', endsAt: '2026-11-04T09:30:00Z' }
    expect(upcomingAppointments([inProgress], now).map((a) => a.id)).toEqual(['inProgress'])
  })

  it('drops an ended appointment, including end exactly now (AC10)', () => {
    const ended = { ...x, startsAt: '2026-11-04T07:00:00Z', endsAt: '2026-11-04T08:00:00Z' }
    expect(upcomingAppointments([ended], now)).toEqual([])
    expect(upcomingAppointments([{ ...x, endsAt: now.toISOString() }], now)).toEqual([])
  })
})

describe('appointmentHref', () => {
  it('links to the detail route', () => {
    expect(appointmentHref('a 1')).toBe('#/appointments/a%201')
  })
})

describe('fetchAppointments', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [x] }))
    expect(await fetchAppointments()).toEqual([x])
  })

  it('rejects on a failed response or a non-list body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchAppointments()).rejects.toThrow()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    await expect(fetchAppointments()).rejects.toThrow()
  })
})
