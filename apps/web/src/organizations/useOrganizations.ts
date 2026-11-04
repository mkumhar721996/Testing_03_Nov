import { useCallback, useEffect, useState } from 'react'
import { fetchOrganizations, type Organization } from './organizationApi'

export type OrganizationsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; organizations: Organization[] }

export function useOrganizations(fetcher: (signal?: AbortSignal) => Promise<Organization[]> = fetchOrganizations) {
  const [state, setState] = useState<OrganizationsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (organizations) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', organizations })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher is intentionally excluded: a new inline function must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
