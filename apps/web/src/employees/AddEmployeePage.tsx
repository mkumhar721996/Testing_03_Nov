import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert } from '../components/Alert'
import { Badge } from '../components/Badge'
import { controlClass, Field } from '../components/Field'
import { createEmployee, WorkEmailInUseError, type NewEmployee, type OrgOption } from './employeesApi'
import { card, cardTitle, page, primaryButton, secondaryButton, skeleton, spinner } from './ui'
import { useFormOptions } from './useFormOptions'

const EMPTY: NewEmployee = {
  firstName: '',
  lastName: '',
  personalEmail: '',
  phone: '',
  workEmail: '',
  departmentId: '',
  jobTitleId: '',
  managerId: '',
}

type Errors = Partial<Record<keyof NewEmployee, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(v: NewEmployee): Errors {
  const errors: Errors = {}
  if (!v.firstName.trim()) errors.firstName = 'Enter a first name.'
  if (!v.lastName.trim()) errors.lastName = 'Enter a last name.'
  if (!v.workEmail.trim()) errors.workEmail = 'Enter a work email.'
  else if (!EMAIL.test(v.workEmail.trim())) errors.workEmail = 'Enter a valid work email.'
  if (v.personalEmail.trim() && !EMAIL.test(v.personalEmail.trim())) errors.personalEmail = 'Enter a valid personal email.'
  if (!v.departmentId) errors.departmentId = 'Select a department.'
  if (!v.jobTitleId) errors.jobTitleId = 'Select a job title.'
  return errors
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={card}>
      <h2 id={id} className={cardTitle}>
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-[var(--space-3)] md:grid-cols-2">{children}</div>
    </section>
  )
}

function Select({ placeholder, options, ...props }: { placeholder: string; options: OrgOption[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={controlClass(props['aria-invalid'] === true)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

function OptionsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-[var(--space-3)]">
      <span className="sr-only">Loading the department, job title and manager lists</span>
      <span className={`${skeleton} w-[60%]`} />
      <span className={`${skeleton} w-[80%]`} />
      <span className={`${skeleton} w-[40%]`} />
    </div>
  )
}

export function AddEmployeePage({ onSaved, onCancel }: { onSaved: (id: string) => void; onCancel: () => void }) {
  const options = useFormOptions()
  const [values, setValues] = useState<NewEmployee>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<'duplicate' | 'other' | null>(null)

  const bind = (key: keyof NewEmployee) => ({
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
  })
  const invalid = (key: keyof NewEmployee) => controlClass(Boolean(errors[key]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      const { employee } = await createEmployee({
        ...values,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        workEmail: values.workEmail.trim(),
      })
      onSaved(employee.id)
    } catch (err) {
      if (err instanceof WorkEmailInUseError) {
        setErrors({ workEmail: 'This work email is already in use.' })
        setFailure('duplicate')
      } else {
        setFailure('other')
      }
      setSaving(false)
    }
  }

  return (
    <main aria-label="Add employee" className={page}>
      <div className="mb-[var(--space-4)]">
        <p className="mb-[var(--space-1)] text-[length:var(--font-size-sm)] text-[var(--color-info)]">
          Employees / New employee
        </p>
        <h1 className="mb-[var(--space-1)] text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--color-info)]">
          Add employee
        </h1>
        <p className="text-[var(--color-fg-muted)]">
          Create one record per person. The employee is invited to sign in at their work email.
        </p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-[var(--space-3)]">
        {failure === 'duplicate' && (
          <Alert variant="danger">
            <p>
              <strong>Employee not saved.</strong> The work email is already in use by another employee record. Enter a
              different work email, then save again.
            </p>
          </Alert>
        )}
        {failure === 'other' && (
          <Alert variant="danger">
            <p>We couldn&apos;t save the employee. Try again.</p>
          </Alert>
        )}

        <Section id="personal-details" title="Personal details">
          <Field id="first-name" label="First name" error={errors.firstName}>
            {(c) => <input {...c} {...bind('firstName')} autoComplete="off" placeholder="e.g. Maria" className={invalid('firstName')} />}
          </Field>
          <Field id="last-name" label="Last name" error={errors.lastName}>
            {(c) => <input {...c} {...bind('lastName')} autoComplete="off" placeholder="e.g. Okafor" className={invalid('lastName')} />}
          </Field>
          <Field id="personal-email" label="Personal email" error={errors.personalEmail}>
            {(c) => <input {...c} {...bind('personalEmail')} type="email" placeholder="maria.okafor@example.com" className={invalid('personalEmail')} />}
          </Field>
          <Field id="phone" label="Phone">
            {(c) => <input {...c} {...bind('phone')} type="tel" placeholder="+44 20 7946 0000" className={invalid('phone')} />}
          </Field>
        </Section>

        <Section id="work-details" title="Work details">
          {options.state.status === 'loading' && <OptionsSkeleton />}
          {options.state.status === 'error' && (
            <div className="md:col-span-2">
              <Alert variant="danger">
                <p>
                  We couldn&apos;t load the department, job title and manager lists. Check your connection and try again.
                </p>
                <div>
                  <button type="button" onClick={options.retry} className={secondaryButton}>
                    Retry
                  </button>
                </div>
              </Alert>
            </div>
          )}
          {options.state.status === 'loaded' && (
            <>
              <Field id="work-email" label="Work email" hint="An invitation to sign in is sent here." error={errors.workEmail}>
                {(c) => <input {...c} {...bind('workEmail')} type="email" placeholder="maria.okafor@acme.com" className={invalid('workEmail')} />}
              </Field>
              <Field id="department" label="Department" error={errors.departmentId}>
                {(c) => <Select {...c} {...bind('departmentId')} placeholder="Select a department" options={options.state.status === 'loaded' ? options.state.value.departments : []} />}
              </Field>
              <Field id="job-title" label="Job title" error={errors.jobTitleId}>
                {(c) => <Select {...c} {...bind('jobTitleId')} placeholder="Select a job title" options={options.state.status === 'loaded' ? options.state.value.jobTitles : []} />}
              </Field>
              <Field id="manager" label="Manager">
                {(c) => <Select {...c} {...bind('managerId')} placeholder="Select a manager" options={options.state.status === 'loaded' ? options.state.value.managers : []} />}
              </Field>
            </>
          )}
          <p className="flex items-center gap-[var(--space-2)] text-[var(--color-fg-muted)] md:col-span-2">
            Status <Badge>Pending start</Badge>
          </p>
        </Section>

        <div className="flex flex-wrap justify-end gap-[var(--space-2)]">
          <button type="button" onClick={onCancel} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving && <span aria-hidden="true" className={spinner} />}
            Save employee
          </button>
        </div>
      </form>
    </main>
  )
}
