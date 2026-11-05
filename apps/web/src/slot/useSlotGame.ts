import { useEffect, useState } from 'react'
import { clearState, loadState, saveState } from './slotState'
import {
  BetRejectedError,
  getGuestId,
  getLatestSpin,
  postSpin,
  type PaylineWin,
  type SpinOutcome,
} from './spinApi'
import type { ApiSymbol } from './symbols'

export type Phase = 'idle' | 'spinning' | 'win' | 'nowin'
export interface Win {
  amount: number
  grid: ApiSymbol[][]
  wins: PaylineWin[]
}

const POLL_MS = 1000
// A spin lost on the server never gets a record; stop waiting rather than stay locked.
const MAX_POLLS = 30

const toWin = (o: SpinOutcome): Win => ({ amount: o.evaluation.totalWin, grid: o.grid, wins: o.evaluation.wins ?? [] })

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
  const [stored] = useState(() => loadState(getGuestId()))
  const [phase, setPhase] = useState<Phase>(stored?.kind ?? 'idle')
  const [win, setWin] = useState<Win | null>(stored?.kind === 'win' ? toWin(stored.outcome) : null)
  const [betError, setBetError] = useState<string | null>(null)
  const spinning = phase === 'spinning'

  function showOutcome(outcome: SpinOutcome) {
    setGrid(outcome.grid)
    if (outcome.evaluation.totalWin > 0) {
      setWin(toWin(outcome))
      setPhase('win')
      saveState(getGuestId(), { kind: 'win', outcome })
    } else {
      setPhase('nowin')
      clearState(getGuestId())
    }
  }

  // A reload lost the in-flight request; the server still records the spin, so read it back.
  useEffect(() => {
    if (stored?.kind !== 'spinning') return
    const guestId = getGuestId()
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let polls = 0
    const poll = async () => {
      try {
        const latest = await getLatestSpin(guestId, controller.signal)
        if (controller.signal.aborted) return
        if (latest && Date.parse(latest.spunAt) >= stored.startedAt) return showOutcome(latest)
      } catch {
        // try again on the next poll
      }
      if (controller.signal.aborted) return
      if (++polls >= MAX_POLLS) {
        clearState(guestId)
        setPhase('idle')
        return
      }
      timer = setTimeout(() => void poll(), POLL_MS)
    }
    void poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
    // Runs once for the state read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  function settle(newCents: number) {
    setCents(newCents)
    if (newCents < toCents(bet)) setBet(coveredBet(newCents))
  }

  async function runSpin() {
    const stake = toCents(bet)
    setWin(null)
    setPhase('spinning')
    saveState(getGuestId(), { kind: 'spinning', startedAt: Date.now() })
    setCents(cents - stake)
    try {
      const outcome = await spin(bet, getGuestId())
      const won = toCents(outcome.evaluation.totalWin)
      setLastWinCents(won)
      settle(cents - stake + won)
      showOutcome(outcome)
    } catch (err) {
      // Only a rejected bet has UI so far; give the stake back so nothing stays locked.
      if (err instanceof BetRejectedError) setBetError(err.message)
      setCents(cents)
      clearState(getGuestId())
      setPhase('idle')
    }
  }

  function collect() {
    clearState(getGuestId())
    setWin(null)
    setPhase('idle')
  }

  return {
    balance: cents / 100,
    lastWin: lastWinCents / 100,
    bet,
    grid,
    spinning,
    phase,
    win,
    collect,
    betError,
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
    spin: runSpin,
  }
}
