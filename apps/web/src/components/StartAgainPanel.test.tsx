import { fireEvent, render, screen } from '@testing-library/react'
import { StartAgainPanel } from './StartAgainPanel'

describe('StartAgainPanel', () => {
  it('calls onStartAgain when Start again is pressed', () => {
    const onStartAgain = vi.fn()
    render(<StartAgainPanel onStartAgain={onStartAgain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
    expect(onStartAgain).toHaveBeenCalledTimes(1)
    expect(screen.getByText('You have no balance left.')).toBeInTheDocument()
    expect(screen.getByText('Start again and your balance goes back to 100.')).toBeInTheDocument()
  })
})
