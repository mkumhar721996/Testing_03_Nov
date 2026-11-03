import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  isFormValid,
  isValidDate,
  todayLocal,
  validateField,
  type ReadingTypeConfig,
  type ValueFieldLimits,
} from '../features/readings/readingTypes'
import { SaveError, fetchReadingTypes, saveReading } from '../features/readings/readingsApi'

interface AddReadingScreenProps {
  onSaved: () => void
  onCancel: () => void
}

const OFFLINE_MESSAGE = "You're offline. Reconnect, then press Save reading."
const FAILED_MESSAGE = "We couldn't save your reading. Check your connection and try again."

export default function AddReadingScreen({ onSaved, onCancel }: AddReadingScreenProps) {
  const uid = useId()
  const [types, setTypes] = useState<ReadingTypeConfig[] | null>(null)
  const [typesFailed, setTypesFailed] = useState(false)
  const [typeId, setTypeId] = useState('')
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [date, setDate] = useState(() => todayLocal())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null)
  // Created once per mounted form and reused on retry, so the server can dedupe.
  const [clientRequestId] = useState(() => crypto.randomUUID())
  const savingRef = useRef(false)
  const today = todayLocal()

  const loadTypes = useCallback(() => {
    setTypesFailed(false)
    setTypes(null)
    fetchReadingTypes().then(setTypes, () => setTypesFailed(true))
  }, [])
  useEffect(loadTypes, [loadTypes])

  const type = types?.find((t) => t.id === typeId)
  const valid = isFormValid(type, raw, date, today)

  function chooseType(id: string) {
    setTypeId(id)
    setRaw({})
    setTouched({})
    setFormError(null)
    setServerError(null)
  }

  function changeValue(key: string, value: string) {
    setRaw((r) => ({ ...r, [key]: value }))
    setServerError(null)
  }

  function fieldMessage(f: ValueFieldLimits): string | undefined {
    if (serverError?.field === f.key) return serverError.message
    const result = validateField(f, raw[f.key] ?? '')
    if (result.valid) return undefined
    if (result.blank) return touched[f.key] ? `Enter a ${f.label.toLowerCase()}.` : undefined
    return result.message
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (savingRef.current || !type || !valid) return
    savingRef.current = true
    setSaving(true)
    setFormError(null)
    setServerError(null)
    try {
      await saveReading({
        clientRequestId,
        type: type.id,
        values: Object.fromEntries(type.fields.map((f) => [f.key, Number(raw[f.key])])),
        date,
        note: note.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      if (err instanceof SaveError && err.kind === 'offline') setFormError(OFFLINE_MESSAGE)
      else if (err instanceof SaveError && err.kind === 'invalid' && err.field && err.message) {
        setServerError({ field: err.field, message: err.message })
      } else setFormError(FAILED_MESSAGE)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const dateInvalid = !isValidDate(date, today) && date !== ''
  const fields: ValueFieldLimits[] = type?.fields ?? [{ key: 'value', label: 'Value', unit: '', min: 0, max: 0 }]

  return (
    <section className="stack stack-lg">
      <nav aria-label="Breadcrumb" className="field-hint">
        Today / Add reading
      </nav>
      <h1>Add reading</h1>

      {typesFailed && (
        <div className="alert alert-danger cluster">
          <span>We couldn't load the reading types. Check your connection and try again.</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadTypes}>
            Try again
          </button>
        </div>
      )}

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-type`}>Type</label>
          {types ? (
            <select
              id={`${uid}-type`}
              className="select"
              value={typeId}
              onChange={(e) => chooseType(e.target.value)}
            >
              <option value="">Choose type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="skeleton" aria-busy="true" />
          )}
        </div>

        {fields.map((f) => {
          const message = fieldMessage(f)
          const id = `${uid}-${f.key}`
          return (
            <div className="field" key={f.key}>
              <label htmlFor={id}>{f.label}</label>
              <div className="cluster">
                <input
                  id={id}
                  className={`input${message ? ' is-invalid' : ''}`}
                  inputMode="decimal"
                  placeholder="Enter value"
                  disabled={!type}
                  value={raw[f.key] ?? ''}
                  aria-invalid={message ? true : undefined}
                  aria-describedby={`${id}-unit${message ? ` ${id}-error` : ''}`}
                  onChange={(e) => changeValue(f.key, e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                />
                <span id={`${id}-unit`} className="field-hint">
                  {type ? f.unit : ''}
                </span>
              </div>
              {message && (
                <span id={`${id}-error`} className="field-error" role="alert">
                  {message}
                </span>
              )}
            </div>
          )
        })}

        <div className="field">
          <label htmlFor={`${uid}-date`}>Date</label>
          <input
            id={`${uid}-date`}
            className={`input${dateInvalid ? ' is-invalid' : ''}`}
            type="date"
            max={today}
            value={date}
            aria-invalid={dateInvalid ? true : undefined}
            onChange={(e) => setDate(e.target.value)}
          />
          {dateInvalid && <span className="field-error">Choose today or an earlier date.</span>}
        </div>

        <div className="field">
          <label htmlFor={`${uid}-note`}>Note</label>
          <input
            id={`${uid}-note`}
            className="input"
            placeholder="Optional"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {formError && <p className="field-error" role="alert">{formError}</p>}

        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid || saving}>
            {saving && <span className="spinner" aria-hidden="true" />}
            Save reading
          </button>
        </div>
      </form>
    </section>
  )
}
