import { useState, type FormEvent } from 'react'
import { WEEKDAYS } from './format'
import type { WorkingDay } from './techniciansApi'

interface Row {
  working: boolean
  start: string
  end: string
}

const DEFAULT_ROW: Row = { working: false, start: '09:00', end: '17:00' }

interface Props {
  saved: WorkingDay[]
  /** Resolves with per-weekday errors when the server refuses the schedule, or {} when it saved. */
  onSave: (days: WorkingDay[]) => Promise<Record<number, string>>
}

const rowsFrom = (saved: WorkingDay[]): Row[] =>
  WEEKDAYS.map((_, weekday) => {
    const day = saved.find((d) => d.weekday === weekday)
    return day ? { working: true, start: day.start, end: day.end } : DEFAULT_ROW
  })

/** After a refused save the rows go back to the saved schedule, so the rejected input is never shown as saved. */
export function WeeklyHoursForm({ saved, onSave }: Props) {
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(saved))
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const set = (weekday: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === weekday ? { ...r, ...patch } : r)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const days = rows.flatMap((r, weekday) => (r.working ? [{ weekday, start: r.start, end: r.end }] : []))
    const refused = await onSave(days)
    if (Object.keys(refused).length) setRows(rowsFrom(saved))
    setErrors(refused)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="stack">
      {WEEKDAYS.map((name, weekday) => {
        const row = rows[weekday]
        const error = errors[weekday]
        return (
          <div key={name} className="cluster">
            <label className="checkbox">
              <input type="checkbox" checked={row.working} onChange={(e) => set(weekday, { working: e.target.checked })} />
              <span>{name}</span>
            </label>
            <input
              type="time"
              className={error ? 'input is-invalid' : 'input'}
              aria-label={`${name} start time`}
              value={row.start}
              disabled={!row.working}
              aria-invalid={error ? true : undefined}
              onChange={(e) => set(weekday, { start: e.target.value })}
            />
            <input
              type="time"
              className={error ? 'input is-invalid' : 'input'}
              aria-label={`${name} end time`}
              value={row.end}
              disabled={!row.working}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `hours-error-${weekday}` : undefined}
              onChange={(e) => set(weekday, { end: e.target.value })}
            />
            {error && (
              <p className="field-error" id={`hours-error-${weekday}`}>
                {error}
              </p>
            )}
          </div>
        )
      })}
      <div>
        <button type="submit" className="btn btn-secondary" disabled={saving}>
          Save weekly hours
        </button>
      </div>
    </form>
  )
}
