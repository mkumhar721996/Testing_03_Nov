import { act, renderHook, waitFor } from '@testing-library/react'
import { useBalance } from './useBalance'

describe('useBalance', () => {
  it('loads the server balance and shows it again after a remount (AC2, AC3, AC4)', async () => {
    const fetcher = vi.fn().mockResolvedValue(37)
    const first = renderHook(() => useBalance(fetcher))
    expect(first.result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(first.result.current.state).toEqual({ status: 'loaded', balance: 37 }))
    first.unmount()
    const second = renderHook(() => useBalance(fetcher))
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'loaded', balance: 37 }))
  })

  it('reports an error, then recovers on retry (AC6, AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(37)
    const { result } = renderHook(() => useBalance(fetcher))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', balance: 37 }))
  })
})
