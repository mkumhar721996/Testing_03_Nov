import { useEffect, useRef, useState } from 'react'
import { BET_STEPS, SPIN_MS, SPIN_TIMEOUT_MS, TURBO_SPIN_MS, formatCredits } from './gameConfig'
import { getGuestId, postSpin, type SpinOutcome } from './spinApi'
import type { ApiSymbol } from './symbols'

export { BET_STEPS }

const toCents = (n: number) => Math.round(n * 100)
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const plural = (n: number) => `${formatCredits(n)} ${n === 1 ? 'credit' : 'credits'}`

function coveredBet(balanceCents: number): number {
  return [...BET_STEPS].reverse().find((s) => toCents(s) <= balanceCents) ?? BET_STEPS[0]
}

type SpinFn = (bet: number, guestId: string, signal?: AbortSignal) => Promise<SpinOutcome>
type SpinResult = 'ok' | 'error' | 'skipped'
export type Notice = { kind: 'win' | 'jackpot' | 'error' | 'autoplay'; text: string } | null

interface Options {
  startBalance: number
  spinMs?: number
  turboMs?: number
  timeoutMs?: number
}

export function useSlotGame(
  spin: SpinFn = postSpin,
  { startBalance, spinMs = SPIN_MS, turboMs = TURBO_SPIN_MS, timeoutMs = SPIN_TIMEOUT_MS }: Options,
) {
  const [cents, setCentsState] = useState(toCents(startBalance))
  const [bet, setBetState] = useState<number>(BET_STEPS[0])
  const [winCents, setWinCents] = useState<number | null>(0)
  const [grid, setGrid] = useState<ApiSymbol[][] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [turbo, setTurbo] = useState(false)
  const [jackpot, setJackpot] = useState(false)
  const [message, setMessage] = useState('Press spin to play')
  const [notice, setNotice] = useState<Notice>(null)
  const [auto, setAuto] = useState({ on: false, left: 0 })

  // Refs mirror state so spins chained by autoplay always see the latest values.
  const centsRef = useRef(cents)
  const betRef = useRef<number>(bet)
  const turboRef = useRef(turbo)
  const inFlight = useRef(false)
  const autoRunning = useRef(false)
  const stopRequested = useRef(false)

  useEffect(
    () => () => {
      stopRequested.current = true
    },
    [],
  )

  const setCents = (n: number) => {
    centsRef.current = n
    setCentsState(n)
  }
  const setBet = (n: number) => {
    betRef.current = n
    setBetState(n)
  }

  const next = BET_STEPS[BET_STEPS.indexOf(bet as (typeof BET_STEPS)[number]) + 1]

  async function runSpin(): Promise<SpinResult> {
    // Set synchronously so a double tap in one tick cannot send two requests.
    if (inFlight.current || centsRef.current < toCents(betRef.current)) return 'skipped'
    inFlight.current = true
    const stake = toCents(betRef.current)
    const after = centsRef.current - stake
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('Spin timed out'))
      }, timeoutMs)
    })

    setSpinning(true)
    setCents(after)
    setWinCents(0)
    setJackpot(false)
    setNotice(null)
    setMessage('Spinning…')
    try {
      const [outcome] = await Promise.all([
        Promise.race([spin(betRef.current, getGuestId(), controller.signal), timedOut]),
        sleep(turboRef.current ? turboMs : spinMs),
      ])
      setGrid(outcome.grid)
      if (outcome.jackpotTrigger) {
        setJackpot(true)
        setWinCents(null)
        setMessage('Jackpot')
        setNotice({ kind: 'jackpot', text: 'No win amount is added for this spin.' })
        settle(after)
      } else {
        const win = toCents(outcome.evaluation.totalWin)
        setWinCents(win)
        setMessage(win > 0 ? `Win ${plural(win / 100)}` : 'No win this time')
        if (win > 0) setNotice({ kind: 'win', text: `Win ${plural(win / 100)}.` })
        settle(after + win)
      }
      return 'ok'
    } catch {
      // The stake stays deducted: the server records the spin and the screen does not guess a refund.
      setMessage('Spin failed')
      setNotice({ kind: 'error', text: 'The spin did not go through. Press Spin to try again.' })
      return 'error'
    } finally {
      clearTimeout(timer)
      inFlight.current = false
      setSpinning(false)
    }
  }

  function settle(newCents: number) {
    setCents(newCents)
    if (newCents < toCents(betRef.current)) setBet(coveredBet(newCents))
  }

  function stopAutoplay() {
    stopRequested.current = true
  }

  async function startAutoplay(count: number) {
    if (autoRunning.current || inFlight.current) return
    autoRunning.current = true
    stopRequested.current = false
    let note = ''
    for (let i = 0; i < count; i++) {
      const used = toCents(betRef.current)
      if (stopRequested.current) break
      if (centsRef.current < used) {
        note = 'Autoplay stopped: your credits no longer cover the bet.'
        break
      }
      setAuto({ on: true, left: count - i })
      const result = await runSpin()
      if (result !== 'ok') break
      if (centsRef.current < used && i < count - 1) {
        note = 'Autoplay stopped: your credits no longer cover the bet.'
        break
      }
    }
    autoRunning.current = false
    setAuto({ on: false, left: 0 })
    if (note) setNotice({ kind: 'autoplay', text: note })
  }

  return {
    balance: cents / 100,
    win: winCents === null ? null : winCents / 100,
    bet,
    grid,
    spinning,
    turbo,
    jackpot,
    message,
    notice,
    auto,
    canBetDown: !spinning && bet > BET_STEPS[0],
    canBetUp: !spinning && next !== undefined && toCents(next) <= cents,
    canSpin: !spinning && cents >= toCents(bet),
    betDown: () => {
      if (!inFlight.current) setBet(BET_STEPS[Math.max(0, BET_STEPS.indexOf(betRef.current as (typeof BET_STEPS)[number]) - 1)])
    },
    betUp: () => {
      const up = BET_STEPS[BET_STEPS.indexOf(betRef.current as (typeof BET_STEPS)[number]) + 1]
      if (!inFlight.current && up !== undefined && toCents(up) <= centsRef.current) setBet(up)
    },
    toggleTurbo: () => {
      turboRef.current = !turboRef.current
      setTurbo(turboRef.current)
    },
    spin: async () => {
      await runSpin()
    },
    startAutoplay,
    stopAutoplay,
  }
}
