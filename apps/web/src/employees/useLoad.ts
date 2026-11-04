import { useCallback, useEffect, useState } from 'react'

export type LoadState<T> = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; value: T }

/** Loads once per `key` (and per retry), aborting on unmount; same shape as usePatientSummary. */
export function useLoad<T>(fetcher: (signal: AbortSignal) => Promise<T>, key: string = '') {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetcher(controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', value })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher is intentionally excluded: a new inline function must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const set = useCallback((value: T) => setState({ status: 'loaded', value }), [])
  return { state, retry, set }
}
