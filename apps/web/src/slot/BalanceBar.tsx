import { BetControl } from '../components/BetControl'
import { formatCredits } from './gameConfig'

interface BalanceBarProps {
  balance: number
  win: number | null
  bet: number
  canBetDown: boolean
  canBetUp: boolean
  onBetDown: () => void
  onBetUp: () => void
}

export function BalanceBar({ balance, win, bet, canBetDown, canBetUp, onBetDown, onBetUp }: BalanceBarProps) {
  return (
    <footer className="balance-bar" data-testid="balance-bar" data-wf-id="balance-bar">
      <div className="cell credits">
        <span className="label">Credits</span>
        <strong className="value">{formatCredits(balance)}</strong>
      </div>
      <div className="cell bet">
        <BetControl bet={bet} canDecrease={canBetDown} canIncrease={canBetUp} onDecrease={onBetDown} onIncrease={onBetUp} />
      </div>
      <div className="cell win">
        <span className="label">Win</span>
        <strong className="value">{win === null ? '—' : formatCredits(win)}</strong>
      </div>
    </footer>
  )
}
