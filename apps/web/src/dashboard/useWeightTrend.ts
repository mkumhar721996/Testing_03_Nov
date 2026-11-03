import { useCallback, useEffect, useState } from 'react'
import { fetchWeightReadings, toTrendPoints, type WeightPoint, type WeightReading } from './weightTrend'

export const READINGS_SAVED_EVENT = 'readings:saved'

export type WeightTrendState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; points: WeightPoint[] }

export function useWeightTrend(fetcher: (signal?: AbortSignal) => Promise<WeightReading[]> = fetchWeightReadings) {
  const [state, setState] = useState<WeightTrendState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const onSaved = () => setSavedCount((n) => n + 1)
    window.addEventListener(READINGS_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(READINGS_SAVED_EVENT, onSaved)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (readings) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', points: toTrendPoints(readings) })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher is intentionally excluded: a new inline function must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, savedCount])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
