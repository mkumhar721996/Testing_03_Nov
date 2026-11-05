import { useCallback, useRef, useState } from 'react'
import { fetchPaytable, type PaytableView } from './paytableApi'

export type PaytableStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Fetches the paytable on the first `load()` and keeps it for the page's lifetime; only an error allows a refetch. */
export function usePaytable(fetcher: (signal?: AbortSignal) => Promise<PaytableView> = fetchPaytable) {
  const [status, setStatus] = useState<PaytableStatus>('idle')
  const [paytable, setPaytable] = useState<PaytableView | null>(null)
  const statusRef = useRef<PaytableStatus>('idle')

  const set = (next: PaytableStatus) => {
    statusRef.current = next
    setStatus(next)
  }

  const load = useCallback(() => {
    if (statusRef.current === 'loading' || statusRef.current === 'ready') return
    set('loading')
    fetcher().then(
      (view) => {
        setPaytable(view)
        set('ready')
      },
      () => set('error'),
    )
    // fetcher is intentionally excluded: a new inline function must not change load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, paytable, load }
}
