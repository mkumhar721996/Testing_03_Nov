import { fireEvent, render, screen, within } from '@testing-library/react'
import { PaytablePanel } from './PaytablePanel'
import type { PaytableView } from './paytableApi'

const fixture: PaytableView = {
  symbols: [
    { symbol: 'S1', payouts: { 3: 7, 4: 11, 5: 13 } },
    { symbol: 'S2', payouts: { 3: 2, 4: 3, 5: 4 } },
  ],
  rules: { wild: 'Wild rule text', scatter: 'Scatter rule text' },
}

const setup = (over: Partial<Parameters<typeof PaytablePanel>[0]> = {}) => {
  const onClose = vi.fn()
  const onRetry = vi.fn()
  render(<PaytablePanel open onClose={onClose} onRetry={onRetry} status="ready" paytable={fixture} {...over} />)
  return { onClose, onRetry }
}

describe('PaytablePanel', () => {
  it('renders nothing while closed', () => {
    setup({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows one row per symbol with 3, 4 and 5 of a kind payouts (AC2, AC5)', () => {
    setup()
    const list = screen.getByRole('list', { name: 'Symbol payouts' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('3 of a kind:', { exact: false })).toBeInTheDocument()
    expect(within(rows[0]).getByText('7×')).toBeInTheDocument()
    expect(within(rows[0]).getByText('11×')).toBeInTheDocument()
    expect(within(rows[0]).getByText('13×')).toBeInTheDocument()
    expect(within(list).queryByText(/wild|scatter/i)).toBeNull()
  })

  it('shows the wild and scatter rules (AC3, AC4)', () => {
    setup()
    expect(screen.getByText('Wild rule text')).toBeInTheDocument()
    expect(screen.getByText('Scatter rule text')).toBeInTheDocument()
  })

  it('closes from the close button, Back to the game, the backdrop and Escape (AC6, AC7)', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Close paytable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to the game' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('paytable-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(4)
  })

  it('focuses the close button on open', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Close paytable' })).toHaveFocus()
  })

  it('shows skeleton rows while loading', () => {
    setup({ status: 'loading', paytable: null })
    expect(screen.queryByRole('list', { name: 'Symbol payouts' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('shows an error with Try again', () => {
    const { onRetry } = setup({ status: 'error', paytable: null })
    expect(screen.getByRole('alert')).toHaveTextContent('The paytable could not be loaded.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
