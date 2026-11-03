import { fireEvent, render, screen, within } from '@testing-library/react'
import { TodayStatsTiles } from './TodayStatsTiles'
import type { Reading } from './todayStats'

const now = new Date(2026, 10, 3, 12, 0)
const at = (h: number) => new Date(2026, 10, 3, h, 0).toISOString()
const noop = () => {}
const labels = ['Weight', 'Blood pressure', 'Blood sugar', 'Heart rate', 'Steps']
const tile = (name: string) => screen.getByRole('region', { name })

const full: Reading[] = [
  { id: '1', type: 'weight', loggedAt: at(8), value: 72.4 },
  { id: '2', type: 'bloodPressure', loggedAt: at(8), systolic: 120, diastolic: 80 },
  { id: '3', type: 'bloodSugar', loggedAt: at(8), value: 5.6 },
  { id: '4', type: 'heartRate', loggedAt: at(8), value: 68 },
  { id: '5', type: 'steps', loggedAt: at(8), value: 8200 },
]

const renderTiles = (readings: Reading[], onAddReading = noop) =>
  render(
    <TodayStatsTiles state={{ status: 'loaded', readings }} onRetry={noop} onAddReading={onAddReading} now={() => now} />,
  )

describe('TodayStatsTiles', () => {
  it('shows five tiles (AC1)', () => {
    renderTiles([])
    for (const name of labels) expect(tile(name)).toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(5)
    expect(screen.getByRole('heading', { level: 2, name: "Today's stats" })).toBeInTheDocument()
  })

  it("shows each tile's figure (AC2)", () => {
    renderTiles(full)
    expect(within(tile('Weight')).getByText('72.4')).toBeInTheDocument()
    expect(within(tile('Blood pressure')).getByText('120/80')).toBeInTheDocument()
    expect(within(tile('Blood sugar')).getByText('5.6')).toBeInTheDocument()
    expect(within(tile('Heart rate')).getByText('68')).toBeInTheDocument()
    expect(within(tile('Steps')).getByText('8,200')).toBeInTheDocument()
  })

  it('does not change the figure when tapped (AC3)', () => {
    renderTiles(full)
    const before = tile('Weight').textContent
    fireEvent.click(tile('Weight'))
    expect(tile('Weight').textContent).toBe(before)
  })

  it('offers no edit or delete control (AC4)', () => {
    renderTiles(full)
    for (const el of screen.getAllByRole('region'))
      expect(within(el).queryByRole('button', { name: /edit|delete|remove/i })).toBeNull()
  })

  it('flags an out-of-range latest reading with text (AC5)', () => {
    renderTiles([{ id: 'h', type: 'heartRate', loggedAt: at(9), value: 250 }])
    expect(within(tile('Heart rate')).getByText('250')).toBeInTheDocument()
    expect(within(tile('Heart rate')).getByText('Out of range')).toBeInTheDocument()
  })

  it('flags blood pressure when diastolic is out of range (AC5)', () => {
    renderTiles([{ id: 'b', type: 'bloodPressure', loggedAt: at(9), systolic: 120, diastolic: 20 }])
    expect(within(tile('Blood pressure')).getByText('Out of range')).toBeInTheDocument()
  })

  it('shows no flag for an in-range reading (AC6)', () => {
    renderTiles(full)
    expect(screen.queryByText('Out of range')).toBeNull()
  })

  it('judges the flag on the newest reading only (AC6, AC9)', () => {
    renderTiles([
      { id: 'a', type: 'heartRate', loggedAt: at(8), value: 250 },
      { id: 'b', type: 'heartRate', loggedAt: at(10), value: 70 },
    ])
    expect(within(tile('Heart rate')).getByText('70')).toBeInTheDocument()
    expect(within(tile('Heart rate')).queryByText('Out of range')).toBeNull()
  })

  it.each(['Weight', 'Blood pressure', 'Blood sugar', 'Heart rate'])(
    'shows a dash and a prompt when %s is missing (AC7)',
    (label) => {
      const onAddReading = vi.fn()
      renderTiles([], onAddReading)
      expect(within(tile(label)).getByText('—')).toBeInTheDocument()
      fireEvent.click(within(tile(label)).getByRole('button', { name: 'Log a reading' }))
      expect(onAddReading).toHaveBeenCalledTimes(1)
    },
  )

  it('shows 0 and no prompt for missing steps (AC8)', () => {
    renderTiles([])
    expect(within(tile('Steps')).getByText('0')).toBeInTheDocument()
    expect(within(tile('Steps')).queryByText('—')).toBeNull()
    expect(within(tile('Steps')).queryByRole('button')).toBeNull()
  })

  it('shows a skeleton while loading', () => {
    render(<TodayStatsTiles state={{ status: 'loading' }} onRetry={noop} onAddReading={noop} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an alert with Retry on error', () => {
    const onRetry = vi.fn()
    render(<TodayStatsTiles state={{ status: 'error' }} onRetry={onRetry} onAddReading={noop} />)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load today's stats.")
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
