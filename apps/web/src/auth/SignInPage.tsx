import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import { AuthLayout, goTo } from './AuthLayout'

type Problem = 'invalid' | 'locked' | 'unavailable'

const problems: Record<Problem, string> = {
  invalid: 'Email or password is incorrect. Check both and try again.',
  locked:
    'This account is locked after too many failed sign-in attempts. Try again in 15 minutes, or reset your password.',
  unavailable: 'We could not sign you in. Check your connection and try again.',
}

export function SignInPage({ notice }: { notice?: 'signed-out' | 'expired' }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<Problem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setProblem(null)
    try {
      const result = await signIn(email, password)
      if (result.ok) goTo('')
      else setProblem(result.reason)
    } catch {
      setProblem('unavailable')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      {notice === 'signed-out' && (
        <div className="alert alert-info" role="status">
          You have signed out.
        </div>
      )}
      {notice === 'expired' && (
        <div className="alert alert-warning" role="status">
          Your session has ended. Sign in again to continue.
        </div>
      )}
      {problem && (
        <div className="alert alert-danger" role="alert">
          {problems[problem]}
        </div>
      )}
      <form className="card auth-card stack" noValidate onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="text-muted">Use the email address and password your HR team gave you.</p>
        <div className="field">
          <label htmlFor="si-email">Email address</label>
          <input
            className="input"
            id="si-email"
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="si-password">Password</label>
          <input
            className="input"
            id="si-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="auth-end">
          <button type="button" className="btn btn-ghost" onClick={() => goTo('#/forgot-password')}>
            Forgot password?
          </button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden="true" />}
          Sign in
        </button>
      </form>
    </AuthLayout>
  )
}
