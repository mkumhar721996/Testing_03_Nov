import { act, renderHook } from '@testing-library/react'
import { useSlotGame } from './useSlotGame'
import type { SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin: number, jackpotTrigger = false): SpinOutcome => ({
  grid,
  bet: 1,
  evaluation: { totalWin },
  jackpotTrigger,
})
const fast = { spinMs: 0, turboMs: 0 }
const setup = (spin = vi.fn(), opts: Partial<Parameters<typeof useSlotGame>[1]> = {}) =>
  renderHook(() => useSlotGame(spin, { startBalance: 100, ...fast, ...opts }))

function held() {
  let resolve!: (o: SpinOutcome) => void
  const spin = vi.fn().mockReturnValue(new Promise<SpinOutcome>((r) => (resolve = r)))
  return { spin, resolve }
}

describe('useSlotGame', () => {
  afterEach(() => vi.useRealTimers())

  it('starts at the lowest bet with win 0', () => {
    const { result } = setup()
    expect(result.current.bet).toBe(1)
    expect(result.current.win).toBe(0)
    expect(result.current.balance).toBe(100)
    expect(result.current.canBetDown).toBe(false)
  })

  it('steps the bet up and down (AC1, AC2)', () => {
    const { result } = setup()
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(2)
    act(() => result.current.betDown())
    expect(result.current.bet).toBe(1)
  })

  it('stops at the top and bottom steps (AC21-AC24)', () => {
    const { result } = setup()
    act(() => result.current.betDown())
    expect(result.current.bet).toBe(1)
    for (let i = 0; i < 5; i++) act(() => result.current.betUp())
    expect(result.current.bet).toBe(10)
    expect(result.current.canBetUp).toBe(false)
  })

  it('disables plus when the next step exceeds the balance', () => {
    const { result } = setup(vi.fn(), { startBalance: 4 })
    act(() => result.current.betUp())
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(3)
    expect(result.current.canBetUp).toBe(false)
  })

  it('disables Spin when the balance is below the lowest bet (AC11, AC12)', () => {
    const { result } = setup(vi.fn(), { startBalance: 0.5 })
    expect(result.current.canSpin).toBe(false)
  })

  it('snaps the bet down after a spin leaves too little balance', async () => {
    const { result } = setup(vi.fn().mockResolvedValue(outcome(0)), { startBalance: 6 })
    for (let i = 0; i < 3; i++) act(() => result.current.betUp())
    expect(result.current.bet).toBe(5)
    await act(() => result.current.spin())
    expect(result.current.balance).toBe(1)
    expect(result.current.bet).toBe(1)
  })

  it('locks controls while spinning, deducts the bet and then shows the win (AC5-AC9)', async () => {
    const { spin, resolve } = held()
    const { result } = setup(spin)
    let p!: Promise<void>
    act(() => {
      p = result.current.spin()
    })
    expect(result.current.spinning).toBe(true)
    expect(result.current.message).toBe('Spinning…')
    expect(result.current.canBetDown || result.current.canBetUp || result.current.canSpin).toBe(false)
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(1)
    expect(result.current.balance).toBe(99)
    await act(async () => {
      resolve(outcome(5))
      await p
    })
    expect(result.current.spinning).toBe(false)
    expect(result.current.balance).toBe(104)
    expect(result.current.win).toBe(5)
    expect(result.current.message).toBe('Win 5 credits')
    expect(result.current.grid).toBe(grid)
  })

  it('shows a no-win message (AC7)', async () => {
    const { result } = setup(vi.fn().mockResolvedValue(outcome(0)))
    await act(() => result.current.spin())
    expect(result.current.message).toBe('No win this time')
  })

  it('starts only one spin for two calls in one tick (AC10)', async () => {
    const { spin, resolve } = held()
    const { result } = setup(spin)
    let ps: Promise<void>[] = []
    act(() => {
      ps = [result.current.spin(), result.current.spin()]
    })
    expect(spin).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve(outcome(0))
      await Promise.all(ps)
    })
    expect(result.current.balance).toBe(99)
  })

  it('flags a jackpot spin with no win amount (AC29, AC30)', async () => {
    const { result } = setup(vi.fn().mockResolvedValue(outcome(0, true)))
    await act(() => result.current.spin())
    expect(result.current.jackpot).toBe(true)
    expect(result.current.win).toBeNull()
    expect(result.current.message).toBe('Jackpot')
    expect(result.current.notice?.kind).toBe('jackpot')
  })

  it('stops the reels, shows an error and keeps the bet deducted on failure (AC31-AC33)', async () => {
    const { result } = setup(vi.fn().mockRejectedValue(new Error('boom')))
    await act(() => result.current.spin())
    expect(result.current.spinning).toBe(false)
    expect(result.current.notice?.kind).toBe('error')
    expect(result.current.balance).toBe(99)
  })

  it('aborts the request and fails after the timeout (AC31-AC33)', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const spin = vi.fn().mockImplementation((_b: number, _g: string, s: AbortSignal) => {
      signal = s
      return new Promise(() => {})
    })
    const { result } = setup(spin, { timeoutMs: 1000 })
    let p!: Promise<void>
    act(() => {
      p = result.current.spin()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
      await p
    })
    expect(signal?.aborted).toBe(true)
    expect(result.current.spinning).toBe(false)
    expect(result.current.notice?.kind).toBe('error')
    expect(result.current.balance).toBe(99)
  })

  it('toggles turbo and settles after turboMs instead of spinMs (AC15, AC16)', async () => {
    vi.useFakeTimers()
    const { result } = setup(vi.fn().mockResolvedValue(outcome(0)), { spinMs: 1000, turboMs: 100 })
    act(() => result.current.toggleTurbo())
    expect(result.current.turbo).toBe(true)
    act(() => {
      void result.current.spin()
    })
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(result.current.spinning).toBe(false)
    act(() => result.current.toggleTurbo())
    expect(result.current.turbo).toBe(false)
    act(() => {
      void result.current.spin()
    })
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(result.current.spinning).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(900))
    expect(result.current.spinning).toBe(false)
  })

  describe('autoplay', () => {
    it('runs exactly the chosen count and stops (AC13, AC14)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome(0))
      const { result } = setup(spin)
      await act(() => result.current.startAutoplay(10))
      expect(spin).toHaveBeenCalledTimes(10)
      expect(result.current.auto.on).toBe(false)
    })

    it('stops when asked, after the spin in flight (AC26)', async () => {
      const { spin, resolve } = held()
      const { result } = setup(spin)
      let p!: Promise<void>
      act(() => {
        p = result.current.startAutoplay(10)
      })
      expect(result.current.auto).toEqual({ on: true, left: 10 })
      act(() => result.current.stopAutoplay())
      await act(async () => {
        resolve(outcome(0))
        await p
      })
      expect(spin).toHaveBeenCalledTimes(1)
      expect(result.current.auto.on).toBe(false)
    })

    it('stops when the credits no longer cover the bet (AC27, AC28)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome(0))
      const { result } = setup(spin, { startBalance: 3 })
      act(() => result.current.betUp())
      await act(() => result.current.startAutoplay(10))
      expect(spin).toHaveBeenCalledTimes(1)
      expect(result.current.balance).toBe(1)
      expect(result.current.notice?.text).toMatch(/credits no longer cover the bet/)
    })

    it('stops on a failed spin', async () => {
      const spin = vi.fn().mockRejectedValue(new Error('boom'))
      const { result } = setup(spin)
      await act(() => result.current.startAutoplay(10))
      expect(spin).toHaveBeenCalledTimes(1)
      expect(result.current.notice?.kind).toBe('error')
    })
  })

  it('keeps money exact to the cent', async () => {
    const { result } = setup(vi.fn().mockResolvedValue(outcome(0.1)), { startBalance: 1.2 })
    await act(() => result.current.spin())
    expect(result.current.balance).toBe(0.3)
  })
})
