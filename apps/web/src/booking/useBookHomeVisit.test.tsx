import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { NoAddressError, NotSignedInError, SlotTakenError, type BookingApi } from './bookingApi'
import { useBookHomeVisit } from './useBookHomeVisit'

const home = { id: 'home', label: 'Home', line: '1 Mill Lane', timeZone: 'Europe/London' }
const service = { id: 'boiler-service', categoryId: 'heat', name: 'Boiler service', note: '' }

function api(): BookingApi {
  return {
    fetchCategories: vi.fn().mockResolvedValue({
      categories: [
        { id: 'heat', name: 'Heating' },
        { id: 'laundry', name: 'Laundry' },
      ],
      visitFee: { amount: 35, currency: 'GBP' },
    }),
    fetchServices: vi.fn().mockResolvedValue([service]),
    fetchAddresses: vi.fn().mockResolvedValue([home]),
    fetchHomeVisitSlots: vi.fn().mockResolvedValue({
      day: '2026-11-09',
      timeZone: 'Europe/London',
      zoneLabel: 'GMT',
      slots: [{ window: '08:00-11:00', bookable: true }],
    }),
    postHomeVisit: vi.fn(),
  }
}

beforeEach(() => localStorage.setItem('userId', 'c1'))
afterEach(() => localStorage.clear())

describe('useBookHomeVisit', () => {
  it('enables confirm only with category, service, address and slot, and clears later choices (AC13, AC14)', async () => {
    const { result } = renderHook(() => useBookHomeVisit(api()))
    await waitFor(() => expect(result.current.view).toBe('form'))
    expect(result.current.canConfirm).toBe(false)

    act(() => result.current.chooseCategory('heat'))
    await waitFor(() => expect(result.current.services).toHaveLength(1))
    act(() => result.current.chooseService('boiler-service'))
    act(() => result.current.chooseAddress('home'))
    expect(result.current.canConfirm).toBe(false)
    await waitFor(() => expect(result.current.slots?.slots).toHaveLength(1))
    act(() => result.current.chooseSlot('08:00-11:00'))
    expect(result.current.canConfirm).toBe(true)

    act(() => result.current.chooseCategory('laundry'))
    expect(result.current.service).toBeNull()
    expect(result.current.slot).toBeNull()
    expect(result.current.canConfirm).toBe(false)
  })

  async function ready(a: BookingApi) {
    const hook = renderHook(() => useBookHomeVisit(a))
    await waitFor(() => expect(hook.result.current.view).toBe('form'))
    act(() => hook.result.current.chooseCategory('heat'))
    await waitFor(() => expect(hook.result.current.services).toHaveLength(1))
    act(() => hook.result.current.chooseService('boiler-service'))
    act(() => hook.result.current.chooseAddress('home'))
    await waitFor(() => expect(hook.result.current.slots?.slots).toHaveLength(1))
    act(() => hook.result.current.chooseSlot('08:00-11:00'))
    return hook
  }

  it('is signed out without any request when there is no identity (AC1)', () => {
    localStorage.clear()
    const a = api()
    const { result } = renderHook(() => useBookHomeVisit(a))
    expect(result.current.view).toBe('signed-out')
    expect(a.fetchCategories).not.toHaveBeenCalled()
    expect(a.fetchAddresses).not.toHaveBeenCalled()
  })

  it('is signed out when the server answers 401 (AC1)', async () => {
    const a = { ...api(), fetchAddresses: vi.fn().mockRejectedValue(new NotSignedInError()) }
    const { result } = renderHook(() => useBookHomeVisit(a))
    await waitFor(() => expect(result.current.view).toBe('signed-out'))
  })

  it('goes to the no-address view when there are no saved addresses (AC10)', async () => {
    const a = { ...api(), fetchAddresses: vi.fn().mockResolvedValue([]) }
    const { result } = renderHook(() => useBookHomeVisit(a))
    await waitFor(() => expect(result.current.view).toBe('no-address'))
    expect(result.current.canConfirm).toBe(false)
    expect(a.postHomeVisit).not.toHaveBeenCalled()
  })

  it('reports a failed load and offers a retry', async () => {
    const a = api()
    vi.mocked(a.fetchCategories).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useBookHomeVisit(a))
    await waitFor(() => expect(result.current.error).toBe('failed'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(result.current.view).toBe('form')
  })

  it('clears the slot when the address or the day changes (AC13)', async () => {
    const { result } = await ready(api())
    expect(result.current.canConfirm).toBe(true)
    act(() => result.current.chooseDay('2026-11-10'))
    expect(result.current.slot).toBeNull()
    expect(result.current.canConfirm).toBe(false)
    await waitFor(() => expect(result.current.slots?.slots).toHaveLength(1))
    act(() => result.current.chooseSlot('08:00-11:00'))
    act(() => result.current.chooseAddress('home'))
    expect(result.current.slot).toBeNull()
  })

  it('posts the chosen booking once and shows the confirmation (AC7)', async () => {
    const a = api()
    const confirmed = { bookingId: 'b1', status: 'confirmed' }
    a.postHomeVisit = vi.fn().mockResolvedValue(confirmed)
    const { result } = await ready(a)
    await act(() => result.current.confirm())
    expect(a.postHomeVisit).toHaveBeenCalledTimes(1)
    expect(a.postHomeVisit).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 'boiler-service', addressId: 'home', window: '08:00-11:00' }),
    )
    expect(result.current.view).toBe('confirmed')
    expect(result.current.confirmed).toEqual(confirmed)
  })

  it('does not post when a choice is missing (AC13)', async () => {
    const a = api()
    const { result } = renderHook(() => useBookHomeVisit(a))
    await waitFor(() => expect(result.current.view).toBe('form'))
    await act(() => result.current.confirm())
    expect(a.postHomeVisit).not.toHaveBeenCalled()
  })

  it('keeps the form and clears the slot when the slot was just taken (AC6)', async () => {
    const a = api()
    a.postHomeVisit = vi.fn().mockRejectedValue(new SlotTakenError())
    const { result } = await ready(a)
    await act(() => result.current.confirm())
    expect(result.current.error).toBe('slot-taken')
    expect(result.current.view).toBe('form')
    expect(result.current.slot).toBeNull()
    expect(result.current.canConfirm).toBe(false)
  })

  it('moves to the no-address view when the server says there is no address (AC10)', async () => {
    const a = api()
    a.postHomeVisit = vi.fn().mockRejectedValue(new NoAddressError())
    const { result } = await ready(a)
    await act(() => result.current.confirm())
    expect(result.current.view).toBe('no-address')
  })

  it('starts a fresh booking after a confirmation', async () => {
    const a = api()
    a.postHomeVisit = vi.fn().mockResolvedValue({ bookingId: 'b1', status: 'confirmed' })
    const { result } = await ready(a)
    await act(() => result.current.confirm())
    act(() => result.current.reset())
    expect(result.current.view).toBe('form')
    expect(result.current.category).toBeNull()
    expect(result.current.confirmed).toBeNull()
    expect(result.current.canConfirm).toBe(false)
  })
})
