import { CHOICE_GRID, ChoiceCard } from '../components/ChoiceCard'
import type { HomeVisitSlots } from './bookingApi'

interface SlotPickerProps {
  days: string[]
  day: string
  slots: HomeVisitSlots | null
  loading: boolean
  slot: string | null
  /** False until a service and an address are chosen. */
  enabled: boolean
  onDay: (day: string) => void
  onSlot: (window: string) => void
}

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

const placeName = (timeZone: string) => (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ')

/** Day select plus the day's slots; times are shown in the time zone of the chosen address. */
export function SlotPicker({ days, day, slots, loading, slot, enabled, onDay, onSlot }: SlotPickerProps) {
  const allFull = slots !== null && slots.slots.every((s) => !s.bookable)
  return (
    <fieldset disabled={!enabled} className="flex flex-col gap-[var(--space-3)]">
      <legend className="font-[var(--font-weight-bold)]">4. Time slot</legend>
      {!enabled && (
        <p className="text-[var(--color-fg-muted)]">Choose a service and an address to see available slots.</p>
      )}
      {enabled && (
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <div className="field">
            <label htmlFor="visit-day">Day</label>
            <select id="visit-day" className="input" value={day} onChange={(e) => onDay(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
          </div>
          {slots && (
            <span className="text-[var(--color-fg-muted)]">
              Times shown in {placeName(slots.timeZone)} time ({slots.zoneLabel})
            </span>
          )}
        </div>
      )}
      {enabled && loading && (
        <div aria-busy="true" className="stack">
          <span role="status" className="text-[var(--color-fg-muted)]">
            Loading slots
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton" />
          ))}
        </div>
      )}
      {enabled && !loading && slots && (
        <>
          {allFull && (
            <p role="status" className="text-[var(--color-fg-muted)]">
              Every slot on this day is full. Choose another day.
            </p>
          )}
          <div className={CHOICE_GRID}>
            {slots.slots.map((s) => (
              <ChoiceCard
                key={s.window}
                name="slot"
                label={`${s.window} ${slots.zoneLabel}`}
                checked={slot === s.window}
                disabled={!s.bookable}
                onChange={() => onSlot(s.window)}
                badge={
                  s.bookable ? (
                    <span className="badge badge-success">Open</span>
                  ) : (
                    <span className="badge badge-danger">Full, unavailable</span>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </fieldset>
  )
}
