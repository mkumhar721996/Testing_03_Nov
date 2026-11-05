import { useEffect, useRef, type KeyboardEvent } from 'react'
import { TINTS } from './ReelGrid'
import type { PaytableView } from './paytableApi'
import type { PaytableStatus } from './usePaytable'
import { symbolView } from './symbols'

interface PaytablePanelProps {
  open: boolean
  onClose: () => void
  onRetry: () => void
  status: PaytableStatus
  paytable: PaytableView | null
}

const ROW =
  'grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] items-center gap-[var(--space-2)] [overflow-wrap:anywhere]'
const RULE =
  'block rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] p-[var(--space-2)] [overflow-wrap:anywhere]'
const FOCUSABLE = 'button:not([disabled])'

export function PaytablePanel({ open, onClose, onRetry, status, paytable }: PaytablePanelProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open])

  if (!open) return null

  // Keep Tab inside the panel while it is modal.
  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const items = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!items?.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className="backdrop" data-testid="paytable-backdrop" onClick={onClose} />
      <div
        ref={modalRef}
        className="modal stack w-[min(calc(var(--modal-width)+var(--space-5)),100%-2*var(--space-3))] max-h-[calc(100%-var(--space-6))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paytable-title"
        onKeyDown={trapTab}
      >
        <div className="flex items-center justify-between gap-[var(--space-2)]">
          <h2 id="paytable-title" className="m-0 text-[length:var(--font-size-lg)]">
            Paytable
          </h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" aria-label="Close paytable" onClick={onClose}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
          Payouts are multiples of the stake on each payline (your bet divided by 10).
        </p>
        {status === 'error' ? (
          <div className="alert alert-danger" role="alert">
            <span>The paytable could not be loaded. Check your connection and try again.</span>
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : status !== 'ready' || !paytable ? (
          <div className="stack" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-[var(--space-5)]" />
            ))}
          </div>
        ) : (
          <>
            <div
              className={`${ROW} px-[var(--space-2)] text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)] [&>span:not(:first-child)]:text-right`}
              aria-hidden="true"
            >
              <span>Symbol</span>
              <span>3 of a kind</span>
              <span>4 of a kind</span>
              <span>5 of a kind</span>
            </div>
            <ul aria-label="Symbol payouts" className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
              {paytable.symbols.map(({ symbol, payouts }) => {
                const { label, tint } = symbolView(symbol)
                return (
                  <li
                    key={symbol}
                    className={`${ROW} rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] p-[var(--space-2)]`}
                  >
                    <span>
                      <span
                        aria-hidden="true"
                        className={`mr-[var(--space-2)] inline-block h-[var(--space-3)] w-[var(--space-3)] rounded-[var(--radius-sm)] border border-solid align-middle ${TINTS[tint]}`}
                      />
                      {label}
                    </span>
                    {([3, 4, 5] as const).map((n) => (
                      <span key={n} className="text-right font-[var(--font-weight-medium)] [font-variant-numeric:tabular-nums]">
                        <span className="sr-only">{n} of a kind: </span>
                        {payouts[n]}×
                      </span>
                    ))}
                  </li>
                )
              })}
            </ul>
            <div className={RULE}>
              <strong className="block">Wild</strong>
              <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{paytable.rules.wild}</span>
            </div>
            <div className={RULE}>
              <strong className="block">Scatter</strong>
              <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{paytable.rules.scatter}</span>
            </div>
          </>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Back to the game
        </button>
      </div>
    </>
  )
}
