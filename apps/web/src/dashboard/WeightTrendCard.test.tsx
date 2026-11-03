import { fireEvent, render, screen } from '@testing-library/react'
import { WeightTrendCard } from './WeightTrendCard'

const noop = () => {}
const loaded = (points: { day: string; weightKg: number }[]) => ({ status: 'loaded' as const, points })
const two = loaded([
  { day: '2026-11-01', weightKg: 80 },
  { day: '2026-11-02', weightKg: 79.5 },
])

describe('WeightTrendCard', () => {
  it('plots one circle per point under a Weight trend heading (AC1)', () => {
    const { container } = render(<WeightTrendCard state={two} onRetry={noop} onAddReading={noop} />)
    expect(screen.getByRole('heading', { name: 'Weight trend' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /2 readings.*79\.5 kg/i })).toBeInTheDocument()
    expect(container.querySelectorAll('circle')).toHaveLength(2)
  })

  it('has no range selector and no add, edit or delete control when loaded (AC3, AC4)', () => {
    render(<WeightTrendCard state={two} onRetry={noop} onAddReading={noop} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows exactly one circle for a single point (AC5, AC6)', () => {
    const { container } = render(
      <WeightTrendCard state={loaded([{ day: '2026-11-02', weightKg: 80.4 }])} onRetry={noop} onAddReading={noop} />,
    )
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
  })

  it('shows a friendly empty state (AC7)', () => {
    render(<WeightTrendCard state={loaded([])} onRetry={noop} onAddReading={noop} />)
    expect(screen.getByText(/add your first reading/i)).toBeInTheDocument()
  })

  it('offers one Add reading button in the empty state (AC8)', () => {
    const onAddReading = vi.fn()
    render(<WeightTrendCard state={loaded([])} onRetry={noop} onAddReading={onAddReading} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
  })

  it('shows a loading status', () => {
    render(<WeightTrendCard state={{ status: 'loading' }} onRetry={noop} onAddReading={noop} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error with Retry', () => {
    const onRetry = vi.fn()
    render(<WeightTrendCard state={{ status: 'error' }} onRetry={onRetry} onAddReading={noop} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
