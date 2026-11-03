import type { SummaryState } from './usePatientSummary'

const present = (value?: string | null) => (value?.trim() ? value.trim() : undefined)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

const skeleton =
  'block min-h-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] animate-pulse motion-reduce:animate-none'

function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex w-full items-center gap-[var(--space-3)]">
      <span
        className={`${skeleton} h-[calc(var(--avatar-size)*1.5)] w-[calc(var(--avatar-size)*1.5)] flex-none rounded-[var(--radius-full)]`}
      />
      <div className="flex flex-1 flex-col gap-[var(--space-2)]">
        <span className={`${skeleton} w-[60%]`} />
        <span className={`${skeleton} w-[80%]`} />
        <span className={`${skeleton} w-[40%]`} />
      </div>
      <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">Loading your details</span>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full flex-wrap items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-fg)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[var(--icon-size)] w-[var(--icon-size)] flex-none fill-none stroke-[var(--color-danger)] [stroke-linecap:round] [stroke-width:2]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <p className="min-w-[12rem] flex-1">We couldn't load your details. Check your connection and try again.</p>
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

function Loaded({ summary }: { summary: { name?: string | null; consultancy?: string | null; condition?: string | null } }) {
  const name = present(summary.name)
  const consultancy = present(summary.consultancy)
  const condition = present(summary.condition)
  const label = 'min-w-[6.5rem] text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]'
  return (
    <div className="flex min-h-[calc(var(--control-height-lg)*2)] items-center gap-[var(--space-3)]">
      {name && (
        <span
          data-testid="avatar"
          aria-hidden="true"
          className="inline-flex h-[calc(var(--avatar-size)*1.5)] w-[calc(var(--avatar-size)*1.5)] flex-none items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-info-bg)] text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--color-info)]"
        >
          {initials(name)}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)] [&>*]:[overflow-wrap:anywhere]">
        {name && <p className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">{name}</p>}
        {consultancy && (
          <p className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span className={label}>Consultancy</span>
            <span>{consultancy}</span>
          </p>
        )}
        {condition && (
          <p className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span className={label}>Condition</span>
            <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-bg-muted)] px-[var(--space-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-fg)]">
              {condition}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

export function PatientSummaryCard({ state, onRetry }: { state: SummaryState; onRetry: () => void }) {
  return (
    <section
      aria-labelledby="summary-heading"
      aria-busy={state.status === 'loading'}
      className="rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)] text-[var(--card-default-foreground)]"
    >
      <h2
        id="summary-heading"
        className="mb-[var(--space-1)] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]"
      >
        Patient summary
      </h2>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorBox onRetry={onRetry} />}
      {state.status === 'loaded' && <Loaded summary={state.summary} />}
    </section>
  )
}
