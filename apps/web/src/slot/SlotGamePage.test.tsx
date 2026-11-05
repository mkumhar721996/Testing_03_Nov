import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'
import { SPIN_MS, SPIN_TIMEOUT_MS, TURBO_SPIN_MS } from './gameConfig'
import type { SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin = 0, jackpotTrigger = false): SpinOutcome => ({
  grid,
  bet: 1,
  evaluation: { totalWin },
  jackpotTrigger,
})
const held = () => vi.fn().mockReturnValue(new Promise<SpinOutcome>(() => {}))

async function open(spin = vi.fn().mockResolvedValue(outcome()), balance = 100) {
  const utils = render(<SlotGamePage spin={spin} balanceFetcher={async () => balance} />)
  await screen.findByRole('group', { name: 'Bet' })
  return { spin, ...utils }
}
const bar = () => within(screen.getByTestId('balance-bar'))
const betOutput = () => screen.getByLabelText('Bet', { selector: 'output' })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const grids = () => screen.getByRole('group', { name: /Reel grid/ })

describe('SlotGamePage', () => {
  afterEach(() => vi.useRealTimers())

  describe('balance loading', () => {
    it('shows a skeleton while loading', () => {
      render(<SlotGamePage balanceFetcher={() => new Promise(() => {})} />)
      expect(screen.getByRole('status', { name: 'Loading your balance' })).toBeInTheDocument()
    })

    it('shows an error and retries', async () => {
      const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(100)
      render(<SlotGamePage balanceFetcher={fetcher} />)
      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('group', { name: 'Bet' })).toBeInTheDocument()
      expect(fetcher).toHaveBeenCalledTimes(2)
    })
  })

  describe('bet and balance bar', () => {
    it('steps the bet up and down (AC1, AC2)', async () => {
      await open()
      click('Increase bet')
      expect(betOutput()).toHaveTextContent(/^2$/)
      click('Decrease bet')
      expect(betOutput()).toHaveTextContent(/^1$/)
    })

    it('shows balance 100 and bet 2 on load (AC3, AC4)', async () => {
      await open()
      click('Increase bet')
      expect(bar().getByText('Credits').nextSibling).toHaveTextContent('100')
      expect(bar().getByLabelText('Bet', { selector: 'output' })).toHaveTextContent('2')
    })

    it('disables bet down at 1 and bet up at 10 (AC21-AC24)', async () => {
      await open()
      expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Decrease bet' }))
      expect(betOutput()).toHaveTextContent(/^1$/)
      for (let i = 0; i < 4; i++) click('Increase bet')
      expect(betOutput()).toHaveTextContent(/^10$/)
      expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
      expect(betOutput()).toHaveTextContent(/^10$/)
    })
  })

  describe('spinning', () => {
    it('spins, stops on the result and shows the win and message (AC5-AC7)', async () => {
      const { spin } = await open(vi.fn().mockResolvedValue(outcome(5)))
      click('Spin')
      expect(spin).toHaveBeenCalledWith(1, expect.any(String), expect.anything())
      await waitFor(() => expect(grids()).toHaveAttribute('aria-busy', 'false'), { timeout: SPIN_MS * 2 })
      expect(screen.getByRole('img', { name: 'Row 2, reel 1: A' })).toBeInTheDocument()
      expect(bar().getByText('Win').nextSibling).toHaveTextContent('5')
      expect(screen.getByTestId('spin-message')).toHaveTextContent(/Win/)
    })

    it('shows the spinning state, locks the bet and blocks a second spin (AC8-AC10)', async () => {
      const { spin } = await open(held())
      click('Increase bet')
      click('Spin')
      const spinning = screen.getByRole('button', { name: 'Spinning' })
      expect(spinning).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByText(/Spinning\. The bet and Spin are locked/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
      expect(betOutput()).toHaveTextContent(/^2$/)
      fireEvent.click(spinning)
      fireEvent.click(spinning)
      expect(spin).toHaveBeenCalledTimes(1)
    })

    it('shows low balance and disables Spin (AC11, AC12)', async () => {
      await open(undefined, 0.5)
      expect(screen.getByText(/below the lowest bet of 1 credit/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()
    })

    it('shows the jackpot message and no win amount (AC29, AC30)', async () => {
      await open(vi.fn().mockResolvedValue(outcome(0, true)))
      click('Spin')
      expect(await screen.findByText('Jackpot spin', {}, { timeout: SPIN_MS * 2 })).toBeInTheDocument()
      expect(screen.getByText(/No win amount is added/)).toBeInTheDocument()
      expect(bar().getByText('Win').nextSibling).toHaveTextContent('—')
    })

    it('shows an error, stops the reels and keeps the bet deducted on failure (AC31-AC33)', async () => {
      await open(vi.fn().mockRejectedValue(new Error('boom')))
      click('Spin')
      expect(await screen.findByRole('alert')).toHaveTextContent(/did not go through/)
      expect(grids()).toHaveAttribute('aria-busy', 'false')
      expect(bar().getByText('Credits').nextSibling).toHaveTextContent('99')
    })

    it('treats a timed-out request as a failure (AC31-AC33)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      let signal: AbortSignal | undefined
      const spin = vi.fn().mockImplementation((_b, _g, s: AbortSignal) => {
        signal = s
        return new Promise(() => {})
      })
      await open(spin)
      click('Spin')
      await act(() => vi.advanceTimersByTimeAsync(SPIN_TIMEOUT_MS))
      expect(signal?.aborted).toBe(true)
      expect(screen.getByRole('alert')).toHaveTextContent(/did not go through/)
      expect(grids()).toHaveAttribute('aria-busy', 'false')
      expect(bar().getByText('Credits').nextSibling).toHaveTextContent('99')
    })
  })

  describe('autoplay', () => {
    async function startAuto(spin: ReturnType<typeof vi.fn>, balance = 100, count = '10 spins') {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      await open(spin, balance)
      click('Autoplay')
      const menu = screen.getByRole('menu', { name: 'Autoplay spins' })
      fireEvent.click(within(menu).getByRole('menuitem', { name: count }))
    }

    it('runs exactly 10 spins then stops (AC13, AC14)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome())
      await startAuto(spin)
      await act(() => vi.advanceTimersByTimeAsync(SPIN_MS * 12))
      expect(spin).toHaveBeenCalledTimes(10)
      await act(() => vi.advanceTimersByTimeAsync(SPIN_MS * 3))
      expect(spin).toHaveBeenCalledTimes(10)
      expect(screen.getByRole('button', { name: 'Autoplay' })).toBeInTheDocument()
    })

    it('stops when the autoplay control is pressed again (AC26)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome())
      await startAuto(spin)
      await act(() => vi.advanceTimersByTimeAsync(SPIN_MS * 2))
      click(/Stop autoplay/)
      await act(() => vi.advanceTimersByTimeAsync(SPIN_MS * 12))
      expect(spin.mock.calls.length).toBeLessThan(10)
      expect(screen.getByRole('button', { name: 'Autoplay' })).toBeInTheDocument()
    })

    it('stops and shows low balance when credits no longer cover the bet (AC27, AC28)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome())
      vi.useFakeTimers({ shouldAdvanceTime: true })
      await open(spin, 2)
      click('Increase bet')
      click('Autoplay')
      fireEvent.click(screen.getByRole('menuitem', { name: '10 spins' }))
      await act(() => vi.advanceTimersByTimeAsync(SPIN_MS * 3))
      expect(spin).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Autoplay stopped: your credits no longer cover the bet/)).toBeInTheDocument()
      expect(screen.getByText(/below the lowest bet of 1 credit/)).toBeInTheDocument()
    })
  })

  describe('turbo', () => {
    it('toggles on and off (AC15, AC16)', async () => {
      await open()
      const turbo = screen.getByRole('button', { name: /Turbo/ })
      expect(turbo).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(turbo)
      expect(turbo).toHaveAttribute('aria-pressed', 'true')
      expect(turbo).toHaveTextContent('Turbo on')
      fireEvent.click(turbo)
      expect(turbo).toHaveTextContent('Turbo off')
    })

    it('shortens the reel animation', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      await open()
      click(/Turbo/)
      click('Spin')
      await act(() => vi.advanceTimersByTimeAsync(TURBO_SPIN_MS))
      expect(grids()).toHaveAttribute('aria-busy', 'false')
    })
  })

  describe('chrome', () => {
    it('shows six jackpot tiers (AC17)', async () => {
      await open()
      expect(screen.getAllByTestId('jackpot-tier')).toHaveLength(6)
    })

    it('opens and closes the paytable from the info icon (AC18)', async () => {
      await open()
      const info = screen.getByRole('button', { name: /Info/ })
      fireEvent.click(info)
      const dialog = await screen.findByRole('dialog', { name: 'Paytable and rules' })
      fireEvent.keyDown(dialog, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(info).toHaveFocus()
      fireEvent.click(info)
      fireEvent.click(await screen.findByRole('button', { name: 'Back to game' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows home, menu and sound icons that change nothing (AC19, AC20)', async () => {
      const { container } = await open()
      const before = container.innerHTML
      for (const name of ['Home', 'Menu', 'Sound']) fireEvent.click(screen.getByRole('button', { name }))
      expect(container.innerHTML).toBe(before)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
