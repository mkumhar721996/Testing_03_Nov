import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { BookHomeVisitPage } from './BookHomeVisitPage'
import { NoAddressError, SlotTakenError, type BookingApi } from './bookingApi'

const WINDOWS = ['08:00-11:00', '11:00-14:00', '14:00-17:00']
const home = { id: 'home', label: 'Home', line: '22 Mill Lane, Leeds', timeZone: 'Europe/London' }
const flat = { id: 'flat', label: "Mum's flat", line: 'Calle Mayor 12, Madrid', timeZone: 'Europe/Madrid' }
const services = [
  { id: 'boiler-service', categoryId: 'heat', name: 'Boiler service', note: 'Annual check' },
  { id: 'boiler-repair', categoryId: 'heat', name: 'Boiler repair', note: 'Repair' },
  { id: 'washer', categoryId: 'laundry', name: 'Washing machine repair', note: 'Faults' },
]

function fakeApi(over: Partial<BookingApi> = {}): BookingApi {
  return {
    fetchCategories: vi.fn().mockResolvedValue({
      categories: [
        { id: 'heat', name: 'Heating and boilers' },
        { id: 'laundry', name: 'Laundry appliances' },
      ],
      visitFee: { amount: 35, currency: 'GBP' },
    }),
    fetchServices: vi.fn().mockImplementation(async (id: string) => services.filter((s) => s.categoryId === id)),
    fetchAddresses: vi.fn().mockResolvedValue([home, flat]),
    fetchHomeVisitSlots: vi.fn().mockImplementation(async (day: string, addressId: string) => {
      const madrid = addressId === 'flat'
      return {
        day,
        timeZone: madrid ? 'Europe/Madrid' : 'Europe/London',
        zoneLabel: madrid ? 'CET' : 'GMT',
        slots: WINDOWS.map((window) => ({ window, bookable: true })),
      }
    }),
    postHomeVisit: vi.fn().mockImplementation(async (input) => ({
      bookingId: 'b1',
      status: 'confirmed',
      visitFee: { amount: 35, currency: 'GBP' },
      service: services[0],
      address: home,
      day: input.day,
      window: input.window,
      zoneLabel: 'GMT',
    })),
    ...over,
  }
}

const confirmButton = () => screen.getByRole('button', { name: 'Confirm booking' })
const summary = () => screen.getByRole('complementary', { name: 'Your booking' })

// user-event is not installed, so clicks go through fireEvent.
const user = {
  click: async (el: HTMLElement) => {
    fireEvent.click(el)
  },
}

async function chooseAll(address = /Home/) {
  await user.click(await screen.findByRole('radio', { name: /Heating and boilers/ }))
  await user.click(await screen.findByRole('radio', { name: /Boiler service/ }))
  await user.click(screen.getByRole('radio', { name: address }))
  await user.click(await screen.findByRole('radio', { name: /08:00-11:00/ }))
}

beforeEach(() => localStorage.setItem('userId', 'c1'))
afterEach(() => localStorage.clear())

