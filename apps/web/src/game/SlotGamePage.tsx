import { useState } from 'react'
import { BetControl } from '../components/BetControl'
import { FreeGamesCounter } from './FreeGamesCounter'
import { ReelGrid } from './ReelGrid'
import { remainingOf, useSlotGame, type GameState } from './useSlotGame'

const RESULT = 'mt-[var(--space-3)]'
const HEADING = 'text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]'

function Message({ state }: { state: GameState }) {
  switch (state.status) {
    case 'idle':
      return <p className={`${RESULT} text-muted`}>Land 3, 4 or 5 scatters to win free games.</p>
    case 'submitting':
      return (
        <div className={RESULT}>
          <div role="status" className="flex items-center gap-[var(--space-2)] font-[var(--font-weight-medium)]">
            <span className="spinner" aria-hidden="true" />
            Spinning…
          </div>
          <p className="text-muted">Waiting for the server result. No free games are shown until it arrives.</p>
        </div>
      )
    case 'error':
      return (
        <div role="alert" className={`alert alert-danger ${RESULT}`}>
          <div>
            <strong>The spin didn't complete.</strong>
            <div>
              We couldn't reach the server, so no result or free games were recorded. Your balance is
              unchanged.
            </div>
          </div>
        </div>
      )
    case 'result': {
      const { scatterCount, freeGames } = state.spin
      if (freeGames.awarded > 0) {
        return (
          <div className={RESULT}>
            <h3 role="status" className={HEADING}>
              {scatterCount} scatters: {freeGames.awarded} free games awarded
            </h3>
            <p className="text-muted">Spin result from the server.</p>
          </div>
        )
      }
      return (
        <div className={RESULT}>
          <p role="status" className="text-muted">
            {scatterCount >= 3
              ? `${scatterCount} scatters landed: no additional free games awarded.`
              : `${scatterCount} scatters: no free games this spin.`}
          </p>
        </div>
      )
    }
  }
}

export function SlotGamePage() {
  // The wallet is a separate story, so the balance stays local.
  const [balance] = useState(100)
  const { state, spin } = useSlotGame()
  const remaining = remainingOf(state)
  const submitting = state.status === 'submitting'
  const spinLabel = submitting ? 'Spinning…' : state.status === 'error' ? 'Try again' : 'Spin'
  const result = state.status === 'result' ? state.spin : undefined
  const unchanged = result !== undefined && result.scatterCount >= 3 && result.freeGames.awarded === 0

  return (
    <div className="flex flex-wrap gap-[var(--space-3)] p-[var(--space-3)] text-[var(--color-fg)]">
      <div className="min-w-0 flex-[1_1_320px]">
        <ReelGrid grid={result?.grid} scatterCount={result?.scatterCount} busy={submitting}>
          <Message state={state} />
        </ReelGrid>
        <div className="mt-[var(--space-3)]">
          <BetControl balance={balance} onSpin={spin} disabled={submitting} spinLabel={spinLabel} />
        </div>
      </div>
      <div className="w-[200px] max-[600px]:w-full">
        {remaining > 0 ? (
          <FreeGamesCounter remaining={remaining} unchanged={unchanged} />
        ) : (
          <p className="text-muted">No free games active.</p>
        )}
      </div>
    </div>
  )
}
