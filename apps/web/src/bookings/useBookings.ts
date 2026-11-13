import { useCallback, useEffect, useState } from 'react'
import { bookingsApi, NotAdminError, type Booking, type BookingsApi } from './bookingsApi'

export function useBookings(api: BookingsApi = bookingsApi) {
  const [unassigned, setUnassigned] = useState<Booking[]>([])
  const [assigned, setAssigned] = useState<Booking[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'failed' | 'not-admin' | null>(null)

  /** Resolves to the refreshed lists so callers can read a booking's new state. */
  const load = useCallback(async () => {
    try {
      const [un, as, techs] = await Promise.all([
        api.listBookings('unassigned'),
        api.listBookings('assigned'),
        api.listTechnicians(),
      ])
      setUnassigned(un)
      setAssigned(as)
      setNames(Object.fromEntries(techs.map((t) => [t.id, t.name])))
      setError(null)
      return { unassigned: un, assigned: as }
    } catch (err) {
      setError(err instanceof NotAdminError ? 'not-admin' : 'failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  function retry() {
    setLoading(true)
    void load()
  }

  return { unassigned, assigned, names, loading, error, setError, reload: load, retry }
}
