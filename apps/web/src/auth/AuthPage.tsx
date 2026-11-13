import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AuthRefusedError } from './authApi'
import { isValidEmail, isValidPassword } from './clientValidation'
import { AuthPanel } from './AuthPanel'
import { AuthTopBar } from './AuthTopBar'
import { useAuth } from './useAuth'

type Tab = 'sign-in' | 'register'
type Failure = 'refused' | 'locked' | 'register-refused' | 'unavailable'

const EMAIL_ERROR = 'Enter an email address with one @ and a domain, like name@example.com.'
const PASSWORD_ERROR = 'Password needs at least 8 characters, a letter and a digit.'

const tabs: { id: Tab; label: string }[] = [
  { id: 'sign-in', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
]

function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function AuthPage() {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [failure, setFailure] = useState<Failure | null>(null)
  const [lockedMessage, setLockedMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (signedOut) emailRef.current?.focus()
  }, [signedOut])

  const registering = tab === 'register'
  const emailInvalid = registering && touched.email && !isValidEmail(email)
  const passwordInvalid = registering && touched.password && !isValidPassword(password)
  const refused = failure === 'refused'
  const emailMarked = emailInvalid || failure === 'register-refused' || refused
  const passwordMarked = passwordInvalid || refused

  function chooseTab(next: Tab) {
    setTab(next)
    setPassword('')
    setTouched({ email: false, password: false })
    setFailure(null)
    setSignedOut(false)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFailure(null)
    if (registering) {
      setTouched({ email: true, password: true })
      if (!isValidEmail(email) || !isValidPassword(password)) return
    }
    setSubmitting(true)
    try {
      await (registering ? auth.register(email.trim(), password) : auth.signIn(email.trim(), password))
      setSignedOut(false)
    } catch (err) {
      if (err instanceof AuthRefusedError && err.status === 429) {
        setLockedMessage(err.message)
        setFailure('locked')
      } else if (err instanceof AuthRefusedError && registering && (err.status === 409 || err.status === 400)) {
        setFailure('register-refused')
      } else if (err instanceof AuthRefusedError && err.status === 401) {
        setFailure('refused')
      } else {
        setFailure('unavailable')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function onSignOut() {
    try {
      await auth.signOut()
      setEmail('')
      setPassword('')
      setTab('sign-in')
      setSignedOut(true)
    } catch {
      setFailure('unavailable')
    }
  }

  let body
  if (auth.status === 'loading') {
    body = (
      <div aria-label="Checking your session" className="flex flex-col gap-[var(--space-3)]">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    )
  } else if (auth.status === 'signed-in' && auth.user) {
    body = (
      <>
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Signed in</h1>
        <p>Signed in as {auth.user.email}</p>
        <div className="flex items-center gap-[var(--space-2)]">
          <span className="text-[var(--color-fg-muted)]">Role</span>
          <span className="badge badge-success">{auth.user.role}</span>
        </div>
        {failure === 'unavailable' && (
          <div role="alert" className="alert alert-danger">
            Something went wrong. Try again.
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={onSignOut}>
          Sign out
        </button>
      </>
    )
  } else {
    body = (
      <>
        <div role="tablist" className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === t.id}
              onClick={() => chooseTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {signedOut && !registering && (
          <div role="status" className="alert alert-success">
            You have been signed out.
          </div>
        )}
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">
          {registering ? 'Create your account' : 'Sign in to your account'}
        </h1>
        {registering && <p className="text-muted">Use your email address and a password to get started.</p>}
        {refused && (
          <div role="alert" className="alert alert-danger">
            Email or password is incorrect. Check both and try again.
          </div>
        )}
        {failure === 'locked' && (
          <div role="alert" className="alert alert-warning">
            {lockedMessage}
          </div>
        )}
        {failure === 'register-refused' && (
          <div role="alert" className="alert alert-danger">
            Registration could not be completed. Check your details, or sign in if you already have an account.
          </div>
        )}
        {failure === 'unavailable' && (
          <div role="alert" className="alert alert-danger">
            Something went wrong. Try again.
          </div>
        )}
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[var(--space-3)]">
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              className={`input${emailMarked ? ' is-invalid' : ''}`}
              aria-invalid={emailMarked}
              aria-describedby={emailInvalid ? 'auth-email-error' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (failure === 'locked') setFailure(null)
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            />
            {emailInvalid && (
              <span id="auth-email-error" role="alert" className="field-error">
                {EMAIL_ERROR}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              className={`input${passwordMarked ? ' is-invalid' : ''}`}
              aria-invalid={passwordMarked}
              aria-describedby={registering ? `auth-password-hint${passwordInvalid ? ' auth-password-error' : ''}` : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            />
            {registering && (
              <span id="auth-password-hint" className="field-hint">
                At least 8 characters, with a letter and a digit.
              </span>
            )}
            {passwordInvalid && (
              <span id="auth-password-error" role="alert" className="field-error">
                {PASSWORD_ERROR}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || failure === 'locked'}
          >
            {submitting && <Spinner />}
            {registering ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {registering ? (
          <p>
            Already have an account?{' '}
            <a href="#/account" onClick={() => chooseTab('sign-in')}>
              Sign in
            </a>
          </p>
        ) : (
          <p>
            No account yet?{' '}
            <a href="#/account" onClick={() => chooseTab('register')}>
              Create one
            </a>
          </p>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-muted)] text-[var(--color-fg)]">
      <AuthTopBar />
      <main className="mx-auto my-[var(--space-4)] max-w-[var(--modal-width)] px-[var(--space-3)]">
        <AuthPanel>{body}</AuthPanel>
      </main>
    </div>
  )
}
