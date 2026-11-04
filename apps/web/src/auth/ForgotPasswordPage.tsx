import { useState, type FormEvent } from 'react'
import { requestPasswordReset } from './authApi'
import { AuthLayout, goTo } from './AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'default' | 'submitting' | 'sent' | 'failed'>('default')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    try {
      await requestPasswordReset(email)
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <AuthLayout>
      {status === 'sent' ? (
        <div className="card auth-card stack">
          <div className="alert alert-success" role="status">
            If an account exists for this email address, we have sent a link to reset the password.
          </div>
        </div>
      ) : (
        <>
          {status === 'failed' && (
            <div className="alert alert-danger" role="alert">
              We could not send the reset link. Check your connection and try again.
            </div>
          )}
          <form className="card auth-card stack" noValidate onSubmit={onSubmit}>
            <h1>Forgot your password?</h1>
            <p className="text-muted">
              Enter the email address on your account. We will send you a link to choose a new password.
            </p>
            <div className="field">
              <label htmlFor="fp-email">Email address</label>
              <input
                className="input"
                id="fp-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
              {status === 'submitting' && <span className="spinner" aria-hidden="true" />}
              Send reset link
            </button>
          </form>
        </>
      )}
      <button type="button" className="btn btn-ghost auth-link" onClick={() => goTo('#/sign-in')}>
        Back to sign in
      </button>
    </AuthLayout>
  )
}
