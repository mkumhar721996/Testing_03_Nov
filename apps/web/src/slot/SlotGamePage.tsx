import { BetControl } from '../components/BetControl'
import { ReelGrid } from './ReelGrid'
import { TopBar } from './TopBar'
import { BET_STEPS, useSlotGame } from './useSlotGame'
import type { SpinOutcome } from './spinApi'

const GAME_NAME = 'Wheels Go round Tiger'

interface SlotGamePageProps {
  spin?: (bet: number, guestId: string) => Promise<SpinOutcome>
  initialFreeGames?: number
}

export function SlotGamePage({ spin, initialFreeGames = 0 }: SlotGamePageProps) {
  const game = useSlotGame(spin, { initialFreeGames })
  const n = game.freeGamesRemaining
  const free = n > 0
  const games = `${n} free ${n === 1 ? 'game' : 'games'}`
  const lowBalance = !game.spinning && game.balance < BET_STEPS[0]

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-muted)] text-[var(--color-fg)]">
      <TopBar gameName={GAME_NAME} balance={game.balance} lastWin={game.lastWin} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-[var(--space-3)] p-[var(--space-3)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <h1 className="[overflow-wrap:anywhere]">{GAME_NAME}</h1>
          <div aria-live="polite">
            {free && (
              <span
                className="badge px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums]"
                data-wf-id="free-games-counter"
              >
                Free games: {n} remaining
              </span>
            )}
          </div>
        </div>
        <div className={`card stack ${free ? 'border-[var(--color-primary)]' : ''}`}>
          <ReelGrid grid={game.grid} spinning={game.spinning} highlightScatters={game.freeGamesPhase === 'trigger'} />
          <div className="flex flex-wrap items-end justify-start gap-[var(--space-3)]">
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
              className="btn btn-primary btn-lg min-w-[calc(var(--control-height-lg)*2)] flex-none"
              disabled={!game.canSpin}
              onClick={() => void game.spin()}
            >
              {game.spinning ? 'Spinning' : 'Spin'}
            </button>
          </div>
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
              {free
                ? `Free game spinning. ${games} remaining.`
                : 'Spinning. The bet and Spin are locked until the reels stop.'}
            </div>
          ) : lowBalance ? (
            <div className="alert alert-warning">
              Your balance of {game.balance.toFixed(2)} is below the lowest bet of {BET_STEPS[0].toFixed(2)}. Spin is
              off until your balance covers a bet.
            </div>
          ) : game.freeGamesPhase === 'trigger' ? (
            <div className="alert">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3 6.3 7 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l7-1z" />
              </svg>
              3 scatters. Free games start. You have {games}. Press Spin to play the first one.
            </div>
          ) : (
            <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              {free
                ? `${games} remaining. Press Spin to play the next free game. No stake is taken.`
                : game.freeGamesPhase === 'finished'
                  ? 'Free games finished. Choose a bet, then press Spin.'
                  : game.freeGamesPhase === 'two'
                    ? `Spin complete at bet ${game.bet}. 2 scatters, which is not enough for free games. Press Spin to play again.`
                    : 'Choose a bet, then press Spin.'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
