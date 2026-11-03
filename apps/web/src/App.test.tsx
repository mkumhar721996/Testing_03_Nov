import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }

beforeEach(() => {
  window.location.hash = ''
  const readings = [{ recordedAt: new Date().toISOString(), weightKg: 80 }]
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('/patients/me/readings') ? readings : profile),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the health dashboard as the home screen (AC4)', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
  })

  it('opens the Add reading form from the dashboard (AC2)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(window.location.hash).toBe('#/readings/new')
    expect(await screen.findByRole('heading', { name: 'Add reading' })).toBeVisible()
  })

  it('opens the booking form from the dashboard (AC3)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(window.location.hash).toBe('#/appointments/new')
    expect(await screen.findByRole('heading', { name: 'Book appointment' })).toBeVisible()
  })
})
