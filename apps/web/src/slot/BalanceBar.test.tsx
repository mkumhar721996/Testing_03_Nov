import { render, screen, within } from '@testing-library/react'
import { BalanceBar } from './BalanceBar'

const base = { balance: 100, win: 0, bet: 2, canBetDown: true, canBetUp: true, onBetDown: vi.fn(), onBetUp: vi.fn() }
const bar = () => within(screen.getByTestId('balance-bar'))

describe('BalanceBar', () => {
  it('shows the balance and the bet on load (AC3, AC4)', () => {
    render(<BalanceBar {...base} />)
    expect(bar().getByText('Credits').nextSibling).toHaveTextContent('100')
    expect(bar().getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^2$/)
  })

  it('shows the win amount (AC5)', () => {
    render(<BalanceBar {...base} win={5} />)
    expect(bar().getByText('Win').nextSibling).toHaveTextContent('5')
  })

  it('shows no win amount on a jackpot spin (AC30)', () => {
    render(<BalanceBar {...base} win={null} />)
    expect(bar().getByText('Win').nextSibling).toHaveTextContent('—')
  })

  it('disables the bet buttons at the ends (AC22, AC24)', () => {
    render(<BalanceBar {...base} canBetDown={false} canBetUp={false} />)
    expect(bar().getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(bar().getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
  })
})
