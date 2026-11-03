import { fireEvent, render, screen } from '@testing-library/react'
import { BetControl } from './BetControl'

function spinWith(bet: string, onSpin = vi.fn()) {
  render(<BetControl balance={100} onSpin={onSpin} />)
  fireEvent.change(screen.getByLabelText('Bet'), { target: { value: bet } })
  fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
  return onSpin
}

describe('BetControl', () => {
  it('shows an inline error and does not spin for a disallowed bet (AC7, AC8)', () => {
    const onSpin = spinWith('4')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onSpin).not.toHaveBeenCalled()
  })

  it('shows the same error for a bet above the balance', () => {
    render(<BetControl balance={5} onSpin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Bet'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('leaves the balance unchanged after a rejected spin (AC9)', () => {
    spinWith('4')
    expect(screen.getByTestId('balance')).toHaveTextContent('100.00')
  })

  it('plays a valid bet (AC10)', () => {
    const onSpin = spinWith('5')
    expect(onSpin).toHaveBeenCalledWith(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
