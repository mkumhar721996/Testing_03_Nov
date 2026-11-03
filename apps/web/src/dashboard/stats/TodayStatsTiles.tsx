import { StatTile } from './StatTile'
import { latestPerType, READING_TYPES } from './todayStats'
import type { StatsState } from './useTodayStats'

const grid = 'grid gap-[var(--space-3)] [grid-template-columns:repeat(auto-fit,minmax(var(--grid-min-column),1fr))]'

const skeleton =
  'block min-h-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] animate-pulse motion-reduce:animate-none'

const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

function Loading() {
  return (
    <div role="status" aria-live="polite" className={grid}>
      {READING_TYPES.map((type) => (
        <div
          key={type}
          className="flex flex-col gap-[var(--space-2)] rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)]"
        >
          <span className={`${skeleton} w-[40%]`} />
          <span className={`${skeleton} w-[60%]`} />
        </div>
      ))}
      <span className="sr-only">Loading today's stats</span>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full flex-wrap items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-fg)]"
    >
      <p className="min-w-[12rem] flex-1">We couldn't load today's stats. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex min-h-[var(--control-height-md)] items-center justify-center rounded-[var(--button-default-radius)] border-[length:var(--border-width)] border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] px-[var(--space-3)] font-[var(--font-weight-medium)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)] ${focusRing}`}
      >
        Retry
      </button>
    </div>
  )
}

export function TodayStatsTiles({
  state,
  onRetry,
  onAddReading,
  now = () => new Date(),
}: {
  state: StatsState
  onRetry: () => void
  onAddReading: () => void
  now?: () => Date
}) {
  const latest = state.status === 'loaded' ? latestPerType(state.readings, now()) : undefined
  return (
    // a plain div, not a landmark: only the five tiles are regions
    <div aria-busy={state.status === 'loading'} className="flex flex-col gap-[var(--space-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]">Today's stats</h2>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorBox onRetry={onRetry} />}
      {latest && (
        <div className={grid}>
          {READING_TYPES.map((type) => (
            <StatTile key={type} type={type} latest={latest[type]} onAddReading={onAddReading} />
          ))}
        </div>
      )}
    </div>
  )
}
