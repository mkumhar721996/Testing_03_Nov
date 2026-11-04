import { useCallback, useEffect, useState } from 'react'
import { fetchOrganization, type Organization } from './organizationApi'

export type OrganizationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; organization: Organization }

export function useOrganization(
  id: string,
  fetcher: (id: string, signal?: AbortSignal) => Promise<Organization> = fetchOrganization,
) {
  const [state, setState] = useState<OrganizationState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetcher(id, controller.signal).then(
      (organization) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', organization })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher is intentionally excluded: a new inline function must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { state, retry }
}
