import { act, renderHook, waitFor } from '@testing-library/react'
import { useSlotGame } from './useSlotGame'

afterEach(() => vi.unstubAllGlobals())

describe('useSlotGame', () => {
  it('loads the remaining free games from the server on mount (AC6)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ remaining: 10 }) }))
    const { result } = renderHook(() => useSlotGame())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'idle', remaining: 10 }))
  })

  it('keeps remaining unchanged when the spin is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/spin/free-games')
          ? Promise.resolve({ ok: true, json: async () => ({ remaining: 10 }) })
          : Promise.reject(new Error('down')),
      ),
    )
    const { result } = renderHook(() => useSlotGame())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'idle', remaining: 10 }))
    act(() => result.current.spin(1))
    expect(result.current.state).toEqual({ status: 'submitting', remaining: 10 })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', remaining: 10 }))
  })
})
