import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'
import { publishReadingSaved } from './stats/readingEvents'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }
const noStats = async () => []

describe('DashboardPage', () => {
  it('calls onAddReading when Add reading is selected (AC2)', () => {
    const onAddReading = vi.fn()
    render(
      <DashboardPage
        fetcher={async () => profile}
        statsFetcher={noStats}
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
        statsFetcher={noStats}
        onAddReading={() => {}}
        onBookAppointment={onBookAppointment}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(onBookAppointment).toHaveBeenCalledTimes(1)
  })

  it('recovers via Retry (AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(profile)
    render(<DashboardPage fetcher={fetcher} statsFetcher={noStats} onAddReading={() => {}} onBookAppointment={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('recovers the stats tiles via Retry', async () => {
    const statsFetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([])
    render(
      <DashboardPage
        fetcher={async () => profile}
        statsFetcher={statsFetcher}
        onAddReading={() => {}}
        onBookAppointment={() => {}}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('region', { name: 'Weight' })).toBeInTheDocument()
    expect(statsFetcher).toHaveBeenCalledTimes(2)
  })

  it('updates the tile when a reading is saved, without refetching (AC11)', async () => {
    const statsFetcher = vi.fn().mockResolvedValue([])
    render(
      <DashboardPage
        fetcher={async () => profile}
        statsFetcher={statsFetcher}
        onAddReading={() => {}}
        onBookAppointment={() => {}}
      />,
    )
    const weight = await screen.findByRole('region', { name: 'Weight' })
    expect(within(weight).getByText('—')).toBeInTheDocument()
    act(() => publishReadingSaved({ id: 'n', type: 'weight', loggedAt: new Date().toISOString(), value: 73.1 }))
    expect(within(screen.getByRole('region', { name: 'Weight' })).getByText('73.1')).toBeInTheDocument()
    expect(statsFetcher).toHaveBeenCalledTimes(1)
  })
})
