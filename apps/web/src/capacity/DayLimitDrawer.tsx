import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CapacityApi, DayBooking, DaySlots } from './capacityApi'

const MAX_LIMIT = 200
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]'

interface DayLimitDrawerProps {
  api: CapacityApi
  days: string[]
  initialDay: string
  initialLimit: number | null
  onSave: (day: string, limit: number) => Promise<void>
  onClose: () => void
}

function parseLimit(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const n = Number(text)
  return n <= MAX_LIMIT ? n : null
}

function BookingRow({ booking }: { booking: DayBooking }) {
  return (
    <li className="flex flex-col gap-[var(--space-1)] border-b border-[var(--color-border)] py-[var(--space-2)]">
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <strong>{booking.customerName ?? booking.customerId}</strong>
        <span className="badge badge-success">Confirmed</span>
      </div>
      {booking.phone && <span className="text-[length:var(--font-size-sm)]">{booking.phone}</span>}
      {booking.address && <span className="text-[length:var(--font-size-sm)]">{booking.address}</span>}
      {booking.service && (
        <span className="text-[length:var(--font-size-sm)]">
          {booking.service}, {booking.window}
        </span>
      )}
      <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
        Engineer: {booking.engineer ?? 'Not assigned yet'}
      </span>
    </li>
  )
}

export function DayLimitDrawer({ api, days, initialDay, initialLimit, onSave, onClose }: DayLimitDrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [day, setDay] = useState(initialDay)
  const [text, setText] = useState(initialLimit === null ? '' : String(initialLimit))
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [slots, setSlots] = useState<DaySlots | null>(null)
  const [bookings, setBookings] = useState<DayBooking[]>([])

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [])

  useEffect(() => {
    let current = true
    setSlots(null)
    setBookings([])
    void Promise.all([api.fetchSlots(day), api.fetchDayBookings(day)])
      .then(([s, b]) => {
        if (!current) return
        setSlots(s)
        setBookings(b)
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [api, day])

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

  const typed = parseLimit(text)
  const belowBookings = typed !== null && typed < bookings.length

  async function submit() {
    if (typed === null) {
      setInvalid(true)
      document.getElementById('limit-value')?.focus()
      return
    }
    setInvalid(false)
    setSaving(true)
    try {
      await onSave(day, typed)
    } catch {
      // The page shows the failure; keep the drawer open so nothing typed is lost.
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
        aria-labelledby="day-limit-title"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between gap-[var(--space-2)]">
          <h2 id="day-limit-title">Set visit limit</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="field">
          <label htmlFor="limit-day">Day</label>
          <select id="limit-day" className="input" value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="limit-value">Visit limit</label>
          <input
            id="limit-value"
            className={`input${invalid ? ' is-invalid' : ''}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_LIMIT}
            value={text}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'limit-error' : 'limit-hint'}
            onChange={(e) => {
              setText(e.target.value)
              setInvalid(false)
            }}
          />
          <span id="limit-hint" className="field-hint">
            Total visits across all windows for this day.
          </span>
          {invalid && (
            <span id="limit-error" className="field-error" role="alert">
              Enter a whole number from 0 to {MAX_LIMIT}.
            </span>
          )}
        </div>
        {belowBookings && (
          <div className="alert alert-warning" role="status">
            <p>
              They stay confirmed. Customers cannot book it until bookings fall below {typed}.
            </p>
          </div>
        )}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void submit()}>
          {saving ? 'Saving limit' : 'Save limit'}
        </button>
        <section aria-labelledby="customers-see" className="stack">
          <h3 id="customers-see">What customers see</h3>
          <ul className="stack">
            {(slots?.slots ?? []).map((s) => (
              <li key={s.window} className="flex justify-between gap-[var(--space-2)]">
                <span>{s.window}</span>
                <span className="text-[var(--color-fg-muted)]">{s.bookable ? 'Bookable' : 'Not bookable'}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="day-bookings" className="stack">
          <div className="flex items-center justify-between gap-[var(--space-2)]">
            <h3 id="day-bookings">Bookings on this day</h3>
            <span className="badge" aria-label={`${bookings.length} bookings`}>
              {bookings.length}
            </span>
          </div>
          <ul>
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
