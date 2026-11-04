import { fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from './AuthProvider'
import * as authApi from './authApi'
import { SignInPage } from './SignInPage'

vi.mock('./authApi')

beforeEach(() => {
  window.location.hash = '#/sign-in'
  vi.mocked(authApi.getSession).mockResolvedValue(null)
})

function submit(password = 'pw') {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'priya.raman@northwind.example' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

const renderPage = (notice?: 'signed-out' | 'expired') =>
  render(
    <AuthProvider>
      <SignInPage notice={notice} />
    </AuthProvider>,
  )

describe('SignInPage', () => {
  it('shows the form with its logo bar', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Company logo' })).toBeVisible()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('sends the person to the app after a successful sign-in (AC1)', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({ ok: true, user: { id: 'u', email: 'e', name: 'n' } })
    renderPage()
    submit()
    await vi.waitFor(() => expect(window.location.hash).toBe(''))
    expect(authApi.signIn).toHaveBeenCalledWith('priya.raman@northwind.example', 'pw')
  })

  it('shows one error for a refused sign-in (AC6, AC7)', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({ ok: false, reason: 'invalid' })
    renderPage()
    submit('wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect. Check both and try again.',
    )
  })

  it('says the account is locked (AC10)', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({ ok: false, reason: 'locked' })
    renderPage()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This account is locked after too many failed sign-in attempts. Try again in 15 minutes, or reset your password.',
    )
  })

  it('shows a page-level error when the API cannot be reached', async () => {
    vi.mocked(authApi.signIn).mockRejectedValue(new Error('network'))
    renderPage()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not sign you in.')
  })

  it('shows the signed-out and session-ended notices (AC2, AC5)', () => {
    renderPage('signed-out')
    expect(screen.getByText('You have signed out.')).toBeVisible()
  })

  it('shows the session-ended notice (AC5)', () => {
    renderPage('expired')
    expect(screen.getByText('Your session has ended. Sign in again to continue.')).toBeVisible()
  })

  it('opens the forgot password page', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(window.location.hash).toBe('#/forgot-password')
  })
})
