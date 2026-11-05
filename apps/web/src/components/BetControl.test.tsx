import { render, screen, within } from '@testing-library/react'
import { BetControl } from './BetControl'

const base = { bet: 1, canDecrease: true, canIncrease: true, onDecrease: vi.fn(), onIncrease: vi.fn() }

describe('BetControl', () => {
  it('shows the bet with two decimals between minus and plus (AC7)', () => {
    render(<BetControl {...base} />)
    const group = screen.getByRole('group', { name: 'Bet' })
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent(/^1$/)
    const order = within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(order).toEqual(['Decrease bet', 'Increase bet'])
    expect(group.children[1]).toContainElement(screen.getByLabelText('Bet', { selector: 'output' }))
  })

  it('calls the handlers on press (AC5, AC6)', () => {
    const onDecrease = vi.fn()
    const onIncrease = vi.fn()
    render(<BetControl {...base} onDecrease={onDecrease} onIncrease={onIncrease} />)
    screen.getByRole('button', { name: 'Decrease bet' }).click()
    screen.getByRole('button', { name: 'Increase bet' }).click()
    expect(onDecrease).toHaveBeenCalledOnce()
    expect(onIncrease).toHaveBeenCalledOnce()
  })

  it('disables the buttons from the props (AC13, AC14)', () => {
    render(<BetControl {...base} canDecrease={false} canIncrease={false} />)
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
  })
})
