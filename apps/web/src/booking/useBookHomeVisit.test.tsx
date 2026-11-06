import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import type { BookingApi } from './bookingApi'
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
})
