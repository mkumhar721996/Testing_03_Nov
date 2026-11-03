import { act, renderHook, waitFor } from '@testing-library/react'
import { publishReadingSaved, readingSavedListenerCount } from './readingEvents'
import { localDayBounds, type Reading } from './todayStats'
import { useTodayStats } from './useTodayStats'

const now = new Date(2026, 10, 3, 12, 0)
const today = new Date(2026, 10, 3, 9, 0).toISOString()
const w = (id: string, value: number, loggedAt = today): Reading => ({ id, type: 'weight', loggedAt, value })

describe('useTodayStats', () => {
  it('fetches with local day bounds and ignores readings outside the day (AC10)', async () => {
    const yesterday = new Date(2026, 10, 2, 23, 59).toISOString()
    const fetcher = vi.fn().mockResolvedValue([w('a', 70), w('b', 80, yesterday)])
    const { result } = renderHook(() => useTodayStats(fetcher, () => now))
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(fetcher.mock.calls[0][0]).toBe(now)
    expect(localDayBounds(fetcher.mock.calls[0][0])).toEqual(localDayBounds(now))
    expect(result.current.state).toEqual({ status: 'loaded', readings: [w('a', 70)] })
  })

  it('merges a saved reading without refetching (AC11)', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useTodayStats(fetcher, () => now))
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    act(() => publishReadingSaved(w('n', 73.1)))
    expect(result.current.state).toEqual({ status: 'loaded', readings: [w('n', 73.1)] })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('ignores a saved reading from another day (AC10, AC11)', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useTodayStats(fetcher, () => now))
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    act(() => publishReadingSaved(w('o', 73, new Date(2026, 10, 2, 22, 0).toISOString())))
    expect(result.current.state).toEqual({ status: 'loaded', readings: [] })
  })

  it('unsubscribes on unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const before = readingSavedListenerCount()
    const { result, unmount } = renderHook(() => useTodayStats(fetcher, () => now))
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(readingSavedListenerCount()).toBe(before + 1)
    const stateBeforeUnmount = result.current.state
    unmount()
    expect(readingSavedListenerCount()).toBe(before)
    act(() => publishReadingSaved(w('n', 73)))
    expect(result.current.state).toBe(stateBeforeUnmount)
  })

  it('errors and recovers via retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([])
    const { result } = renderHook(() => useTodayStats(fetcher, () => now))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
