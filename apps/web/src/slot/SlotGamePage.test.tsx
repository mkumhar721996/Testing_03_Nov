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
    render(<SlotGamePage spin={vi.fn()} freeGamesActive />)
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(screen.getByText('The bet is locked while they play.', { exact: false })).toBeInTheDocument()
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
  describe('spin failure', () => {
    const failOnce = () => vi.fn().mockRejectedValueOnce(new Error('Spin failed: 500')).mockResolvedValueOnce(outcome())

    it('shows the message, Try again and the unchanged balance (AC1, AC2, AC4, AC6, AC7, AC8)', async () => {
      render(<SlotGamePage spin={failOnce()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The spin failed.')
      expect(alert).toHaveTextContent('No stake was taken')
      expect(alert).toHaveTextContent('Press Try again to spin again at your bet of 1.00.')
      expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled()
      expect(balanceText()).toHaveTextContent('1000.00')
    })

    it('retries at the failed bet and deducts once (AC3, AC5)', async () => {
      const spin = failOnce()
      render(<SlotGamePage spin={spin} />)
      fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      await screen.findByRole('alert')
      expect(screen.queryByRole('group', { name: 'Bet' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(spin).toHaveBeenLastCalledWith(2, expect.any(String))
      await waitFor(() => expect(balanceText()).toHaveTextContent('998.00'))
      expect(spin).toHaveBeenCalledTimes(2)
      expect(screen.getByText(/Spin complete at bet 2\.00\. No win this spin\./)).toHaveAttribute('role', 'status')
    })

    it('keeps Try again after repeated failures (AC9)', async () => {
      render(<SlotGamePage spin={vi.fn().mockRejectedValue(new Error('x'))} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      await screen.findByRole('alert')
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
        await screen.findByRole('alert')
      }
      expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('The spin failed again.')
      expect(balanceText()).toHaveTextContent('1000.00')
    })

    it('sizes Spin compactly and Try again large', async () => {
      render(<SlotGamePage spin={vi.fn().mockRejectedValue(new Error('x'))} />)
      const spinButton = screen.getByRole('button', { name: 'Spin' })
      expect(spinButton).not.toHaveClass('btn-lg')
      expect(spinButton).toHaveClass('min-w-[96px]', 'flex-none')
      fireEvent.click(spinButton)
      expect(await screen.findByRole('button', { name: 'Try again' })).toHaveClass('btn-lg')
    })

    it('shows no Try again for a rejected bet', async () => {
      render(<SlotGamePage spin={vi.fn().mockRejectedValue(new BetRejectedError('no'))} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      await screen.findByRole('alert')
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    })
  })
})
