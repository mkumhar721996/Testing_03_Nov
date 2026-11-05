import { useState } from 'react'
import { BetControl } from '../components/BetControl'
import { PaytablePanel } from './PaytablePanel'
import { usePaytable } from './usePaytable'
import { ReelGrid } from './ReelGrid'
import { TopBar } from './TopBar'
import { BET_STEPS, useSlotGame } from './useSlotGame'
import type { SpinOutcome } from './spinApi'

const GAME_NAME = 'Wheels Go round Tiger'

interface SlotGamePageProps {
  spin?: (bet: number, guestId: string) => Promise<SpinOutcome>
}

export function SlotGamePage({ spin }: SlotGamePageProps) {
  const game = useSlotGame(spin)
  const lowBalance = !game.spinning && game.balance < BET_STEPS[0]
  const paytable = usePaytable()
  const [paytableOpen, setPaytableOpen] = useState(false)
  const openPaytable = () => {
    paytable.load()
    setPaytableOpen(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-muted)] text-[var(--color-fg)]">
      <TopBar gameName={GAME_NAME} balance={game.balance} lastWin={game.lastWin} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-[var(--space-3)] p-[var(--space-3)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <h1 className="[overflow-wrap:anywhere]">{GAME_NAME}</h1>
          <div className="flex items-center gap-[var(--space-2)]">
            <span className="badge">Free games: 0</span>
            <button
              type="button"
              className="btn btn-secondary"
              aria-haspopup="dialog"
              disabled={game.spinning}
              onClick={openPaytable}
            >
              Paytable
            </button>
          </div>
        </div>
        <div className="card stack">
          <ReelGrid grid={game.grid} spinning={game.spinning} />
          <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
            <BetControl
              bet={game.bet}
              canDecrease={game.canBetDown}
              canIncrease={game.canBetUp}
              onDecrease={game.betDown}
              onIncrease={game.betUp}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg ml-auto max-w-[240px] flex-[1_1_140px]"
              disabled={!game.canSpin}
              onClick={() => void game.spin()}
            >
              {game.spinning ? 'Spinning' : 'Spin'}
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {game.spinning ? (
            <div className="alert items-center">
              <span className="spinner" aria-hidden="true" />
              Spinning. The bet, Spin and Paytable are locked until the reels stop.
            </div>
          ) : lowBalance ? (
            <div className="alert alert-warning">
              Your balance of {game.balance.toFixed(2)} is below the lowest bet of {BET_STEPS[0].toFixed(2)}. Spin is
              off until your balance covers a bet.
            </div>
          ) : (
            <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              Choose a bet, then press Spin.
            </p>
          )}
        </div>
        <PaytablePanel
          open={paytableOpen}
          onClose={() => setPaytableOpen(false)}
          onRetry={paytable.load}
          status={paytable.status}
          paytable={paytable.paytable}
        />
      </main>
    </div>
  )
}
