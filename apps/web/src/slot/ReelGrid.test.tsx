import { render, screen } from '@testing-library/react'
import { ReelGrid } from './ReelGrid'
import { SYMBOL_LABELS } from './symbols'
import type { ApiSymbol } from './symbols'

const grid = [
  ['S1', 'S2', 'S3', 'S4', 'S5'],
  ['S6', 'S7', 'S8', 'S9', 'S10'],
  ['WILD', 'SCATTER', 'S1', 'S2', 'S3'],
] as ApiSymbol[][]

describe('ReelGrid', () => {
  it('shows 15 cells in 3 rows by 5 reels', () => {
    render(<ReelGrid grid={null} spinning={false} />)
    expect(screen.getByRole('group', { name: 'Reel grid, 3 rows by 5 reels' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /^Row \d, reel \d:/ })).toHaveLength(15)
  })

  it('shows one of the game symbols in every cell after a spin (AC6)', () => {
    render(<ReelGrid grid={grid} spinning={false} />)
    const cells = screen.getAllByRole('img', { name: /^Row \d, reel \d:/ })
    cells.forEach((c) => expect(SYMBOL_LABELS).toContain(c.getAttribute('aria-label')!.split(': ')[1]))
    expect(screen.getByRole('img', { name: 'Row 1, reel 1: A' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Row 3, reel 2: Scatter' })).toBeInTheDocument()
  })

  it('is busy only while spinning, with a shorter roll in turbo (AC6, AC8)', () => {
    const { rerender } = render(<ReelGrid grid={grid} spinning={false} />)
    const group = screen.getByRole('group', { name: /Reel grid/ })
    expect(group).toHaveAttribute('aria-busy', 'false')
    rerender(<ReelGrid grid={grid} spinning turbo />)
    expect(group).toHaveAttribute('aria-busy', 'true')
    expect(group).toHaveClass('is-spinning', 'is-turbo')
  })
})
