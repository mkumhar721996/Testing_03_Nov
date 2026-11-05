import { act, renderHook, waitFor } from '@testing-library/react'
import type { PaytableView } from './paytableApi'
import { usePaytable } from './usePaytable'

const view: PaytableView = { symbols: [], rules: { wild: 'w', scatter: 's' } }

describe('usePaytable', () => {
  it('fetches once and caches the result', async () => {
    const fetcher = vi.fn().mockResolvedValue(view)
    const { result } = renderHook(() => usePaytable(fetcher))
    expect(result.current.status).toBe('idle')
    act(() => {
      result.current.load()
      result.current.load()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.load())
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.paytable).toEqual(view)
  })

  it('fetches again after a failure', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(view)
    const { result } = renderHook(() => usePaytable(fetcher))
    act(() => result.current.load())
    await waitFor(() => expect(result.current.status).toBe('error'))
    act(() => result.current.load())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
