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

  it('recovers via Retry (AC7)', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(profile)
    render(<DashboardPage fetcher={fetcher} onAddReading={() => {}} onBookAppointment={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
