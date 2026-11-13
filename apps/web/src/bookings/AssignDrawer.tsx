import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Booking, BookingsApi, TechnicianOption } from './bookingsApi'
import { bookingRef, formatDay, weekdayName } from './format'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]'

interface AssignDrawerProps {
  api: BookingsApi
  booking: Booking
  /** The current technician's name when this is a reassignment. */
  currentName: string | null
  onSubmit: (technicianId: string) => Promise<void>
  onClose: () => void
}

function Option({ option, booking, name }: { option: TechnicianOption; booking: Booking; name: string }) {
  const off = option.daysOff.includes(booking.day)
  const jobs = option.jobsOnDay.length
  const notWorking = !option.workingHours && !off
  const flagged = off || notWorking || jobs > 0
  const otherDaysOff = option.daysOff.filter((d) => d !== booking.day)
  return (
    <label className="flex cursor-pointer flex-col gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-2)]">
      <span className="flex items-center gap-[var(--space-2)]">
        <input className="radio" type="radio" name={name} value={option.id} aria-label={option.name} />
        <span className="flex flex-col">
          <span className="font-[var(--font-weight-bold)]">{option.name}</span>
          {option.serviceArea && (
            <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{option.serviceArea}</span>
          )}
        </span>
      </span>
      <dl className="m-0 flex flex-col gap-[var(--space-1)] text-[length:var(--font-size-sm)]">
        <div className="flex gap-[var(--space-2)]">
          <dt className="text-[var(--color-fg-muted)]">Hours</dt>
          <dd className="m-0">
            {option.workingHours
              ? `${weekdayName(booking.day)} ${option.workingHours.start}–${option.workingHours.end}`
              : `Not working on ${weekdayName(booking.day)}s`}
          </dd>
        </div>
        <div className="flex gap-[var(--space-2)]">
          <dt className="text-[var(--color-fg-muted)]">Days off</dt>
          <dd className="m-0">
            {[...(off ? [booking.day] : []), ...otherDaysOff].map(formatDay).join(', ') || 'None marked'}
          </dd>
        </div>
        <div className="flex gap-[var(--space-2)]">
          <dt className="text-[var(--color-fg-muted)]">Jobs that day</dt>
          <dd className="m-0">
            {jobs
              ? option.jobsOnDay.map((j) => `${bookingRef(j)} ${j.window}`).join(', ')
              : 'None'}
          </dd>
        </div>
      </dl>
      {flagged && (
        <span className="cluster">
          {off && <span className="badge badge-warning">Off on {formatDay(booking.day)}</span>}
          {notWorking && <span className="badge badge-warning">Not a working day</span>}
          {jobs > 0 && (
            <span className="badge badge-warning">
              Holds {jobs} {jobs === 1 ? 'job' : 'jobs'} that day
            </span>
          )}
          <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">You can still assign.</span>
        </span>
      )}
    </label>
  )
}

export function AssignDrawer({ api, booking, currentName, onSubmit, onClose }: AssignDrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [options, setOptions] = useState<TechnicianOption[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const reassign = currentName !== null
  const label = reassign ? 'Reassign technician' : 'Assign technician'

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [])

  useEffect(() => {
    let current = true
    api
      .getTechnicianOptions(booking.id)
      .then((all) => current && setOptions(all.filter((o) => o.id !== booking.technicianId)))
      .catch(() => current && setFailed(true))
    return () => {
      current = false
    }
  }, [api, booking.id, booking.technicianId])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function submit() {
    if (!chosen) {
      setInvalid(true)
      ref.current?.querySelector<HTMLElement>('input[type="radio"]')?.focus()
      return
    }
    setSaving(true)
    try {
      await onSubmit(chosen)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="drawer is-open flex flex-col gap-[var(--space-3)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-start justify-between gap-[var(--space-2)]">
          <div>
            <h2 id="assign-title">{reassign ? `Reassign ${bookingRef(booking)}` : `Assign technician to ${bookingRef(booking)}`}</h2>
            <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              Customer {booking.customerId}, {formatDay(booking.day)}, {booking.window}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {reassign && (
          <p className="text-[length:var(--font-size-sm)]">
            Current technician: <strong>{currentName}</strong>
          </p>
        )}
        <form
          noValidate
          className="flex flex-1 flex-col gap-[var(--space-3)]"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <fieldset
            className="m-0 flex flex-col gap-[var(--space-2)] border-0 p-0"
            aria-describedby={invalid ? 'choice-hint choice-error' : 'choice-hint'}
            onChange={(e) => {
              setChosen((e.target as unknown as HTMLInputElement).value)
              setInvalid(false)
            }}
          >
            <legend className="font-[var(--font-weight-medium)]">Choose a technician</legend>
            {!options && !failed && (
              <div aria-busy="true" className="stack stack-sm">
                <span className="skeleton" />
                <span className="skeleton" />
              </div>
            )}
            {failed && (
              <p className="field-error" role="alert">
                The technicians did not load. Close this and try again.
              </p>
            )}
            {options?.map((o) => <Option key={o.id} option={o} booking={booking} name="technician" />)}
            <span id="choice-hint" className="field-hint">
              Working hours, days off and jobs are shown for the booking’s day. Inactive technicians are not offered.
              Nothing here blocks the assignment.
            </span>
            {invalid && (
              <span id="choice-error" className="field-error" role="alert">
                Choose a technician to continue.
              </span>
            )}
          </fieldset>
          <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
            {reassign
              ? `On saving, the new technician is notified of the assignment and ${currentName} is told the booking was removed from them.`
              : 'On saving, the technician is notified of the assignment.'}
          </p>
          <div className="flex justify-end gap-[var(--space-2)]">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving' : label}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
