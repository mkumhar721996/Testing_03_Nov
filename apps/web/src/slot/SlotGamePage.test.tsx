import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'
import type { SpinOutcome } from './spinApi'

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
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent('1.00')
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
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

  describe('start again', () => {
    const startAgain = () => screen.queryByRole('button', { name: 'Start again' })

    it('is shown after a spin leaves the balance at 0 (AC1)', async () => {
      render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome(0))} startBalance={1} />)
      expect(startAgain()).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(await screen.findByRole('button', { name: 'Start again' })).toBeInTheDocument()
      expect(balanceText()).toHaveTextContent('0.00')
    })

    it('is not shown at balance 1 (AC2)', () => {
      render(<SlotGamePage spin={vi.fn()} startBalance={1} />)
      expect(startAgain()).not.toBeInTheDocument()
    })

    it('resets the balance to 100 when pressed (AC3)', () => {
      render(<SlotGamePage spin={vi.fn()} startBalance={0} />)
      fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
      expect(balanceText()).toHaveTextContent('100.00')
      expect(startAgain()).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled()
      expect(screen.getByText('Balance reset to 100')).toHaveAttribute('role', 'status')
    })

    it('is not shown with an uncollected win (AC4)', () => {
      render(<SlotGamePage spin={vi.fn()} startBalance={0} uncollectedWin={5} />)
      expect(startAgain()).not.toBeInTheDocument()
    })

    it('is not shown while free games are active (AC5)', () => {
      render(<SlotGamePage spin={vi.fn()} startBalance={0} freeGames={3} />)
      expect(startAgain()).not.toBeInTheDocument()
    })
  })
})
