import { PatientSummaryCard } from './PatientSummaryCard'
import { fetchPatientSummary, type PatientSummary } from './patientSummary'
import { TodayStatsTiles } from './stats/TodayStatsTiles'
import { useTodayStats, type StatsFetcher } from './stats/useTodayStats'
import { usePatientSummary } from './usePatientSummary'

const button =
  'inline-flex min-h-[var(--control-height-md)] items-center justify-center gap-[var(--space-2)] rounded-[var(--button-default-radius)] border-[length:var(--border-width)] px-[var(--space-3)] font-[var(--font-weight-medium)] focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

const icon = 'h-[var(--icon-size)] w-[var(--icon-size)] flex-none fill-none stroke-current [stroke-linecap:round] [stroke-width:2]'

export function DashboardPage({
  onAddReading,
  onBookAppointment,
  fetcher = fetchPatientSummary,
  statsFetcher,
}: {
  onAddReading: () => void
  onBookAppointment: () => void
  fetcher?: (signal?: AbortSignal) => Promise<PatientSummary>
  statsFetcher?: StatsFetcher
}) {
  const { state, retry } = usePatientSummary(fetcher)
  const stats = useTodayStats(statsFetcher)
  return (
    <div className="mx-auto flex w-full max-w-[var(--content-max-width)] flex-col gap-[var(--space-3)] bg-[var(--color-bg)] p-[var(--space-3)] text-[var(--color-fg)]">
      <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Today</h1>
      <PatientSummaryCard state={state} onRetry={retry} />
      <TodayStatsTiles state={stats.state} onRetry={stats.retry} onAddReading={onAddReading} />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddReading}
          className={`${button} border-[var(--button-primary-border)] bg-[var(--button-primary-background)] text-[var(--button-primary-foreground)] hover:bg-[var(--button-primary-background-hover)]`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={icon}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add reading
        </button>
      </div>
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
    </div>
  )
}
