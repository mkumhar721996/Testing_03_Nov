import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AuthRefusedError } from './authApi'
import { AuthPanel } from './AuthPanel'
import { AuthTopBar } from './AuthTopBar'
import { EMAIL_PROBLEM, PASSWORD_PROBLEM, isValidEmail, isValidPassword } from './clientValidation'
import { useAuth } from './useAuth'

type Tab = 'sign-in' | 'register'
type Notice = { kind: 'refused' | 'locked' | 'register-refused'; message: string } | null

const TABS: { id: Tab; label: string }[] = [
  { id: 'sign-in', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
]

const title = 'text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]'

export function AuthPage() {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [notice, setNotice] = useState<Notice>(null)
  const [signedOut, setSignedOut] = useState(false)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (signedOut) emailRef.current?.focus()
  }, [signedOut])

  const switchTab = (next: Tab) => {
    setTab(next)
    setNotice(null)
    setSignedOut(false)
    setTouched({ email: false, password: false })
  }

  const emailError = tab === 'register' && touched.email && !isValidEmail(email) ? EMAIL_PROBLEM : null
  const passwordError = tab === 'register' && touched.password && !isValidPassword(password) ? PASSWORD_PROBLEM : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSignedOut(false)
    if (tab === 'register') {
      setTouched({ email: true, password: true })
      if (!isValidEmail(email) || !isValidPassword(password)) return
    }
    setBusy(true)
    setNotice(null)
    try {
      await (tab === 'register' ? auth.register(email, password) : auth.signIn(email, password))
    } catch (err) {
      const message = err instanceof AuthRefusedError ? err.message : 'Something went wrong. Try again.'
      const locked = err instanceof AuthRefusedError && err.status === 429
      setNotice({ kind: tab === 'register' ? 'register-refused' : locked ? 'locked' : 'refused', message })
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await auth.signOut()
    setEmail('')
    setPassword('')
    setTab('sign-in')
    setNotice(null)
    setSignedOut(true)
  }

  const invalidSignIn = tab === 'sign-in' && notice?.kind === 'refused'
  const invalidRegisterEmail = tab === 'register' && notice?.kind === 'register-refused'

  return (
    <div className="min-h-screen bg-[var(--color-bg-muted)]">
      <AuthTopBar />
      <main className="mx-auto my-[var(--space-4)] max-w-[var(--modal-width)] px-[var(--space-3)]">
        <AuthPanel>
          {auth.status === 'loading' ? (
            <div aria-busy="true" aria-label="Checking your session" className="flex flex-col gap-[var(--space-2)]">
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          ) : auth.status === 'signed-in' && auth.user ? (
            <>
              <h1 className={title}>Signed in</h1>
              <p>Signed in as {auth.user.email}</p>
              <div className="flex items-center gap-[var(--space-2)]">
                <span>Role</span>
                <span className="badge badge-success">{auth.user.role}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="tabs" role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    className="tab"
                    aria-selected={tab === t.id}
                    onClick={() => switchTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {signedOut && (
                <div className="alert alert-success" role="status">
                  You have been signed out.
                </div>
              )}
              <h1 className={title}>{tab === 'register' ? 'Create your account' : 'Sign in to your account'}</h1>
              {tab === 'register' && <p className="text-muted">Register with your email to book and manage visits.</p>}
              {notice?.kind === 'refused' && (
                <div className="alert alert-danger" role="alert">
                  {notice.message}. Check both and try again.
                </div>
              )}
              {notice?.kind === 'locked' && (
                <div className="alert alert-warning" role="alert">
                  {notice.message}
                </div>
              )}
              {notice?.kind === 'register-refused' && (
                <div className="alert alert-danger" role="alert">
                  {notice.message}. Check your details, or sign in if you already have an account.
                </div>
              )}
              <form noValidate onSubmit={submit} className="flex flex-col gap-[var(--space-3)]">
                <div className="field">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    ref={emailRef}
                    className={`input${emailError || invalidSignIn || invalidRegisterEmail ? ' is-invalid' : ''}`}
                    type="email"
                    autoComplete="email"
                    value={email}
                    aria-invalid={Boolean(emailError || invalidSignIn || invalidRegisterEmail)}
                    aria-describedby={emailError ? 'auth-email-error' : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  />
                  {emailError && (
                    <span id="auth-email-error" className="field-error" role="alert">
                      {emailError}
                    </span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    className={`input${passwordError || invalidSignIn ? ' is-invalid' : ''}`}
                    type="password"
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    aria-invalid={Boolean(passwordError || invalidSignIn)}
                    aria-describedby={
                      tab === 'register' ? `auth-password-hint${passwordError ? ' auth-password-error' : ''}` : undefined
                    }
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  />
                  {tab === 'register' && (
                    <span id="auth-password-hint" className="field-hint">
                      At least 8 characters, with a letter and a digit.
                    </span>
                  )}
                  {passwordError && (
                    <span id="auth-password-error" className="field-error" role="alert">
                      {passwordError}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={busy || notice?.kind === 'locked'}
                >
                  {busy && <span className="spinner" aria-hidden="true" />}
                  {tab === 'register' ? 'Create account' : 'Sign in'}
                </button>
              </form>
              <p className="text-[length:var(--font-size-sm)]">
                {tab === 'sign-in' ? (
                  <>
                    No account yet?{' '}
                    <a href="#/account" onClick={() => switchTab('register')}>
                      Create one
                    </a>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <a href="#/account" onClick={() => switchTab('sign-in')}>
                      Sign in
                    </a>
                  </>
                )}
              </p>
            </>
          )}
        </AuthPanel>
      </main>
    </div>
  )
}
