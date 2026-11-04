import { fireEvent, render, screen } from '@testing-library/react'
import * as authApi from './authApi'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('./authApi')

async function openForm() {
  vi.mocked(authApi.checkResetLink).mockResolvedValue(true)
  render(<ResetPasswordPage token="abc" />)
  await screen.findByRole('heading', { name: 'Choose a new password' })
}

function fill(password: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))
}

describe('ResetPasswordPage', () => {
  it('refuses an expired or used link and offers a new one (AC9)', async () => {
    vi.mocked(authApi.checkResetLink).mockResolvedValue(false)
    render(<ResetPasswordPage token="old" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This reset link has expired or has already been used. Request a new one.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }))
    expect(window.location.hash).toBe('#/forgot-password')
  })

  it('saves the new password and confirms it (AC3, AC4)', async () => {
    vi.mocked(authApi.confirmPasswordReset).mockResolvedValue('ok')
    await openForm()
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription('At least 8 characters.')
    fill('new-passw0rd', 'new-passw0rd')
    expect(
      await screen.findByText('Your password has been reset. Your previous password no longer works.'),
    ).toBeVisible()
    expect(authApi.confirmPasswordReset).toHaveBeenCalledWith('abc', 'new-passw0rd')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with your new password' }))
    expect(window.location.hash).toBe('#/sign-in')
  })

  it('shows an inline error and makes no request when the passwords differ', async () => {
    vi.mocked(authApi.confirmPasswordReset).mockClear()
    await openForm()
    fill('new-passw0rd', 'different-passw0rd')
    expect(await screen.findByText('The passwords do not match.')).toBeVisible()
    expect(screen.getByLabelText('Confirm new password')).toHaveClass('is-invalid')
    expect(authApi.confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('shows an inline error and makes no request when the password is too short', async () => {
    vi.mocked(authApi.confirmPasswordReset).mockClear()
    await openForm()
    fill('short', 'short')
    expect(await screen.findByText('Use at least 8 characters.')).toBeVisible()
    expect(authApi.confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('shows the invalid-link state when the link was used meanwhile (AC9)', async () => {
    vi.mocked(authApi.confirmPasswordReset).mockResolvedValue('invalid-link')
    await openForm()
    fill('new-passw0rd', 'new-passw0rd')
    expect(await screen.findByRole('alert')).toHaveTextContent('This reset link has expired')
  })
})
