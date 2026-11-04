import { fireEvent, render, screen } from '@testing-library/react'
import * as authApi from './authApi'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('./authApi')

const SENT = 'If an account exists for this email address, we have sent a link to reset the password.'

function submit(email: string) {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
}

describe('ForgotPasswordPage', () => {
  it('shows the same confirmation whatever the address (AC13)', async () => {
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue()
    const { unmount } = render(<ForgotPasswordPage />)
    submit('priya.raman@northwind.example')
    expect(await screen.findByText(SENT)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Send reset link' })).toBeNull()
    unmount()

    render(<ForgotPasswordPage />)
    submit('nobody@northwind.example')
    expect(await screen.findByText(SENT)).toBeVisible()
    expect(authApi.requestPasswordReset).toHaveBeenLastCalledWith('nobody@northwind.example')
  })

  it('does not hide a network failure', async () => {
    vi.mocked(authApi.requestPasswordReset).mockRejectedValue(new Error('network'))
    render(<ForgotPasswordPage />)
    submit('a@b.c')
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send the reset link.')
    expect(screen.queryByText(SENT)).toBeNull()
  })

  it('goes back to sign in', () => {
    render(<ForgotPasswordPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    expect(window.location.hash).toBe('#/sign-in')
  })
})
