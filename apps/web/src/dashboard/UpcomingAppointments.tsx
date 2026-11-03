import { appointmentHref, type Appointment } from './appointments'
import { button, icon } from './buttonStyles'
import type { AppointmentsState } from './useAppointments'

const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

const link = `text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)] ${focusRing}`

const skeleton =
  'block min-h-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] animate-pulse motion-reduce:animate-none'

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const when = (a: Appointment) => formatter.format(new Date(a.startsAt))

function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-[var(--space-2)]">
      <span className={`${skeleton} w-[60%]`} />
      <span className={`${skeleton} w-[80%]`} />
      <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">Loading your appointments</span>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full flex-wrap items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-fg)]"
    >
      <p className="min-w-[12rem] flex-1">We couldn't load your appointments. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className={`${button} border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)]`}
      >
        Retry
      </button>
    </div>
  )
}

function Loaded({ upcoming }: { upcoming: Appointment[] }) {
  if (upcoming.length === 0) return <p className="text-[var(--color-fg-muted)]">No upcoming appointments</p>
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <p>
        <a href={appointmentHref(upcoming[0].id)} className={`font-[var(--font-weight-medium)] ${link}`}>
          Next appointment: {when(upcoming[0])}
        </a>
      </p>
      <ul className="flex flex-col gap-[var(--space-1)]">
        {upcoming.map((a) => (
          <li key={a.id}>
            <a href={appointmentHref(a.id)} className={link}>
              {when(a)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UpcomingAppointments({
  state,
  onRetry,
  onBookAppointment,
}: {
  state: AppointmentsState
  onRetry: () => void
  onBookAppointment: () => void
}) {
  return (
    <section
      aria-labelledby="upcoming-heading"
      aria-busy={state.status === 'loading'}
      className="flex flex-col gap-[var(--space-2)] rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)] text-[var(--card-default-foreground)]"
    >
      <h2 id="upcoming-heading" className="text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]">
        Upcoming appointments
      </h2>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorBox onRetry={onRetry} />}
      {state.status === 'loaded' && <Loaded upcoming={state.upcoming} />}
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={onBookAppointment}
          className={`${button} border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)]`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={icon}>
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
          Book appointment
        </button>
      </div>
    </section>
  )
}
