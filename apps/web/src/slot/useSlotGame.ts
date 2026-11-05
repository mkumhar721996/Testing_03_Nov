import { useState } from 'react'
import { BetRejectedError, getGuestId, postSpin, type SpinOutcome } from './spinApi'
import type { ApiSymbol } from './symbols'

// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
export const BET_STEPS = [1, 2, 3, 5, 10] as const
// TODO(rebase): uncertain merge — please review. Balance is still client-held here; wire in balance/useBalance (server balance) for the slot page.
export const START_BALANCE = 1000

const toCents = (n: number) => Math.round(n * 100)

function coveredBet(balanceCents: number): number {
  return [...BET_STEPS].reverse().find((s) => toCents(s) <= balanceCents) ?? BET_STEPS[0]
}

type SpinFn = (bet: number, guestId: string) => Promise<SpinOutcome>

export function useSlotGame(spin: SpinFn = postSpin, { startBalance = START_BALANCE, freeGamesActive = false } = {}) {
  const [cents, setCents] = useState(toCents(startBalance))
  const [bet, setBet] = useState<number>(BET_STEPS[0])
  const [lastWinCents, setLastWinCents] = useState(0)
  const [grid, setGrid] = useState<ApiSymbol[][] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [spinError, setSpinError] = useState<{ failedBet: number; attempts: number } | null>(null)
  const [retried, setRetried] = useState(false)

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  function settle(newCents: number) {
    setCents(newCents)
    if (newCents < toCents(bet)) setBet(coveredBet(newCents))
  }

  async function runSpin(stakeBet: number = bet, isRetry = false): Promise<void> {
    const stake = toCents(stakeBet)
    const previousAttempts = isRetry ? (spinError?.attempts ?? 0) : 0
    setSpinning(true)
    setBetError(null)
    setSpinError(null)
    setCents(cents - stake)
    try {
      const outcome = await spin(stakeBet, getGuestId())
      const win = toCents(outcome.evaluation.totalWin)
      setGrid(outcome.grid)
      setLastWinCents(win)
      setRetried(isRetry)
      settle(cents - stake + win)
    } catch (err) {
      // A rejected bet keeps its own message; any other failure offers Try again at the same bet.
      if (err instanceof BetRejectedError) setBetError(err.message)
      else setSpinError({ failedBet: stakeBet, attempts: previousAttempts + 1 })
      // Give the stake back so nothing stays locked.
      setCents(cents)
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
    spinError,
    retried,
    retry: () => (spinError ? runSpin(spinError.failedBet, true) : undefined),
    canBetDown: !spinning && !freeGamesActive && bet > BET_STEPS[0],
    canBetUp: !spinning && !freeGamesActive && next !== undefined && toCents(next) <= cents,
    canSpin: !spinning && cents >= toCents(bet),
    betDown: () => {
      setBetError(null)
      setBet(BET_STEPS[Math.max(0, BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) - 1)])
    },
    betUp: () => {
      setBetError(null)
      if (next !== undefined) setBet(next)
    },
    spin: () => runSpin(),
  }
}
