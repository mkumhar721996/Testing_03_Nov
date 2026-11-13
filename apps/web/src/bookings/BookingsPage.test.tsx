import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { LockedError, NotAdminError, type Booking, type BookingsApi, type TechnicianOption } from './bookingsApi'
import { BookingsPage } from './BookingsPage'

const DAY = '2026-11-09'
const booking = (id: string, over: Partial<Booking> = {}): Booking => ({
  id,
  customerId: `cust-${id}`,
  day: DAY,
  window: '08:00-11:00',
  status: 'confirmed',
  technicianId: null,
  ...over,
})
const tech = (id: string, name: string, active = true) => ({
  id,
  name,
  loginEmail: `${id}@x.example`,
  phone: null,
  serviceArea: null,
  notes: null,
  active,
  workingDays: [],
  openJobCount: 0,
  nextDayOff: null,
})
const option = (id: string, name: string, over: Partial<TechnicianOption> = {}): TechnicianOption => ({
  id,
  name,
  serviceArea: null,
  workingHours: { start: '08:00', end: '16:00' },
  daysOff: [],
  jobsOnDay: [],
  ...over,
})

/** A stateful fake: assigning moves the booking between the two lists. */
function fakeApi(bookings: Booking[], over: Partial<BookingsApi> = {}): BookingsApi {
  const technicians = [tech('t1', 'Priya Nair'), tech('t2', 'Marcus Webb')]
  return {
    listBookings: vi.fn(async (filter) =>
      bookings.filter((b) => (filter === 'unassigned' ? b.technicianId === null : b.technicianId !== null)),
    ),
    listTechnicians: vi.fn(async () => technicians),
    getTechnicianOptions: vi.fn(async (id: string) => {
      const current = bookings.find((b) => b.id === id)?.technicianId
      return [
        option('t1', 'Priya Nair', { daysOff: [DAY], jobsOnDay: [booking('other', { technicianId: 't1' })] }),
        option('t2', 'Marcus Webb'),
      ].filter((o) => o.id !== current)
    }),
    assignTechnician: vi.fn(async (id: string, technicianId: string) => {
      const b = bookings.find((x) => x.id === id)!
      const previous = b.technicianId
      b.technicianId = technicianId
      return {
        booking: { ...b },
        notified: [
          { technicianId, bookingId: id, kind: 'assigned' as const },
          ...(previous ? [{ technicianId: previous, bookingId: id, kind: 'removed' as const }] : []),
        ],
      }
    }),
    ...over,
  }
}

const optionEl = (name: string) => screen.getByRole('radio', { name }).closest('label') as HTMLElement

