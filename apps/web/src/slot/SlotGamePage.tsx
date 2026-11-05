import { BetControl } from '../components/BetControl'
import { ReelGrid } from './ReelGrid'
import { TopBar } from './TopBar'
import { BET_STEPS, useSlotGame } from './useSlotGame'
import type { SpinOutcome } from './spinApi'

const GAME_NAME = 'Wheels Go round Tiger'

interface SlotGamePageProps {
  spin?: (bet: number, guestId: string) => Promise<SpinOutcome>
  freeGamesActive?: boolean
}

export function SlotGamePage({ spin, freeGamesActive = false }: SlotGamePageProps) {
  const game = useSlotGame(spin, { freeGamesActive })
  const lowBalance = !game.spinning && game.balance < BET_STEPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-muted)] text-[var(--color-fg)]">
      <TopBar gameName={GAME_NAME} balance={game.balance} lastWin={game.lastWin} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-[var(--space-3)] p-[var(--space-3)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <h1 className="[overflow-wrap:anywhere]">{GAME_NAME}</h1>
          {freeGamesActive ? (
            <p className="text-[length:var(--font-size-sm)]">
              <span className="badge badge-warning">Free games</span> The bet is locked while they play.
            </p>
          ) : (
            <span className="badge">Free games: 0</span>
          )}
        </div>
        {game.spinError && (
          <div className="alert alert-danger flex-col items-stretch" role="alert">
            <div className="flex items-start gap-[var(--space-2)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[var(--icon-size)] w-[var(--icon-size)] flex-none fill-none stroke-[var(--color-danger)] [stroke-linecap:round] [stroke-width:2]"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <div className="stack">
                <p className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">
                  {game.spinError.attempts > 1 ? 'The spin failed again.' : 'The spin failed.'}
                </p>
                <p>
                  No stake was taken, so your balance is still {game.balance.toFixed(2)}. Press Try again to spin again
                  at your bet of {game.spinError.failedBet.toFixed(2)}.
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-lg w-full" onClick={() => void game.retry()}>
              Try again
            </button>
          </div>
        )}
        <div className="card stack">
          <div className={game.spinError ? 'opacity-[var(--opacity-disabled)]' : undefined}>
            <ReelGrid grid={game.grid} spinning={game.spinning} />
          </div>
          {!game.spinError && (
            <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
              <BetControl
                bet={game.bet}
                canDecrease={game.canBetDown}
                canIncrease={game.canBetUp}
                onDecrease={game.betDown}
                onIncrease={game.betUp}
                errorId={game.betError ? 'bet-error' : undefined}
              />
              <button
                type="button"
                className="btn btn-primary ml-auto min-w-[96px] flex-none"
                disabled={!game.canSpin}
                onClick={() => void game.spin()}
              >
                {game.spinning ? 'Spinning' : 'Spin'}
              </button>
            </div>
          )}
          {game.betError && (
            <div className="alert alert-danger" role="alert" id="bet-error">
              <p>
                <strong>Bet not accepted.</strong> {game.betError}
              </p>
            </div>
          )}
        </div>
        <div aria-live="polite">
          {game.spinning ? (
            <div className="alert items-center">
              <span className="spinner" aria-hidden="true" />
              Spinning. The bet and Spin are locked until the reels stop.
            </div>
          ) : lowBalance ? (
            <div className="alert alert-warning">
              Your balance of {game.balance.toFixed(2)} is below the lowest bet of {BET_STEPS[0].toFixed(2)}. Spin is
              off until your balance covers a bet.
            </div>
          ) : game.spinError ? null : game.retried ? (
            <p role="status" className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              Spin complete at bet {game.bet.toFixed(2)}.{' '}
              {game.lastWin > 0 ? `You won ${game.lastWin.toFixed(2)}.` : 'No win this spin.'} Press Spin to play again.
            </p>
          ) : (
            <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              Choose a bet, then press Spin.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
