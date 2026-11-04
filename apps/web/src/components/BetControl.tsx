import { useState } from 'react'

// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
const ALLOWED_BETS = [1, 2, 3, 5, 10]
const BET_ERROR = `Bet must be one of ${ALLOWED_BETS.join(', ')} and not above your balance.`

export function BetControl({
  balance,
  balanceError = false,
  onRetryBalance,
  onSpin,
}: {
  balance: number | null
  balanceError?: boolean
  onRetryBalance?: () => void
  onSpin: (bet: number) => void
}) {
  const [value, setValue] = useState('1')
  const [error, setError] = useState<string | null>(null)

  function handleSpin() {
    const bet = Number(value)
    if (balance === null) return
    if (value.trim() === '' || !ALLOWED_BETS.includes(bet) || bet > balance) {
      setError(BET_ERROR)
      return
    }
    setError(null)
    onSpin(bet)
  }

  return (
    <div data-testid="balance-area" className="flex flex-col gap-2">
      {balance !== null ? (
        <p className="text-slate-900">
          Balance: <span data-testid="balance">{balance.toFixed(2)}</span>
        </p>
      ) : balanceError ? (
        <div className="flex items-center gap-[var(--space-2)]">
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--color-danger)]">
            Could not load your balance.
          </p>
          <button type="button" onClick={onRetryBalance} className="rounded border border-slate-300 px-2 py-1">
            Retry
          </button>
        </div>
      ) : (
        <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">Balance: loading</p>
      )}
      <div className="flex items-center gap-2">
        <label htmlFor="bet" className="text-slate-900">
          Bet
        </label>
        <input
          id="bet"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error !== null}
          className="w-20 rounded border border-slate-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={handleSpin}
          disabled={balance === null}
          className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50"
        >
          Spin
        </button>
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
