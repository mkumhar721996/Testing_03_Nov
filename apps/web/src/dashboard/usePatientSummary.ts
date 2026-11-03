import { useCallback, useEffect, useState } from 'react'
import { fetchPatientSummary, type PatientSummary } from './patientSummary'

export type SummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; summary: PatientSummary }

export function usePatientSummary(fetcher: (signal?: AbortSignal) => Promise<PatientSummary> = fetchPatientSummary) {
  const [state, setState] = useState<SummaryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (summary) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', summary })
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
