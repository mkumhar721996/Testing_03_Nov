import { formatCredits } from '../slot/gameConfig'

interface BetControlProps {
  bet: number
  canDecrease: boolean
  canIncrease: boolean
  onDecrease: () => void
  onIncrease: () => void
}

const buttonClass = 'btn btn-secondary btn-icon btn-lg'

export function BetControl({ bet, canDecrease, canIncrease, onDecrease, onIncrease }: BetControlProps) {
  return (
    <div
      data-wf-id="bet-control"
      role="group"
      aria-label="Bet"
      className="flex items-center gap-[var(--space-2)]"
    >
      <button type="button" className={buttonClass} aria-label="Decrease bet" disabled={!canDecrease} onClick={onDecrease}>
        <span aria-hidden="true">−</span>
      </button>
      <div className="flex min-w-[96px] flex-col text-center leading-[1.2]">
        <span id="bet-label" className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
          Bet
        </span>
        <output
          aria-labelledby="bet-label"
          className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] tabular-nums"
        >
          {formatCredits(bet)}
        </output>
      </div>
      <button type="button" className={buttonClass} aria-label="Increase bet" disabled={!canIncrease} onClick={onIncrease}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
