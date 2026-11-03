import type { Reading, ReadingType } from './todayStats'
import { tileModel } from './todayStats'

const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

export function StatTile({
  type,
  latest,
  onAddReading,
}: {
  type: ReadingType
  latest: Reading | undefined
  onAddReading: () => void
}) {
  const { label, display, unit, empty, flagged } = tileModel(type, latest)
  const headingId = `stat-${type}-label`
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-[var(--space-2)] rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)] text-[var(--card-default-foreground)]"
    >
      <h3 id={headingId} className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
        {label}
      </h3>
      <p className="flex items-baseline gap-[var(--space-2)]">
        <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">{display}</span>
        {!empty && <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{unit}</span>}
      </p>
      {flagged && (
        <p className="inline-flex w-fit items-center gap-[var(--space-1)] rounded-[var(--radius-full)] bg-[var(--color-danger-bg)] px-[var(--space-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-danger)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[var(--icon-size)] w-[var(--icon-size)] flex-none fill-none stroke-current [stroke-linecap:round] [stroke-width:2]"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          Out of range
        </p>
      )}
      {empty && (
        <button
          type="button"
          onClick={onAddReading}
          className={`inline-flex min-h-[var(--control-height-md)] w-fit items-center justify-center rounded-[var(--button-default-radius)] border-[length:var(--border-width)] border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] px-[var(--space-3)] font-[var(--font-weight-medium)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)] ${focusRing}`}
        >
          Log a reading
        </button>
      )}
    </section>
  )
}
