import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }
const recent = () => [{ recordedAt: new Date().toISOString(), weightKg: 80 }]
const withReadings = async () => recent()

describe('DashboardPage', () => {
  it('calls onAddReading when Add reading is selected (AC2)', () => {
    const onAddReading = vi.fn()
    render(
      <DashboardPage
        fetcher={async () => profile}
        weightFetcher={withReadings}
        onAddReading={onAddReading}
        onBookAppointment={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
  })

  it('calls onBookAppointment when Book appointment is selected (AC3)', () => {
    const onBookAppointment = vi.fn()
    render(
      <DashboardPage
        fetcher={async () => profile}
        weightFetcher={withReadings}
        onAddReading={() => {}}
        onBookAppointment={onBookAppointment}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(onBookAppointment).toHaveBeenCalledTimes(1)
  })

  it('recovers via Retry (AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(profile)
    render(
      <DashboardPage
        fetcher={fetcher}
        weightFetcher={withReadings}
        onAddReading={() => {}}
        onBookAppointment={() => {}}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('routes the weight trend empty state button to onAddReading (AC8)', async () => {
    const onAddReading = vi.fn()
    render(
      <DashboardPage
        fetcher={async () => profile}
        weightFetcher={async () => []}
        onAddReading={onAddReading}
        onBookAppointment={() => {}}
      />,
    )
    const card = (await screen.findByText(/add your first reading/i)).closest('section') as HTMLElement
    fireEvent.click(within(card).getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
  })

  it('replaces the empty state with the chart after a reading is saved (AC9)', async () => {
    const weightFetcher = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(recent())
    const { container } = render(
      <DashboardPage
        fetcher={async () => profile}
        weightFetcher={weightFetcher}
        onAddReading={() => {}}
        onBookAppointment={() => {}}
      />,
    )
    expect(await screen.findByText(/add your first reading/i)).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event('readings:saved'))
    })
    expect(await screen.findByRole('img', { name: /1 reading/i })).toBeInTheDocument()
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(screen.queryByText(/add your first reading/i)).not.toBeInTheDocument()
  })
})
