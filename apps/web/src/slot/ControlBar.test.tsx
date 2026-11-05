import { fireEvent, render, screen } from '@testing-library/react'
import { ControlBar } from './ControlBar'

const base = {
  spinning: false,
  canSpin: true,
  auto: { on: false, left: 0 },
  turbo: false,
  onSpin: vi.fn(),
  onStartAutoplay: vi.fn(),
  onStopAutoplay: vi.fn(),
  onToggleTurbo: vi.fn(),
  onOpenInfo: vi.fn(),
}

describe('ControlBar', () => {
  it('spins on press (AC6)', () => {
    const onSpin = vi.fn()
    render(<ControlBar {...base} onSpin={onSpin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(onSpin).toHaveBeenCalledOnce()
  })

  it('blocks Spin while spinning (AC8, AC10)', () => {
    const onSpin = vi.fn()
    render(<ControlBar {...base} spinning onSpin={onSpin} />)
    const button = screen.getByRole('button', { name: 'Spinning' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(button)
    expect(onSpin).not.toHaveBeenCalled()
  })

  it('disables Spin when the balance is too low (AC12)', () => {
    render(<ControlBar {...base} canSpin={false} />)
    expect(screen.getByRole('button', { name: 'Spin' })).toBeDisabled()
  })

  it('shows the turbo state as pressed and text (AC15, AC16)', () => {
    const { rerender } = render(<ControlBar {...base} />)
    const turbo = screen.getByRole('button', { name: /Turbo/ })
    expect(turbo).toHaveAttribute('aria-pressed', 'false')
    expect(turbo).toHaveTextContent('Turbo off')
    rerender(<ControlBar {...base} turbo />)
    expect(turbo).toHaveAttribute('aria-pressed', 'true')
    expect(turbo).toHaveTextContent('Turbo on')
  })

  it('starts autoplay from the picker and stops it with the same control (AC13, AC26)', () => {
    const onStartAutoplay = vi.fn()
    const onStopAutoplay = vi.fn()
    const { rerender } = render(<ControlBar {...base} onStartAutoplay={onStartAutoplay} onStopAutoplay={onStopAutoplay} />)
    fireEvent.click(screen.getByRole('button', { name: 'Autoplay' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '10 spins' }))
    expect(onStartAutoplay).toHaveBeenCalledWith(10)
    rerender(
      <ControlBar {...base} auto={{ on: true, left: 7 }} onStartAutoplay={onStartAutoplay} onStopAutoplay={onStopAutoplay} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Stop autoplay, 7 spins left' }))
    expect(onStopAutoplay).toHaveBeenCalledOnce()
  })

  it('opens the info view and keeps menu inert (AC18, AC20)', () => {
    const onOpenInfo = vi.fn()
    render(<ControlBar {...base} onOpenInfo={onOpenInfo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(onOpenInfo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Info/ }))
    expect(onOpenInfo).toHaveBeenCalledOnce()
  })
})
