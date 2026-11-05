import { useRef, useState } from 'react'
import { useBalance } from '../balance/useBalance'
import { BalanceBar } from './BalanceBar'
import { ControlBar } from './ControlBar'
import { JackpotPanel } from './JackpotPanel'
import { PaytableModal } from './PaytableModal'
import { ReelGrid } from './ReelGrid'
import { SpinNotice } from './SpinNotice'
import { StatusBar } from './StatusBar'
import { BET_STEPS } from './gameConfig'
import { useSlotGame } from './useSlotGame'
import type { SpinOutcome } from './spinApi'
import './flamingHotGold.css'

type SpinFn = (bet: number, guestId: string, signal?: AbortSignal) => Promise<SpinOutcome>

interface SlotGamePageProps {
  spin?: SpinFn
  balanceFetcher?: (signal?: AbortSignal) => Promise<number>
}

function GameScreen({ spin, startBalance }: { spin?: SpinFn; startBalance: number }) {
  const game = useSlotGame(spin, { startBalance })
  const [paytableOpen, setPaytableOpen] = useState(false)
  const infoRef = useRef<HTMLButtonElement>(null)
  const lowBalance = game.balance < BET_STEPS[0]

  return (
    <div className="game">
      <StatusBar />
      <JackpotPanel hit={game.jackpot} />
      <main className="reel-area" data-wf-id="reel-area">
        <ReelGrid grid={game.grid} spinning={game.spinning} turbo={game.turbo} />
        <div className="spin-message" data-testid="spin-message" role="status">
          {game.message}
        </div>
        <ControlBar
          spinning={game.spinning}
          canSpin={game.canSpin}
          auto={game.auto}
          turbo={game.turbo}
          onSpin={() => void game.spin()}
          onStartAutoplay={(count) => void game.startAutoplay(count)}
          onStopAutoplay={game.stopAutoplay}
          onToggleTurbo={game.toggleTurbo}
          onOpenInfo={() => setPaytableOpen(true)}
          infoRef={infoRef}
        />
      </main>
      <SpinNotice spinning={game.spinning} lowBalance={lowBalance} notice={game.notice} />
      <BalanceBar
        balance={game.balance}
        win={game.win}
        bet={game.bet}
        canBetDown={game.canBetDown}
        canBetUp={game.canBetUp}
        onBetDown={game.betDown}
        onBetUp={game.betUp}
      />
      {paytableOpen && <PaytableModal onClose={() => setPaytableOpen(false)} returnFocusTo={infoRef} />}
    </div>
  )
}

export function SlotGamePage({ spin, balanceFetcher }: SlotGamePageProps) {
  const { state, retry } = useBalance(balanceFetcher)

  return (
    <div className="game-page">
      {state.status === 'loaded' ? (
        <GameScreen spin={spin} startBalance={state.balance} />
      ) : (
        <div className="game game-state">
          <h1>Flaming Hot Gold™</h1>
          {state.status === 'loading' ? (
            <div className="skeleton" role="status" aria-label="Loading your balance" style={{ height: 'var(--control-height-lg)', width: '100%' }} />
          ) : (
            <div className="alert alert-danger" role="alert">
              <span>We could not load your balance.</span>
              <button type="button" className="btn btn-secondary" onClick={retry}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
