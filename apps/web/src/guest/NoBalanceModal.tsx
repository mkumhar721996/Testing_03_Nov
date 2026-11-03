import { useEffect, useRef } from 'react'

interface NoBalanceModalProps {
  startingBalance: number
  pending: boolean
  error: boolean
  onClaim: () => void
}

export default function NoBalanceModal({ startingBalance, pending, error, onClaim }: NoBalanceModalProps) {
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    button.current?.focus()
  }, [])

  // The only focusable control is the button, so trapping focus means keeping it there.
  // Escape is deliberately not handled: the game cannot be played at zero.
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      button.current?.focus()
    }
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="no-balance-heading"
        aria-describedby="no-balance-text"
        onKeyDown={trapFocus}
      >
        <h2 id="no-balance-heading">No balance left</h2>
        <p id="no-balance-text">Your guest balance is used up. Claim a top-up to keep playing.</p>
        <p className="text-ds-sm text-ds-fg-muted">
          The top-up sets your balance back to {startingBalance.toLocaleString('en-US')}.
        </p>
        {error && (
          <p role="alert" className="text-ds-sm text-ds-danger">
            We could not claim the top-up. Try again.
          </p>
        )}
        <div>
          <button
            ref={button}
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={onClaim}
          >
            {pending ? 'Claiming top-up' : 'Claim top-up'}
          </button>
        </div>
      </div>
    </>
  )
}