describe('BookingsPage', () => {
  it('shows a skeleton while loading', () => {
    render(<BookingsPage api={fakeApi([], { listBookings: () => new Promise(() => undefined) })} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bookings' })).toBeInTheDocument()
    expect(document.querySelector('.skeleton')).toBeInTheDocument()
  })

  it('lists an unassigned booking and not an assigned one (AC1, AC2)', async () => {
    render(<BookingsPage api={fakeApi([booking('BK-1'), booking('BK-2', { technicianId: 't1' })])} />)
    expect(await screen.findByRole('button', { name: 'Assign technician to BK-1' })).toBeInTheDocument()
    expect(screen.queryByText('BK-2')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Unassigned/ })).toHaveTextContent('1')
    expect(screen.getByRole('tab', { name: /Assigned/ })).toHaveTextContent('1')
  })

  it('shows the empty state with a way to the Assigned tab', async () => {
    render(<BookingsPage api={fakeApi([booking('BK-2', { technicianId: 't1' })])} />)
    expect(await screen.findByText('Every booking has a technician')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View assigned bookings' }))
    expect(screen.getByRole('button', { name: 'Reassign BK-2' })).toBeInTheDocument()
    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
  })

  it('shows an error with Try again that refetches', async () => {
    const api = fakeApi([booking('BK-1')])
    vi.mocked(api.listBookings).mockRejectedValueOnce(new Error('down'))
    render(<BookingsPage api={api} />)
    expect(await screen.findByRole('alert')).toHaveTextContent("The bookings didn't load")
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Assign technician to BK-1' })).toBeInTheDocument()
  })

  it('shows the not-admin alert and opens no drawer on a 403 (AC10)', async () => {
    const api = fakeApi([], { listBookings: vi.fn().mockRejectedValue(new NotAdminError()) })
    render(<BookingsPage api={api} />)
    expect(await screen.findByText('Only admins can assign technicians.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the not-admin alert when saving is refused (AC10)', async () => {
    const api = fakeApi([booking('BK-1')], { assignTechnician: vi.fn().mockRejectedValue(new NotAdminError()) })
    render(<BookingsPage api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Assign technician to BK-1' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('radio', { name: 'Marcus Webb' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }))
    expect(await screen.findByText('Only admins can assign technicians.')).toBeInTheDocument()
  })

  it("shows each technician's hours, days off and jobs that day (AC5)", async () => {
    render(<BookingsPage api={fakeApi([booking('BK-1')])} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Assign technician to BK-1' }))
    await screen.findByRole('radio', { name: 'Priya Nair' })
    const priya = within(optionEl('Priya Nair'))
    expect(priya.getByText(/08:00–16:00/)).toBeInTheDocument()
    expect(priya.getByText(/Off on/)).toBeInTheDocument()
    expect(priya.getByText(/Holds 1 job that day/)).toBeInTheDocument()
    expect(priya.getByText('You can still assign.')).toBeInTheDocument()
    expect(within(optionEl('Marcus Webb')).queryByText(/Off on/)).not.toBeInTheDocument()
  })

  it('asks for a choice before saving', async () => {
    const api = fakeApi([booking('BK-1')])
    render(<BookingsPage api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Assign technician to BK-1' }))
    await screen.findByRole('radio', { name: 'Priya Nair' })
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }))
    expect(screen.getByText('Choose a technician to continue.')).toBeInTheDocument()
    expect(api.assignTechnician).not.toHaveBeenCalled()
  })

  it('assigns a technician who is off that day and logs the notification (AC3, AC6, AC8)', async () => {
    const api = fakeApi([booking('BK-1')])
    render(<BookingsPage api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Assign technician to BK-1' }))
    await screen.findByRole('radio', { name: 'Priya Nair' })
    fireEvent.click(screen.getByRole('radio', { name: 'Priya Nair' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }))
    expect(await screen.findByText('Priya Nair was notified of the assignment.')).toBeInTheDocument()
    expect(api.assignTechnician).toHaveBeenCalledWith('BK-1', 't1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Assigned/ })).toHaveTextContent('1')
    expect(screen.getByText('BK-1 assigned to Priya Nair')).toBeInTheDocument()
  })

  it('reassigns and tells the previous technician (AC4, AC9, AC13)', async () => {
    const api = fakeApi([booking('BK-2047', { technicianId: 't2' }), booking('BK-9')])
    render(<BookingsPage api={api} />)
    fireEvent.click(await screen.findByRole('tab', { name: /Assigned/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reassign BK-2047' }))
    await screen.findByRole('radio', { name: 'Priya Nair' })
    expect(screen.queryByRole('radio', { name: 'Marcus Webb' })).not.toBeInTheDocument()
    expect(screen.getByText('Marcus Webb', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Priya Nair' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reassign technician' }))
    expect(await screen.findByText('Priya Nair was notified of the assignment.')).toBeInTheDocument()
    expect(
      screen.getByText('Marcus Webb was notified that BK-2047 was removed from them.'),
    ).toBeInTheDocument()
  })

  it.each(['on_the_way', 'in_progress', 'completed'])(
    'refuses reassigning a %s booking and keeps the technician (AC11, AC12)',
    async (status) => {
      const api = fakeApi([booking('BK-5', { technicianId: 't2', status })])
      render(<BookingsPage api={api} />)
      fireEvent.click(await screen.findByRole('tab', { name: /Assigned/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Reassign BK-5' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('BK-5 can’t be reassigned')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(screen.getByRole('row', { name: /BK-5/ })).getByText('Marcus Webb')).toBeInTheDocument()
      expect(api.assignTechnician).not.toHaveBeenCalled()
    },
  )

  it('shows the refusal when the server locks a booking the page thought was open (AC11)', async () => {
    const bookings = [booking('BK-6', { technicianId: 't2' })]
    const api = fakeApi(bookings, { assignTechnician: vi.fn().mockRejectedValue(new LockedError('locked')) })
    render(<BookingsPage api={api} />)
    fireEvent.click(await screen.findByRole('tab', { name: /Assigned/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reassign BK-6' }))
    await screen.findByRole('radio', { name: 'Priya Nair' })
    bookings[0].status = 'on_the_way'
    fireEvent.click(screen.getByRole('radio', { name: 'Priya Nair' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reassign technician' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('BK-6 can’t be reassigned while it is on the way')
    expect(within(screen.getByRole('row', { name: /BK-6/ })).getByText('Marcus Webb')).toBeInTheDocument()
  })

  it('is a labelled dialog and returns focus to the trigger on close', async () => {
    render(<BookingsPage api={fakeApi([booking('BK-1')])} />)
    const trigger = await screen.findByRole('button', { name: 'Assign technician to BK-1' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Assign technician to BK-1' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
