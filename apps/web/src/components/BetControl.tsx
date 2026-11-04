import { useState } from 'react'

// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
const ALLOWED_BETS = [1, 2, 3, 5, 10]
const BET_ERROR = `Bet must be one of ${ALLOWED_BETS.join(', ')} and not above your balance.`

export function BetControl({
  balance,
  onSpin,
  disabled = false,
  spinLabel = 'Spin',
}: {
  balance: number
  onSpin: (bet: number) => void
  disabled?: boolean
  spinLabel?: string
}) {
  const [value, setValue] = useState('1')
  const [error, setError] = useState<string | null>(null)

  function handleSpin() {
    const bet = Number(value)
    if (value.trim() === '' || !ALLOWED_BETS.includes(bet) || bet > balance) {
      setError(BET_ERROR)
      return
    }
    setError(null)
    onSpin(bet)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-slate-900">
        Balance: <span data-testid="balance">{balance.toFixed(2)}</span>
      </p>
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
          disabled={disabled}
          className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-[var(--opacity-disabled)]"
        >
          {spinLabel}
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
