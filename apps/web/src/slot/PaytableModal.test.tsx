import { fireEvent, render, screen } from '@testing-library/react'
import { PaytableModal } from './PaytableModal'

describe('PaytableModal', () => {
  it('is a labelled dialog with the paytable and rules (AC18)', () => {
    render(<PaytableModal onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Paytable and rules' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText(/Turbo shortens the reel animation/)).toBeInTheDocument()
  })

  it('closes on Escape, Back to game and the close button', () => {
    const onClose = vi.fn()
    render(<PaytableModal onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Back to game' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close paytable and rules' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('moves focus in and returns it on close', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    const { unmount } = render(<PaytableModal onClose={vi.fn()} returnFocusTo={{ current: opener }} />)
    expect(screen.getByRole('button', { name: 'Close paytable and rules' })).toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
