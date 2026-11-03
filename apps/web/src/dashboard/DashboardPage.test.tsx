import { fireEvent, render, screen } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }

describe('DashboardPage', () => {
  it('calls onAddReading when Add reading is selected (AC2)', () => {
    const onAddReading = vi.fn()
    render(<DashboardPage fetcher={async () => profile} onAddReading={onAddReading} onBookAppointment={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onAddReading).toHaveBeenCalledTimes(1)
  })

  it('calls onBookAppointment when Book appointment is selected (AC3)', () => {
    const onBookAppointment = vi.fn()
    render(<DashboardPage fetcher={async () => profile} onAddReading={() => {}} onBookAppointment={onBookAppointment} />)
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
    render(<DashboardPage fetcher={fetcher} appointmentsFetcher={async () => []} onAddReading={() => {}} onBookAppointment={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
