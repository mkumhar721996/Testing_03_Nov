import { useState } from 'react'
import { BetRejectedError, getGuestId, postSpin, type SpinOutcome } from './spinApi'
import type { ApiSymbol } from './symbols'

// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
export const BET_STEPS = [1, 2, 3, 5, 10] as const
// TODO(rebase): uncertain merge — please review. Balance is still client-held here; wire in balance/useBalance (server balance) for the slot page.
export const START_BALANCE = 1000

export const FREE_GAMES_AWARD = 10 // placeholder, the free games epic owns the real rule
export const SCATTER_TRIGGER = 3
export const countScatters = (grid: ApiSymbol[][]) => grid.flat().filter((s) => s === 'SCATTER').length
export type FreeGamesPhase = 'idle' | 'two' | 'trigger' | 'free' | 'finished'

const toCents = (n: number) => Math.round(n * 100)

function coveredBet(balanceCents: number): number {
  return [...BET_STEPS].reverse().find((s) => toCents(s) <= balanceCents) ?? BET_STEPS[0]
}

type SpinFn = (bet: number, guestId: string) => Promise<SpinOutcome>

export function useSlotGame(spin: SpinFn = postSpin, { startBalance = START_BALANCE, initialFreeGames = 0 } = {}) {
  const [cents, setCents] = useState(toCents(startBalance))
  const [bet, setBet] = useState<number>(BET_STEPS[0])
  const [lastWinCents, setLastWinCents] = useState(0)
  const [grid, setGrid] = useState<ApiSymbol[][] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [freeGamesRemaining, setFreeGamesRemaining] = useState(initialFreeGames)
  const [freeGamesPhase, setFreeGamesPhase] = useState<FreeGamesPhase>(initialFreeGames > 0 ? 'free' : 'idle')
  const freeGamesActive = freeGamesRemaining > 0

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  function settle(newCents: number) {
    setCents(newCents)
    if (newCents < toCents(bet)) setBet(coveredBet(newCents))
  }

  async function runSpin() {
    const wasFree = freeGamesActive
    const stake = wasFree ? 0 : toCents(bet)
    setSpinning(true)
    setCents(cents - stake)
    try {
      const outcome = await spin(bet, getGuestId())
      const win = toCents(outcome.evaluation.totalWin)
      setGrid(outcome.grid)
      setLastWinCents(win)
      settle(cents - stake + win)
      if (wasFree) {
        const left = freeGamesRemaining - 1
        setFreeGamesRemaining(left)
        setFreeGamesPhase(left > 0 ? 'free' : 'finished')
      } else {
        const scatters = countScatters(outcome.grid)
        if (scatters >= SCATTER_TRIGGER) {
          setFreeGamesRemaining(FREE_GAMES_AWARD)
          setFreeGamesPhase('trigger')
        } else {
          setFreeGamesPhase(scatters === 2 ? 'two' : 'idle')
        }
      }
    } catch (err) {
      // Only a rejected bet has UI so far; give the stake back so nothing stays locked.
      if (err instanceof BetRejectedError) setBetError(err.message)
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
    freeGamesRemaining,
    freeGamesPhase,
    canBetDown: !spinning && !freeGamesActive && bet > BET_STEPS[0],
    canBetUp: !spinning && !freeGamesActive && next !== undefined && toCents(next) <= cents,
    canSpin: !spinning && (freeGamesActive || cents >= toCents(bet)),
    betDown: () => {
      setBetError(null)
      setBet(BET_STEPS[Math.max(0, BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) - 1)])
    },
    betUp: () => {
      setBetError(null)
      if (next !== undefined) setBet(next)
    },
    spin: runSpin,
  }
}
