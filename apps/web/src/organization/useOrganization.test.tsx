import { act, renderHook, waitFor } from '@testing-library/react'
import type { Organization } from './organizationApi'
import { useOrganization } from './useOrganization'

const org = { id: 'o1', name: 'Locke Prep' } as Organization

describe('useOrganization', () => {
  it('loads the organization', async () => {
    const fetcher = vi.fn().mockResolvedValue(org)
    const { result } = renderHook(() => useOrganization('o1', fetcher))
    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', organization: org }))
    expect(fetcher).toHaveBeenCalledWith('o1', expect.any(AbortSignal))
  })

  it('reports an error, then recovers on retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(org)
    const { result } = renderHook(() => useOrganization('o1', fetcher))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', organization: org }))
  })

  it('refetches when the id changes', async () => {
    const fetcher = vi.fn().mockResolvedValue(org)
    const { rerender } = renderHook(({ id }) => useOrganization(id, fetcher), { initialProps: { id: 'o1' } })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    rerender({ id: 'o2' })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })
})
