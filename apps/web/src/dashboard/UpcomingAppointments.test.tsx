import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Appointment } from './appointments'
import { UpcomingAppointments } from './UpcomingAppointments'
import type { AppointmentsState } from './useAppointments'

const a1: Appointment = {
  id: 'a1',
  startsAt: '2026-11-04T09:30:00',
  endsAt: '2026-11-04T10:00:00',
  bookedAt: '2026-11-01T10:00:00Z',
}
const a2: Appointment = { ...a1, id: 'a2', startsAt: '2026-11-06T09:30:00', endsAt: '2026-11-06T10:00:00' }
const loaded = (upcoming: Appointment[]): AppointmentsState => ({ status: 'loaded', upcoming })

const renderIt = (state: AppointmentsState, onRetry = () => {}, onBook = () => {}) =>
  render(<UpcomingAppointments state={state} onRetry={onRetry} onBookAppointment={onBook} />)

describe('UpcomingAppointments', () => {
  it('shows the next appointment as text (AC1)', () => {
    renderIt(loaded([a1, a2]))
    expect(screen.getByRole('link', { name: /next appointment/i })).toHaveTextContent(/next appointment: .*\b4\b/i)
  })

  it('links the next appointment text to its detail (AC2)', () => {
    renderIt(loaded([a1, a2]))
    expect(screen.getByRole('link', { name: /next appointment/i })).toHaveAttribute('href', '#/appointments/a1')
  })

  it('shows one list row per upcoming appointment (AC3)', () => {
    renderIt(loaded([a1, a2]))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
  })

  it('links each row to its own detail (AC4)', () => {
    renderIt(loaded([a1, a2]))
    const rows = within(screen.getByRole('list')).getAllByRole('link')
    expect(rows.map((r) => r.getAttribute('href'))).toEqual(['#/appointments/a1', '#/appointments/a2'])
  })

  it('shows the empty text and Book appointment prompt (AC5, AC6)', () => {
    const onBook = vi.fn()
    renderIt(loaded([]), () => {}, onBook)
    expect(screen.getByText('No upcoming appointments')).toBeInTheDocument()
    const book = screen.getAllByRole('button', { name: 'Book appointment' })
    expect(book).toHaveLength(1)
    fireEvent.click(book[0])
    expect(onBook).toHaveBeenCalledTimes(1)
  })

  it('shows no next link or list when empty (AC7)', () => {
    renderIt(loaded([]))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /next appointment/i })).not.toBeInTheDocument()
  })

  it('shows a loading status', () => {
    renderIt({ status: 'loading' })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error with a Retry that calls onRetry', () => {
    const onRetry = vi.fn()
    renderIt({ status: 'error' }, onRetry)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your appointments")
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
