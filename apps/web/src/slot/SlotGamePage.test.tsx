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
})
