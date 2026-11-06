import { useCallback, useEffect, useState } from 'react'
import { NotAdminError, capacityApi, type CapacityApi, type DayRow } from './capacityApi'

const DAYS_SHOWN = 5

export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function useSlotCapacity(api: CapacityApi = capacityApi) {
  const [rows, setRows] = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'failed' | 'not-admin' | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await api.fetchVisitLimits(today(), DAYS_SHOWN))
      setError(null)
    } catch (err) {
      setError(err instanceof NotAdminError ? 'not-admin' : 'failed')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  /** Saves one day's limit and refetches; a 403 sets the not-admin error and rethrows. */
  async function save(day: string, limit: number) {
    try {
      await api.putVisitLimit(day, limit)
    } catch (err) {
      if (err instanceof NotAdminError) setError('not-admin')
      throw err
    }
    await load()
  }

  function retry() {
    setLoading(true)
    void load()
  }

  return { rows, loading, error, save, retry }
}
