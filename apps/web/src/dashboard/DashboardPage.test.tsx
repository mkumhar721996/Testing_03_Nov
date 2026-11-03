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

  describe('upcoming appointments', () => {
    const now = () => new Date('2026-11-04T09:00:00Z')
    const base = {
      id: 'x',
      startsAt: '2026-11-05T09:00:00Z',
      endsAt: '2026-11-05T09:30:00Z',
      bookedAt: '2026-11-01T10:00:00Z',
    }
    const page = (list: (typeof base)[]) =>
      render(
        <DashboardPage
          fetcher={async () => profile}
          appointmentsFetcher={async () => list}
          statsFetcher={noStats}
          now={now}
          onAddReading={() => {}}
          onBookAppointment={() => {}}
        />,
      )

    it('shows the empty state with one Book appointment prompt (AC5, AC6, AC7)', async () => {
      page([])
      expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Book appointment' })).toHaveLength(1)
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /next appointment/i })).not.toBeInTheDocument()
    })

    it('shows the next appointment and a list, each linking to its detail (AC1-AC4)', async () => {
      page([
        { ...base, id: 'a2', startsAt: '2026-11-06T09:00:00Z', endsAt: '2026-11-06T09:30:00Z' },
        { ...base, id: 'a1' },
      ])
      const next = await screen.findByRole('link', { name: /next appointment/i })
      expect(next).toHaveAttribute('href', '#/appointments/a1')
      const section = screen.getByRole('region', { name: 'Upcoming appointments' })
      const rows = within(within(section).getByRole('list')).getAllByRole('link')
      expect(rows.map((r) => r.getAttribute('href'))).toEqual(['#/appointments/a1', '#/appointments/a2'])
    })

    it('links the first booked of equal starts as next (AC8)', async () => {
      page([
        { ...base, id: 'late', bookedAt: '2026-11-02T10:00:00Z' },
        { ...base, id: 'early' },
      ])
      expect(await screen.findByRole('link', { name: /next appointment/i })).toHaveAttribute(
        'href',
        '#/appointments/early',
      )
    })

    it('shows an in-progress appointment as next (AC9)', async () => {
      page([{ ...base, id: 'now', startsAt: '2026-11-04T08:30:00Z', endsAt: '2026-11-04T09:30:00Z' }])
      expect(await screen.findByRole('link', { name: /next appointment/i })).toHaveAttribute(
        'href',
        '#/appointments/now',
      )
    })

    it('shows the empty state when the only appointment has ended (AC10)', async () => {
      page([{ ...base, startsAt: '2026-11-04T07:00:00Z', endsAt: '2026-11-04T08:00:00Z' }])
      expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument()
    })
  })

  it('recovers via Retry (AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(profile)
    render(
      <DashboardPage
        fetcher={fetcher}
        appointmentsFetcher={async () => []}
        statsFetcher={noStats}
        onAddReading={() => {}}
        onBookAppointment={() => {}}
      />,
    )
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
