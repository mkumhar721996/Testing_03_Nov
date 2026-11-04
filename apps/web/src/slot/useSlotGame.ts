import { useState } from 'react'
import { getGuestId, postSpin, type SpinOutcome } from './spinApi'
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

export const RESTART_BALANCE = 100

// uncollectedWin and freeGames are placeholders until the collect and free-games state exists.
export function useSlotGame(
  spin: SpinFn = postSpin,
  { startBalance = START_BALANCE, uncollectedWin = 0, freeGames = 0 } = {},
) {
  const [cents, setCents] = useState(toCents(startBalance))
  const [bet, setBet] = useState<number>(BET_STEPS[0])
  const [lastWinCents, setLastWinCents] = useState(0)
  const [grid, setGrid] = useState<ApiSymbol[][] | null>(null)
  const [spinning, setSpinning] = useState(false)

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  function settle(newCents: number) {
    setCents(newCents)
    if (newCents < toCents(bet)) setBet(coveredBet(newCents))
  }

  async function runSpin() {
    const stake = toCents(bet)
    setSpinning(true)
    setCents(cents - stake)
    try {
      const outcome = await spin(bet, getGuestId())
      const win = toCents(outcome.evaluation.totalWin)
      setGrid(outcome.grid)
      setLastWinCents(win)
      settle(cents - stake + win)
    } catch {
      // Error UI belongs to the spin error story; give the stake back so nothing stays locked.
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
    canBetDown: !spinning && bet > BET_STEPS[0],
    canBetUp: !spinning && next !== undefined && toCents(next) <= cents,
    canSpin: !spinning && cents >= toCents(bet),
    canRestart: !spinning && cents < toCents(BET_STEPS[0]) && uncollectedWin <= 0 && freeGames <= 0,
    restart: () => {
      setCents(toCents(RESTART_BALANCE))
      setBet(BET_STEPS[0])
      setLastWinCents(0)
    },
    betDown: () => setBet(BET_STEPS[Math.max(0, BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) - 1)]),
    betUp: () => next !== undefined && setBet(next),
    spin: runSpin,
  }
}
