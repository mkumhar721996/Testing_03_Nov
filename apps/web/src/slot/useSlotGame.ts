import { useState } from 'react'
import { BetRejectedError, getGuestId, postSpin, type SpinOutcome } from './spinApi'
import type { ApiSymbol } from './symbols'

// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
export const BET_STEPS = [1, 2, 3, 5, 10] as const
// Mirrors STARTING_BALANCE in services/api/src/player/player.constants.ts. Shown until the first
// completed spin, which adopts the server's balance.
export const START_BALANCE = 100

const toCents = (n: number) => Math.round(n * 100)

type SpinFn = (bet: number, guestId: string) => Promise<SpinOutcome>

export function useSlotGame(spin: SpinFn = postSpin, { startBalance = START_BALANCE, freeGamesActive = false } = {}) {
  const [cents, setCents] = useState(toCents(startBalance))
  const [bet, setBet] = useState<number>(BET_STEPS[0])
  const [lastWinCents, setLastWinCents] = useState(0)
  const [grid, setGrid] = useState<ApiSymbol[][] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [spinFailed, setSpinFailed] = useState(false)
  const [lastStake, setLastStake] = useState(0)

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  async function runSpin() {
    setSpinning(true)
    setSpinFailed(false)
    setLastStake(0)
    try {
      const outcome = await spin(bet, getGuestId())
      setGrid(outcome.grid)
      setLastWinCents(toCents(outcome.evaluation.totalWin))
      // The server takes the stake with the spin; a free game takes nothing. The win is not credited here.
      if (!freeGamesActive) {
        setCents(toCents(outcome.balance))
        setLastStake(bet)
      }
    } catch (err) {
      if (err instanceof BetRejectedError) setBetError(err.message)
      else setSpinFailed(true)
    } finally {
      setSpinning(false)
    }
  }

  return {
    balance: cents / 100,
    lastWin: lastWinCents / 100,
    bet,
    grid,
    spinning,
    betError,
    spinFailed,
    lastStake,
    canBetDown: !spinning && !freeGamesActive && bet > BET_STEPS[0],
    canBetUp: !spinning && !freeGamesActive && next !== undefined && toCents(next) <= cents,
    canSpin: !spinning && !spinFailed && cents >= toCents(bet),
    betDown: () => {
      setBetError(null)
      setSpinFailed(false)
      setBet(BET_STEPS[Math.max(0, BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) - 1)])
    },
    betUp: () => {
      setBetError(null)
      setSpinFailed(false)
      if (next !== undefined) setBet(next)
    },
    spin: runSpin,
    retry: runSpin,
  }
}
