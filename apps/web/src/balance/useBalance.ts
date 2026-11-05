import { useCallback, useEffect, useState } from 'react'
import { fetchBalance } from './playerBalance'

export type BalanceState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; balance: number }

export function useBalance(fetcher: (signal?: AbortSignal) => Promise<number> = fetchBalance) {
  const [state, setState] = useState<BalanceState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (balance) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', balance })
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
