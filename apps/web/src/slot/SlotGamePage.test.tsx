import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'
import { BetRejectedError, type SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin = 0): SpinOutcome => ({ grid, bet: 1, evaluation: { totalWin }, jackpotTrigger: false })
const balanceText = () => screen.getByText('Balance').nextSibling

function held() {
  let resolve!: (o: SpinOutcome) => void
  const spin = vi.fn().mockReturnValue(new Promise<SpinOutcome>((r) => (resolve = r)))
  return { spin, resolve }
}

describe('SlotGamePage', () => {
  it('shows the idle screen (AC1, AC8, AC10, AC12, AC13)', () => {
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Wheels Go round Tiger' })).toBeInTheDocument()
    expect(balanceText()).toHaveTextContent('1000.00')
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('0.00')
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^1$/)
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
  })

  it('locks both bet buttons during free games (AC7)', () => {
    render(<SlotGamePage spin={vi.fn()} initialFreeGames={3} />)
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(screen.getByText('Free games: 3 remaining')).toBeInTheDocument()
  })

  it('shows a rejection next to the bet controls and clears it on a bet change (AC12, AC13)', async () => {
    render(<SlotGamePage spin={vi.fn().mockRejectedValue(new BetRejectedError('Bet of 10 is more than your balance.'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Bet not accepted.')
    expect(alert).toHaveTextContent('Bet of 10 is more than your balance.')
    const card = screen.getByRole('group', { name: 'Bet' }).closest('.card') as HTMLElement
    expect(within(card).getByRole('alert')).toBe(alert)
    fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('paints the spin result on the grid (AC4)', async () => {
    render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome())} />)
    // Row 2, reel 1 is S5 ("Picture 1") on the idle grid but S1 ("A") in the spin outcome.
    expect(screen.getByRole('img', { name: 'Row 2, reel 1: Picture 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(await screen.findByRole('img', { name: 'Row 2, reel 1: A' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Row 2, reel 1: Picture 1' })).not.toBeInTheDocument()
  })

  it('locks the controls while spinning and unlocks after (AC17-AC20)', async () => {
    const { spin, resolve } = held()
    render(<SlotGamePage spin={spin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Spinning/ })).toBeDisabled()
    resolve(outcome())
    expect(await screen.findByRole('button', { name: 'Spin' })).toBeEnabled()
  })

  it('deducts the bet at once and adds the win after (AC23, AC24)', async () => {
    const { spin, resolve } = held()
    render(<SlotGamePage spin={spin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(balanceText()).toHaveTextContent('999.00')
    resolve(outcome(25))
    await waitFor(() => expect(balanceText()).toHaveTextContent('1024.00'))
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('25.00')
  })

  describe('free games counter', () => {
    const scatterGrid = (n: number) =>
      [0, 1, 2].map((r) => ['S1', 'S2', 'S3', 'S4', 'S5'].map((s, c) => (r * 5 + c < n ? 'SCATTER' : s))) as SpinOutcome['grid']
    const withGrid = (n: number): SpinOutcome => ({ ...outcome(), grid: scatterGrid(n) })

    it('shows the counter after 3 scatters and outlines them (AC1)', async () => {
      render(<SlotGamePage spin={vi.fn().mockResolvedValue(withGrid(3))} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(await screen.findByText('Free games: 10 remaining')).toBeInTheDocument()
      expect(screen.getAllByRole('img', { name: /scatter/i })[0]).toHaveClass('outline-[length:var(--focus-ring-width)]')
    })

    it('hides the counter after 2 scatters (AC2)', async () => {
      render(<SlotGamePage spin={vi.fn().mockResolvedValue(withGrid(2))} />)
      expect(screen.queryByText(/free games:/i)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(await screen.findByText(/2 scatters/)).toBeInTheDocument()
      expect(screen.queryByText(/free games:/i)).not.toBeInTheDocument()
    })

    it('counts down on Spin and enables Spin without a stake (AC3, AC5, AC6)', async () => {
      const spin = vi.fn().mockResolvedValue(outcome())
      render(<SlotGamePage spin={spin} initialFreeGames={3} />)
      expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled()
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(await screen.findByText('Free games: 2 remaining')).toBeInTheDocument()
      expect(spin).toHaveBeenCalledTimes(1)
      expect(balanceText()).toHaveTextContent('1000.00')
      expect(screen.getAllByRole('img', { name: /^Row \d, reel \d:/ })).toHaveLength(15)
    })

    it('returns to idle after the last free game (AC4)', async () => {
      render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome())} initialFreeGames={1} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(await screen.findByText(/free games finished\. choose a bet, then press spin/i)).toBeInTheDocument()
      expect(screen.queryByText(/free games:/i)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /increase bet/i })).toBeEnabled()
    })
  })
})
