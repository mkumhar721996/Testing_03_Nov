import { useCallback, useState } from 'react'
import { claimTopUp, startGuestSession, GuestSessionView } from '../api/guest-session'
import BalanceDisplay, { SessionBadge } from './BalanceDisplay'
import NoBalanceModal from './NoBalanceModal'
import StartPanel from './StartPanel'
import Toast from './Toast'

const NOTES = {
  new: 'Your guest balance is saved on this browser. Come back here to carry on.',
  resumed: 'Welcome back. Your guest balance is saved on this browser.',
  'used-up': 'Your guest balance is saved on this browser.',
  'topped-up': 'Your balance is back to the starting balance.',
} satisfies Record<SessionBadge, string>

type Pending = 'start' | 'claim' | null

export default function GuestGame() {
  const [view, setView] = useState<GuestSessionView | null>(null)
  const [badge, setBadge] = useState<SessionBadge>('new')
  const [pending, setPending] = useState<Pending>(null)
  const [failed, setFailed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const hideToast = useCallback(() => setToast(null), [])

  const run = async (kind: Exclude<Pending, null>, action: () => Promise<void>) => {
    setPending(kind)
    setFailed(false)
    try {
      await action()
    } catch {
      setFailed(true)
    } finally {
      setPending(null)
    }
  }

  const start = () =>
    run('start', async () => {
      const next = await startGuestSession()
      setView(next)
      setBadge(next.canClaimTopUp ? 'used-up' : next.resumed ? 'resumed' : 'new')
    })

  const claim = () =>
    run('claim', async () => {
      const next = await claimTopUp()
      setView(next)
      setBadge('topped-up')
      setToast(`Top-up claimed. Balance is ${next.startingBalance.toLocaleString('en-US')}`)
    })

  return (
    <div className="mx-auto flex max-w-[calc(var(--modal-width)*1.5)] flex-col gap-s3 p-s3">
      {view === null ? (
        <StartPanel pending={pending === 'start'} error={failed} onStart={start} />
      ) : (
        <>
          <BalanceDisplay balance={view.balance} badge={badge} />
          <div className="flex min-h-[calc(var(--space-6)*8)] items-center justify-center rounded-ds-lg border border-dashed border-ds-border-strong bg-ds-bg-muted p-s3 text-center text-ds-fg-muted">
            Game area
          </div>
          <p className="text-ds-sm text-ds-fg-muted">{NOTES[badge]}</p>
          {view.canClaimTopUp && (
            <NoBalanceModal
              startingBalance={view.startingBalance}
              pending={pending === 'claim'}
              error={failed}
              onClaim={claim}
            />
          )}
        </>
      )}
      {toast && <Toast message={toast} onHide={hideToast} />}
    </div>
  )
}
