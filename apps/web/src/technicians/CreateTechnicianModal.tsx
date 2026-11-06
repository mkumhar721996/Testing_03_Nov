import { useState, type FormEvent } from 'react'
import { ValidationError, type NewTechnicianInput } from './techniciansApi'

interface Props {
  onCreate: (input: NewTechnicianInput) => Promise<void>
  onClose: () => void
}

export function CreateTechnicianModal({ onCreate, onClose }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const value = (k: string) => String(data.get(k) ?? '').trim()
    const found: Record<string, string> = {}
    if (!value('name')) found.name = 'Enter the technician’s full name'
    if (!value('loginEmail')) found.loginEmail = 'Enter the technician’s login email'
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await onCreate({ name: value('name'), loginEmail: value('loginEmail'), phone: value('phone'), serviceArea: value('serviceArea') })
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors(err.errors)
        setFormError(Object.keys(err.errors).length ? null : err.message)
      } else {
        setFormError('The technician could not be saved. Try again.')
      }
      setSaving(false)
    }
  }

  const field = (name: string, label: string, opts: { required?: boolean; type?: string; hint?: string } = {}) => (
    <div className="field">
      <label htmlFor={`new-${name}`}>
        {label}
        {opts.required ? '' : ' (optional)'}
      </label>
      <input
        id={`new-${name}`}
        name={name}
        type={opts.type ?? 'text'}
        className={errors[name] ? 'input is-invalid' : 'input'}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `new-${name}-error` : undefined}
      />
      {errors[name] && (
        <p className="field-error" id={`new-${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <form onSubmit={submit} noValidate className="stack">
          <h2 id="create-title">New technician</h2>
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}
          {field('name', 'Full name', { required: true })}
          {field('loginEmail', 'Login email', { required: true, type: 'email' })}
          {field('phone', 'Phone')}
          {field('serviceArea', 'Service area')}
          <div className="cluster">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Create technician
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