describe('BookHomeVisitPage', () => {
  it('refuses a visitor who is not signed in and makes no request or booking (AC1, AC11)', async () => {
    localStorage.clear()
    const api = fakeApi()
    render(<BookHomeVisitPage api={api} />)
    expect(await screen.findByText('Sign in to book a home visit')).toBeInTheDocument()
    expect(api.fetchCategories).not.toHaveBeenCalled()
    expect(api.postHomeVisit).not.toHaveBeenCalled()
  })

  it('shows the signed-out view when the server answers 401 (AC1)', async () => {
    const { NotSignedInError } = await import('./bookingApi')
    render(<BookHomeVisitPage api={fakeApi({ fetchCategories: vi.fn().mockRejectedValue(new NotSignedInError()) })} />)
    expect(await screen.findByText('Sign in to book a home visit')).toBeInTheDocument()
  })

  it('offers only the services of the chosen category (AC3)', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await screen.findByRole('radio', { name: /Laundry appliances/ })
    expect(screen.getByRole('group', { name: /2. Service/ })).toBeDisabled()
    await user.click(await screen.findByRole('radio', { name: /Laundry appliances/ }))
    expect(await screen.findByRole('radio', { name: /Washing machine repair/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Boiler service/ })).not.toBeInTheDocument()
  })

  it('offers only the addresses the api returns (AC4)', async () => {
    render(<BookHomeVisitPage api={fakeApi({ fetchAddresses: vi.fn().mockResolvedValue([home]) })} />)
    expect(await screen.findByRole('radio', { name: /Home/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Mum's flat/ })).not.toBeInTheDocument()
  })

  it('shows the chosen slot as selected in the summary (AC5)', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await chooseAll()
    expect(screen.getByRole('radio', { name: /08:00-11:00/ })).toBeChecked()
    expect(within(summary()).getByText(/08:00-11:00/)).toBeInTheDocument()
  })

  it('shows a full slot as unavailable (AC6)', async () => {
    const api = fakeApi({
      fetchHomeVisitSlots: vi.fn().mockResolvedValue({
        day: '2026-11-09',
        timeZone: 'Europe/London',
        zoneLabel: 'GMT',
        slots: [
          { window: '08:00-11:00', bookable: true },
          { window: '11:00-14:00', bookable: false },
          { window: '14:00-17:00', bookable: true },
        ],
      }),
    })
    render(<BookHomeVisitPage api={api} />)
    await user.click(await screen.findByRole('radio', { name: /Heating and boilers/ }))
    await user.click(await screen.findByRole('radio', { name: /Boiler service/ }))
    await user.click(screen.getByRole('radio', { name: /Home/ }))
    expect(await screen.findByRole('radio', { name: /11:00-14:00/ })).toBeDisabled()
    expect(screen.getByText('Full, unavailable')).toBeInTheDocument()
  })

  it('says every slot is full when none can be booked (AC6)', async () => {
    const api = fakeApi({
      fetchHomeVisitSlots: vi.fn().mockResolvedValue({
        day: '2026-11-09',
        timeZone: 'Europe/London',
        zoneLabel: 'GMT',
        slots: WINDOWS.map((window) => ({ window, bookable: false })),
      }),
    })
    render(<BookHomeVisitPage api={api} />)
    await user.click(await screen.findByRole('radio', { name: /Heating and boilers/ }))
    await user.click(await screen.findByRole('radio', { name: /Boiler service/ }))
    await user.click(screen.getByRole('radio', { name: /Home/ }))
    expect(await screen.findByText(/Every slot on this day is full/)).toBeInTheDocument()
  })

  it('shows the slot taken error when the server answers 409 (AC6)', async () => {
    render(<BookHomeVisitPage api={fakeApi({ postHomeVisit: vi.fn().mockRejectedValue(new SlotTakenError()) })} />)
    await chooseAll()
    await user.click(confirmButton())
    expect(await screen.findByText('That slot was just taken.')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('confirms straight away and shows the fee on the confirmation (AC7, AC9)', async () => {
    const api = fakeApi()
    render(<BookHomeVisitPage api={api} />)
    await chooseAll()
    await user.click(confirmButton())
    expect(api.postHomeVisit).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Confirmed straight away/)).toBeInTheDocument()
    expect(within(screen.getByRole('status', { name: /confirmed/i })).getByText(/35\.00/)).toBeInTheDocument()
  })

  it('shows the fixed fee once a service is chosen (AC8)', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await user.click(await screen.findByRole('radio', { name: /Heating and boilers/ }))
    expect(within(summary()).getByText('Shown once you choose a service')).toBeInTheDocument()
    await user.click(await screen.findByRole('radio', { name: /Boiler service/ }))
    expect(within(summary()).getByText(/35\.00/)).toBeInTheDocument()
  })

  it('asks for an address and does not book when there is none (AC10, AC11)', async () => {
    const api = fakeApi({ fetchAddresses: vi.fn().mockResolvedValue([]) })
    render(<BookHomeVisitPage api={api} />)
    expect(await screen.findByText('Add an address before you book.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add an address' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument()
    expect(api.postHomeVisit).not.toHaveBeenCalled()
  })

  it('moves to the no-address view when the server reports no address (AC10)', async () => {
    render(<BookHomeVisitPage api={fakeApi({ postHomeVisit: vi.fn().mockRejectedValue(new NoAddressError()) })} />)
    await chooseAll()
    await user.click(confirmButton())
    expect(await screen.findByText('Add an address before you book.')).toBeInTheDocument()
  })

  it('shows slot times in the time zone of the chosen address (AC12)', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await chooseAll(/Mum's flat/)
    expect(screen.getByRole('radio', { name: /08:00-11:00 CET/ })).toBeInTheDocument()
    expect(screen.getByText('Times shown in Madrid time (CET)')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Home/ }))
    expect(await screen.findByRole('radio', { name: /08:00-11:00 GMT/ })).toBeInTheDocument()
  })

  it('keeps Confirm disabled until all four choices are made (AC13, AC14)', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await user.click(await screen.findByRole('radio', { name: /Heating and boilers/ }))
    expect(confirmButton()).toBeDisabled()
    expect(within(summary()).getByText(/Still to choose: .*service/)).toBeInTheDocument()
    await user.click(await screen.findByRole('radio', { name: /Boiler service/ }))
    await user.click(screen.getByRole('radio', { name: /Home/ }))
    expect(confirmButton()).toBeDisabled()
    await user.click(await screen.findByRole('radio', { name: /08:00-11:00/ }))
    expect(confirmButton()).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: /Laundry appliances/ }))
    await waitFor(() => expect(confirmButton()).toBeDisabled())
    expect(screen.queryByRole('radio', { name: /08:00-11:00/, checked: true })).not.toBeInTheDocument()
  })

  it('wraps the page in the app shell with Items current and a footer', async () => {
    render(<BookHomeVisitPage api={fakeApi()} />)
    await screen.findByRole('radio', { name: /Heating and boilers/ })
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getAllByRole('link').map((a) => a.textContent)).toEqual(['Dashboard', 'Items', 'Settings'])
    expect(nav.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    expect(screen.getByText('Web App · Help · Privacy')).toBeInTheDocument()
  })
})
