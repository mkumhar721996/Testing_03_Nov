import { render, screen } from '@testing-library/react'
import { ReelGrid } from './ReelGrid'

describe('ReelGrid', () => {
  it('marks scatters with text and names the count in the label', () => {
    const grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6'])
    grid[0][0] = grid[1][1] = grid[2][2] = 'SCATTER'
    render(<ReelGrid grid={grid} scatterCount={3} />)
    expect(screen.getByRole('img', { name: 'Reels: 3 scatters' })).toBeInTheDocument()
    expect(screen.getAllByText('Scatter')).toHaveLength(3)
  })

  it('shows skeleton tiles and is busy while submitting', () => {
    const { container } = render(<ReelGrid busy />)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(15)
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
  })
})
