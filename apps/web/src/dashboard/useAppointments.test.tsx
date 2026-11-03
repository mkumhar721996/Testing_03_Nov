import { act, renderHook, waitFor } from '@testing-library/react'
import type { Appointment } from './appointments'
import { useAppointments } from './useAppointments'

const now = () => new Date('2026-11-04T09:00:00Z')
const a1: Appointment = {
  id: 'a1',
  startsAt: '2026-11-05T09:00:00Z',
  endsAt: '2026-11-05T09:30:00Z',
  bookedAt: '2026-11-01T10:00:00Z',
}
const ended: Appointment = { ...a1, id: 'old', startsAt: '2026-11-04T07:00:00Z', endsAt: '2026-11-04T08:00:00Z' }

describe('useAppointments', () => {
  it('starts loading', () => {
    const { result } = renderHook(() => useAppointments(() => new Promise(() => {}), now))
    expect(result.current.state.status).toBe('loading')
  })

  it('moves to error when the fetch rejects', async () => {
    const { result } = renderHook(() => useAppointments(() => Promise.reject(new Error('x')), now))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
  })

  it('loads only upcoming appointments', async () => {
    const { result } = renderHook(() => useAppointments(() => Promise.resolve([ended, a1]), now))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', upcoming: [a1] }))
  })

  it('retry refetches', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([a1])
    const { result } = renderHook(() => useAppointments(fetcher, now))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    act(() => result.current.retry())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
