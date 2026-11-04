import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { apiFetch } from './auth/apiFetch'
import * as authApi from './auth/authApi'

vi.mock('./auth/authApi')

const profile = { name: 'Jordan Davies', consultancy: 'Northside Heart Clinic', condition: 'Hypertension' }
const user = { id: 'u1', email: 'priya.raman@northwind.example', name: 'Priya Raman' }

beforeEach(() => {
  window.location.hash = ''
  vi.mocked(authApi.getSession).mockResolvedValue(user)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => profile }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the health dashboard as the home screen (AC4)', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(await screen.findByText('Jordan Davies')).toBeInTheDocument()
  })

  it('opens the Add reading form from the dashboard (AC2)', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add reading' }))
    expect(window.location.hash).toBe('#/readings/new')
    expect(await screen.findByRole('heading', { name: 'Add reading' })).toBeVisible()
  })

  it('opens the booking form from the dashboard (AC3)', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Book appointment' }))
    expect(window.location.hash).toBe('#/appointments/new')
    expect(await screen.findByRole('heading', { name: 'Book appointment' })).toBeVisible()
  })
})

describe('App sign-in protection', () => {
  it.each(['', '#/readings/new', '#/appointments/new'])(
    'redirects a signed-out person opening %j to the sign-in page (AC5)',
    async (hash) => {
      vi.mocked(authApi.getSession).mockResolvedValue(null)
      window.location.hash = hash
      render(<App />)
      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
      expect(window.location.hash).toBe('#/sign-in')
      expect(screen.queryByText('Your session has ended. Sign in again to continue.')).toBeNull()
    },
  )

  it('lands on the dashboard after signing in (AC1)', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    vi.mocked(authApi.signIn).mockResolvedValue({ ok: true, user })
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    expect(window.location.hash).toBe('')
  })

  it('shows the sign-in page with a signed-out notice after Sign out (AC2)', async () => {
    vi.mocked(authApi.signOut).mockResolvedValue()
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(screen.getByText('You have signed out.')).toBeVisible()
    expect(window.location.hash).toBe('#/sign-in')
  })

  it('shows the session-ended notice when the API answers 401 after load (AC5)', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await apiFetch('/patients/me')
    expect(await screen.findByText('Your session has ended. Sign in again to continue.')).toBeVisible()
    expect(window.location.hash).toBe('#/sign-in')
  })

  it('keeps the reset pages open without a session (AC3)', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    vi.mocked(authApi.checkResetLink).mockResolvedValue(true)
    window.location.hash = '#/reset-password?token=abc'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeVisible()
    expect(authApi.checkResetLink).toHaveBeenCalledWith('abc')
  })
})
