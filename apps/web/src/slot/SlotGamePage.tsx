import { BetControl } from '../components/BetControl'
import { ReelGrid } from './ReelGrid'
import { TopBar } from './TopBar'
import { WinBanner } from './WinBanner'
import { winningCells, winSummary } from './winCells'
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
        {game.phase === 'win' && game.win && (
          <>
            <WinBanner amount={game.win.amount} summary={winSummary(game.win.wins)} />
            <div className="card stack">
              <ReelGrid
                grid={game.win.grid}
                spinning={false}
                winCells={winningCells(game.win.wins)}
                label="Winning grid, winning symbols outlined and marked"
              />
              <div className="flex flex-wrap gap-[var(--space-3)]">
                <button type="button" className="btn btn-secondary btn-lg flex-[1_1_140px]" onClick={game.collect}>
                  Collect
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg flex-[1_1_140px]"
                  disabled={!game.canSpin}
                  onClick={() => void game.spin()}
                >
                  Spin again
                </button>
              </div>
            </div>
          </>
        )}
        {game.phase !== 'win' && (
        <div className="card stack">
          <ReelGrid grid={game.grid} spinning={game.spinning} />
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
              className="btn btn-primary btn-lg ml-auto max-w-[240px] flex-[1_1_140px]"
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
        )}
        <div aria-live="polite">
          {game.phase === 'win' ? null : game.spinning ? (
            <div className="alert items-center" role="status">
              <span className="spinner" aria-hidden="true" />
              Spinning. The reels are still turning.
            </div>
          ) : game.phase === 'nowin' ? (
            <p role="status">No win this spin. Press Spin to play again.</p>
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
      </main>
    </div>
  )
}
