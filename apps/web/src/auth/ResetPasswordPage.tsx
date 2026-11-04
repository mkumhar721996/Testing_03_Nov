import { useEffect, useState, type FormEvent } from 'react'
import { checkResetLink, confirmPasswordReset } from './authApi'
import { AuthLayout, goTo } from './AuthLayout'

type View = 'checking' | 'invalid-link' | 'default' | 'done'

const MIN_LENGTH = 8

export function ResetPasswordPage({ token }: { token: string }) {
  const [view, setView] = useState<View>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({})
  const [failed, setFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkResetLink(token).then(
      (valid) => !cancelled && setView(valid ? 'default' : 'invalid-link'),
      () => !cancelled && setView('invalid-link'),
    )
    return () => {
      cancelled = true
    }
  }, [token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFailed(false)
    if (password.length < MIN_LENGTH) {
      setFieldError({ password: `Use at least ${MIN_LENGTH} characters.` })
      return
    }
    if (password !== confirm) {
      setFieldError({ confirm: 'The passwords do not match.' })
      return
    }
    setFieldError({})
    setSubmitting(true)
    try {
      const result = await confirmPasswordReset(token, password)
      if (result === 'ok') setView('done')
      else if (result === 'invalid-link') setView('invalid-link')
      else setFieldError({ password: `Use at least ${MIN_LENGTH} characters.` })
    } catch {
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (view === 'checking') {
    return (
      <AuthLayout>
        <div className="card auth-card" role="status">
          <span className="spinner" aria-label="Checking the reset link" />
        </div>
      </AuthLayout>
    )
  }

  if (view === 'invalid-link') {
    return (
      <AuthLayout>
        <div className="card auth-card stack">
          <div className="alert alert-danger" role="alert">
            This reset link has expired or has already been used. Request a new one.
          </div>
          <button type="button" className="btn btn-primary" onClick={() => goTo('#/forgot-password')}>
            Request a new link
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (view === 'done') {
    return (
      <AuthLayout>
        <div className="card auth-card stack">
          <div className="alert alert-success" role="status">
            Your password has been reset. Your previous password no longer works.
          </div>
          <button type="button" className="btn btn-primary" onClick={() => goTo('#/sign-in')}>
            Sign in with your new password
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {failed && (
        <div className="alert alert-danger" role="alert">
          We could not save the new password. Check your connection and try again.
        </div>
      )}
      <form className="card auth-card stack" noValidate onSubmit={onSubmit}>
        <h1>Choose a new password</h1>
        <p className="text-muted">Use at least 8 characters. Your new password replaces the old one.</p>
        <div className="field">
          <label htmlFor="rp-new">New password</label>
          <input
            className={`input${fieldError.password ? ' is-invalid' : ''}`}
            id="rp-new"
            type="password"
            autoComplete="new-password"
            aria-describedby={fieldError.password ? 'rp-hint rp-new-error' : 'rp-hint'}
            aria-invalid={fieldError.password ? true : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="field-hint" id="rp-hint">
            At least 8 characters.
          </span>
          {fieldError.password && (
            <span className="field-error" id="rp-new-error">
              {fieldError.password}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="rp-confirm">Confirm new password</label>
          <input
            className={`input${fieldError.confirm ? ' is-invalid' : ''}`}
            id="rp-confirm"
            type="password"
            autoComplete="new-password"
            aria-describedby={fieldError.confirm ? 'rp-confirm-error' : undefined}
            aria-invalid={fieldError.confirm ? true : undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {fieldError.confirm && (
            <span className="field-error" id="rp-confirm-error">
              {fieldError.confirm}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden="true" />}
          Save new password
        </button>
      </form>
    </AuthLayout>
  )
}
