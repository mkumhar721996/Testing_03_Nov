import { act, renderHook } from '@testing-library/react'
import { useSlotGame } from './useSlotGame'
import { BetRejectedError, type SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin: number): SpinOutcome => ({ grid, bet: 1, evaluation: { totalWin }, jackpotTrigger: false })

describe('useSlotGame', () => {
  it('starts at the lowest bet with last win 0 (AC10, AC12, AC13)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn()))
    expect(result.current.bet).toBe(1)
    expect(result.current.lastWin).toBe(0)
    expect(result.current.canBetDown).toBe(false)
  })

  it('steps the bet up and down (AC5, AC6)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn()))
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(2)
    act(() => result.current.betDown())
    expect(result.current.bet).toBe(1)
  })

  it('disables plus at the top step (AC14)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn()))
    for (let i = 0; i < 4; i++) act(() => result.current.betUp())
    expect(result.current.bet).toBe(10)
    expect(result.current.canBetUp).toBe(false)
  })

  it('disables plus when the next step exceeds the balance (AC15, AC16)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 4 }))
    expect(result.current.canBetUp).toBe(true)
    act(() => result.current.betUp())
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(3)
    expect(result.current.canBetUp).toBe(false)
  })

  it('snaps the bet to the largest covered step and disables Spin when below the lowest (AC21, AC22)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 2.5 }))
    expect(result.current.canSpin).toBe(true)
    expect(result.current.bet).toBe(1)
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(2)
    expect(result.current.canBetUp).toBe(false)
    const low = renderHook(() => useSlotGame(vi.fn(), { startBalance: 0.5 }))
    expect(low.result.current.bet).toBe(1)
    expect(low.result.current.canSpin).toBe(false)
  })

  it('snaps the bet down after a spin leaves too little balance (AC22)', async () => {
    const spin = vi.fn().mockResolvedValue(outcome(0))
    const { result } = renderHook(() => useSlotGame(spin, { startBalance: 6 }))
    act(() => result.current.betUp())
    act(() => result.current.betUp())
    act(() => result.current.betUp())
    expect(result.current.bet).toBe(5)
    await act(() => result.current.spin())
    expect(result.current.balance).toBe(1)
    expect(result.current.bet).toBe(1)
  })

  it('locks controls while spinning and deducts the bet at once (AC17-AC19, AC23)', async () => {
    let resolve!: (o: SpinOutcome) => void
    const spin = vi.fn().mockReturnValue(new Promise<SpinOutcome>((r) => (resolve = r)))
    const { result } = renderHook(() => useSlotGame(spin))
    let p!: Promise<void>
    act(() => {
      p = result.current.spin()
    })
    expect(result.current.spinning).toBe(true)
    expect(result.current.canBetDown || result.current.canBetUp || result.current.canSpin).toBe(false)
    expect(result.current.balance).toBe(999)
    await act(async () => {
      resolve(outcome(25))
      await p
    })
    expect(result.current.spinning).toBe(false)
    expect(result.current.canSpin).toBe(true)
    expect(result.current.balance).toBe(1024)
    expect(result.current.lastWin).toBe(25)
    expect(result.current.grid).toBe(grid)
  })

  it('restores the balance when the request fails', async () => {
    const spin = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useSlotGame(spin))
    await act(() => result.current.spin())
    expect(result.current.balance).toBe(1000)
    expect(result.current.spinning).toBe(false)
  })

  it('steps the bet 2, 3, 5, 10 with a balance of 100 (AC2, AC3)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 100 }))
    const seen: number[] = []
    for (let i = 0; i < 4; i++) {
      act(() => result.current.betUp())
      seen.push(result.current.bet)
    }
    expect(seen).toEqual([2, 3, 5, 10])
    expect(result.current.canBetUp).toBe(false)
  })

  it('disables plus at bet 5 with a balance of 7 and enables it with 10 (AC4, AC8)', () => {
    const low = renderHook(() => useSlotGame(vi.fn(), { startBalance: 7 }))
    for (let i = 0; i < 3; i++) act(() => low.result.current.betUp())
    expect(low.result.current.bet).toBe(5)
    expect(low.result.current.canBetUp).toBe(false)
    const ok = renderHook(() => useSlotGame(vi.fn(), { startBalance: 10 }))
    for (let i = 0; i < 3; i++) act(() => ok.result.current.betUp())
    expect(ok.result.current.canBetUp).toBe(true)
  })

  it('disables minus at bet 1 (AC5)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn()))
    expect(result.current.canBetDown).toBe(false)
  })

  it('disables both bet buttons while spinning (AC6)', () => {
    const spin = vi.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useSlotGame(spin, { startBalance: 100 }))
    act(() => result.current.betUp())
    act(() => {
      void result.current.spin()
    })
    expect(result.current.canBetUp).toBe(false)
    expect(result.current.canBetDown).toBe(false)
  })

  it('disables both bet buttons during free games (AC7)', () => {
    const { result } = renderHook(() => useSlotGame(vi.fn(), { startBalance: 100, freeGamesActive: true }))
    expect(result.current.canBetUp).toBe(false)
    expect(result.current.canBetDown).toBe(false)
  })

  it('keeps a bet rejection until the bet changes (AC12, AC13)', async () => {
    const spin = vi.fn().mockRejectedValue(new BetRejectedError('Bet of 10 is more than your balance of 7.'))
    const { result } = renderHook(() => useSlotGame(spin, { startBalance: 100 }))
    await act(() => result.current.spin())
    expect(result.current.betError).toBe('Bet of 10 is more than your balance of 7.')
    expect(result.current.balance).toBe(100)
    act(() => result.current.betUp())
    expect(result.current.betError).toBeNull()
  })

  it('keeps money exact to the cent', async () => {
    const spin = vi.fn().mockResolvedValue(outcome(0.1))
    const { result } = renderHook(() => useSlotGame(spin, { startBalance: 1.2 }))
    await act(() => result.current.spin())
    expect(result.current.balance).toBe(0.3)
  })
})
