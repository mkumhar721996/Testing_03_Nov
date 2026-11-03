import { useCallback, useEffect, useState } from 'react'
import { subscribeReadingSaved } from './readingEvents'
import { fetchTodayReadings } from './todayReadings'
import { isOnLocalDay, type Reading } from './todayStats'

export type StatsState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; readings: Reading[] }

export type StatsFetcher = (now: Date, signal?: AbortSignal) => Promise<Reading[]>

export function useTodayStats(fetcher: StatsFetcher = fetchTodayReadings, now: () => Date = () => new Date()) {
  const [state, setState] = useState<StatsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const day = now()
    fetcher(day, controller.signal).then(
      (readings) => {
        if (!controller.signal.aborted) {
          setState({ status: 'loaded', readings: readings.filter((r) => isOnLocalDay(r.loggedAt, day)) })
        }
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher and now are intentionally excluded: a new inline function must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useEffect(
    () =>
      subscribeReadingSaved((saved) => {
        if (!isOnLocalDay(saved.loggedAt, now())) return
        setState((prev) =>
          prev.status === 'loaded'
            ? { status: 'loaded', readings: [...prev.readings.filter((r) => r.id !== saved.id), saved] }
            : prev,
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
