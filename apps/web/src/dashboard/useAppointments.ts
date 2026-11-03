import { useCallback, useEffect, useState } from 'react'
import { fetchAppointments, upcomingAppointments, type Appointment } from './appointments'

export type AppointmentsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; upcoming: Appointment[] }

export function useAppointments(
  fetcher: (signal?: AbortSignal) => Promise<Appointment[]> = fetchAppointments,
  now: () => Date = () => new Date(),
) {
  const [state, setState] = useState<AppointmentsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (all) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', upcoming: upcomingAppointments(all, now()) })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
    // fetcher and now are intentionally excluded: new inline functions must not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
