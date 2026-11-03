import { act, renderHook, waitFor } from '@testing-library/react'
import { usePatientSummary } from './usePatientSummary'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }

describe('usePatientSummary', () => {
  it('starts loading (AC5)', () => {
    const { result } = renderHook(() => usePatientSummary(() => new Promise(() => {})))
    expect(result.current.state.status).toBe('loading')
  })

  it('moves to error when the fetch rejects (AC6)', async () => {
    const { result } = renderHook(() => usePatientSummary(() => Promise.reject(new Error('x'))))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
  })

  it('moves to loaded on success', async () => {
    const { result } = renderHook(() => usePatientSummary(() => Promise.resolve(profile)))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', summary: profile }))
  })

  it('retry refetches (AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(profile)
    const { result } = renderHook(() => usePatientSummary(fetcher))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    act(() => result.current.retry())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('loaded'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
