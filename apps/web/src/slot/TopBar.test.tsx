import { render, screen } from '@testing-library/react'
import { TopBar } from './TopBar'

describe('TopBar', () => {
  it('shows the game name and no lobby or back control (AC1, AC11)', () => {
    render(<TopBar gameName="Wheels Go round Tiger" balance={1000} lastWin={0} />)
    expect(screen.getByText('Wheels Go round Tiger')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back|lobby/i })).not.toBeInTheDocument()
  })

  it('shows balance and last win (AC8, AC9, AC10)', () => {
    render(<TopBar gameName="G" balance={1000} lastWin={0} />)
    expect(screen.getByText('Balance').nextSibling).toHaveTextContent('1000.00')
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('0.00')
  })
})
