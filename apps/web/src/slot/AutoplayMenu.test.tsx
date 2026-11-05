import { fireEvent, render, screen, within } from '@testing-library/react'
import { AutoplayMenu } from './AutoplayMenu'

describe('AutoplayMenu', () => {
  it('offers 10, 20, 50 and 100 spins (AC25)', () => {
    render(<AutoplayMenu onPick={vi.fn()} onClose={vi.fn()} />)
    const items = within(screen.getByRole('menu', { name: 'Autoplay spins' })).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['10 spins', '20 spins', '50 spins', '100 spins'])
  })

  it('reports the picked count', () => {
    const onPick = vi.fn()
    render(<AutoplayMenu onPick={onPick} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('menuitem', { name: '50 spins' }))
    expect(onPick).toHaveBeenCalledWith(50)
  })

  it('closes on Escape and moves focus with arrow keys', () => {
    const onClose = vi.fn()
    render(<AutoplayMenu onPick={vi.fn()} onClose={onClose} />)
    const menu = screen.getByRole('menu')
    expect(screen.getByRole('menuitem', { name: '10 spins' })).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: '20 spins' })).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
