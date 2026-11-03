import { act, renderHook, waitFor } from '@testing-library/react'
import { useWeightTrend } from './useWeightTrend'

const reading = (recordedAt: string, weightKg: number) => ({ recordedAt, weightKg })

describe('useWeightTrend', () => {
  it('starts loading', () => {
    const { result } = renderHook(() => useWeightTrend(() => new Promise(() => {})))
    expect(result.current.state.status).toBe('loading')
  })

  it('moves to error when the fetch rejects', async () => {
    const { result } = renderHook(() => useWeightTrend(() => Promise.reject(new Error('x'))))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
  })

  it('retry refetches', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([])
    const { result } = renderHook(() => useWeightTrend(fetcher))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    act(() => result.current.retry())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('shows a newly saved reading without a reload (AC9)', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([reading(new Date().toISOString(), 80)])
    const { result } = renderHook(() => useWeightTrend(fetcher))
    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'loaded', points: [] }))
    act(() => {
      window.dispatchEvent(new Event('readings:saved'))
    })
    expect(result.current.state.status).toBe('loaded')
    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'loaded', points: [expect.anything()] }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
