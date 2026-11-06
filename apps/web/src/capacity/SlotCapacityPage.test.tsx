import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NotAdminError, type CapacityApi } from './capacityApi'
import { SlotCapacityPage } from './SlotCapacityPage'

const WINDOWS = ['08:00-11:00', '11:00-14:00', '14:00-17:00']
const rows = [
  { day: '2026-11-09', limit: 5, booked: 2, placesLeft: 3 },
  { day: '2026-11-10', limit: null, booked: 0, placesLeft: 0 },
  { day: '2026-11-11', limit: 3, booked: 5, placesLeft: 0 },
]

function fakeApi(over: Partial<CapacityApi> = {}): CapacityApi {
  return {
    fetchVisitLimits: vi.fn().mockResolvedValue(rows),
    putVisitLimit: vi.fn().mockResolvedValue({ day: '2026-11-09', limit: 8, booked: 2, placesLeft: 6 }),
    fetchSlots: vi.fn().mockImplementation(async (day: string) => ({
      day,
      limit: 5,
      placesLeft: 3,
      slots: WINDOWS.map((window) => ({ window, bookable: true })),
    })),
    fetchDayBookings: vi.fn().mockResolvedValue([]),
    ...over,
  }
}

const booking = (id: string, extra = {}) => ({
  id,
  customerId: `cust-${id}`,
  window: '08:00-11:00',
  status: 'confirmed',
  customerName: null,
  phone: null,
  address: null,
  service: null,
  engineer: null,
  ...extra,
})

describe('SlotCapacityPage', () => {
  it('shows loading, then the day table', async () => {
    render(<SlotCapacityPage api={fakeApi()} />)
    expect(screen.getByText('Loading visit limits')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Slot capacity' })).toBeVisible()
    expect(await screen.findByText('2026-11-09')).toBeInTheDocument()
  })

  it('says no limit is set for a day without one (AC8)', async () => {
    render(<SlotCapacityPage api={fakeApi()} />)
    expect(await screen.findByText('Not set')).toBeInTheDocument()
    expect(screen.getByText('Not bookable: no limit set')).toBeInTheDocument()
  })

  it('flags days over their limit (AC9)', async () => {
    render(<SlotCapacityPage api={fakeApi()} />)
    expect(await screen.findByText('Over limit')).toBeInTheDocument()
    expect(screen.getByText('Not bookable: fully booked')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is set', async () => {
    render(<SlotCapacityPage api={fakeApi({ fetchVisitLimits: vi.fn().mockResolvedValue([]) })} />)
    expect(await screen.findByText('No visit limits set')).toBeInTheDocument()
  })

  it('shows an alert with Try again when loading fails', async () => {
    const fetchVisitLimits = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(rows)
    render(<SlotCapacityPage api={fakeApi({ fetchVisitLimits })} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('2026-11-09')).toBeInTheDocument()
  })

  it('shows the not-admin alert when listing returns 403 (AC7)', async () => {
    render(<SlotCapacityPage api={fakeApi({ fetchVisitLimits: vi.fn().mockRejectedValue(new NotAdminError()) })} />)
    expect(await screen.findByText('Only admins can change visit limits')).toBeInTheDocument()
  })

  it('offers the same three windows for two different days (AC6)', async () => {
    render(<SlotCapacityPage api={fakeApi()} />)
    for (const day of ['2026-11-09', '2026-11-10']) {
      const row = (await screen.findByText(day)).closest('tr') as HTMLElement
      fireEvent.click(within(row).getByRole('button', { name: 'Set limit' }))
      const dialog = await screen.findByRole('dialog')
      for (const w of WINDOWS) expect(await within(dialog).findByText(w)).toBeInTheDocument()
      fireEvent.keyDown(dialog, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
  })

  it('saves a new limit and confirms with a toast (AC1)', async () => {
    const api = fakeApi()
    render(<SlotCapacityPage api={api} />)
    const row = (await screen.findByText('2026-11-09')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Set limit' }))
    fireEvent.change(await screen.findByLabelText('Visit limit'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(await screen.findByText('Visit limit saved')).toBeInTheDocument()
    expect(api.putVisitLimit).toHaveBeenCalledWith('2026-11-09', 8)
  })

  it('rejects an invalid limit inline without calling the API', async () => {
    const api = fakeApi()
    render(<SlotCapacityPage api={api} />)
    const row = (await screen.findByText('2026-11-09')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Set limit' }))
    fireEvent.change(await screen.findByLabelText('Visit limit'), { target: { value: '201' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(await screen.findByText('Enter a whole number from 0 to 200.')).toBeInTheDocument()
    expect(api.putVisitLimit).not.toHaveBeenCalled()
  })

  it('shows the not-admin alert and no toast when save returns 403 (AC7)', async () => {
    const api = fakeApi({ putVisitLimit: vi.fn().mockRejectedValue(new NotAdminError()) })
    render(<SlotCapacityPage api={api} />)
    const row = (await screen.findByText('2026-11-09')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Set limit' }))
    fireEvent.change(await screen.findByLabelText('Visit limit'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(await screen.findByText('Only admins can change visit limits')).toBeInTheDocument()
    expect(screen.queryByText('Visit limit saved')).not.toBeInTheDocument()
  })

  it('warns before saving a limit below the bookings, and lists all bookings as confirmed (AC9, AC10)', async () => {
    const bookings = [1, 2, 3, 4, 5].map((i) =>
      i === 1
        ? booking('1', { customerName: 'Amara Okafor', phone: '07700 900111', service: 'Boiler service' })
        : booking(String(i)),
    )
    render(<SlotCapacityPage api={fakeApi({ fetchDayBookings: vi.fn().mockResolvedValue(bookings) })} />)
    const row = (await screen.findByText('2026-11-11')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Set limit' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findAllByText('Confirmed')).toHaveLength(5)
    expect(within(dialog).getByText('Amara Okafor')).toBeInTheDocument()
    expect(within(dialog).getByText('07700 900111')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Engineer: Not assigned yet')).toHaveLength(5)
    expect(within(dialog).getByText('cust-2')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Visit limit'), { target: { value: '2' } })
    expect(within(dialog).getByText(/They stay confirmed/)).toBeInTheDocument()
  })
})
