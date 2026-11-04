import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }

beforeEach(() => {
  window.location.hash = ''
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => profile }))
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

  it('has no bet control on the dashboard', () => {
    render(<App />)
    expect(screen.queryByRole('group', { name: 'Bet' })).not.toBeInTheDocument()
  })

  it('opens the slot game at #/slot', () => {
    window.location.hash = '#/slot'
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Wheels Go round Tiger' })).toBeInTheDocument()
  })

  it('opens the Organization screen at #/organizations/<uuid>', async () => {
    window.location.hash = '#/organizations/11111111-1111-4111-8111-111111111111'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Organization' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
