import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'
import { BetRejectedError, type SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin = 0, balance = 99): SpinOutcome => ({
  grid,
  bet: 1,
  evaluation: { totalWin },
  jackpotTrigger: false,
  balance,
})
const raiseBetTo5 = () => {
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Increase bet' }))
}
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
    expect(balanceText()).toHaveTextContent('100.00')
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

  it('shows the balance after the stake only when the spin completes (AC1)', async () => {
    const { spin, resolve } = held()
    render(<SlotGamePage spin={spin} />)
    raiseBetTo5()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(balanceText()).toHaveTextContent('100.00')
    resolve({ ...outcome(25, 95), bet: 5 })
    await waitFor(() => expect(balanceText()).toHaveTextContent('95.00'))
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('25.00')
    expect(screen.getByText('Stake of 5 taken for this spin.')).toBeInTheDocument()
  })

  it('shows a failed spin, takes nothing and disables Spin (AC2)', async () => {
    render(<SlotGamePage spin={vi.fn().mockRejectedValue(new Error('boom'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Spin failed. Nothing was taken from your balance.')
    expect(balanceText()).toHaveTextContent('100.00')
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()
  })

  it('charges once when Try again completes (AC3)', async () => {
    const spin = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ ...outcome(0, 95), bet: 5 })
    render(<SlotGamePage spin={spin} />)
    raiseBetTo5()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(balanceText()).toHaveTextContent('95.00'))
    expect(spin).toHaveBeenCalledTimes(2)
    expect(spin).toHaveBeenLastCalledWith(5, expect.any(String))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('charges nothing in a free game (AC4)', async () => {
    render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome(0, 95))} freeGamesActive />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled())
    expect(balanceText()).toHaveTextContent('100.00')
    expect(screen.queryByText(/Stake of/)).not.toBeInTheDocument()
    expect(screen.getByText('Free games cost nothing.', { exact: false })).toBeInTheDocument()
  })

  it('keeps the bet and blocks Spin when the balance is below it (AC5, AC6)', async () => {
    const spin = vi.fn().mockResolvedValue({ ...outcome(0, 3), bet: 5 })
    render(<SlotGamePage spin={spin} />)
    raiseBetTo5()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    await waitFor(() => expect(balanceText()).toHaveTextContent('3.00'))
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^5$/)
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(spin).toHaveBeenCalledTimes(1)
    expect(
      screen.getByText('Your balance of 3.00 is less than the bet of 5.00.', { exact: false }),
    ).toBeInTheDocument()
  })
})
