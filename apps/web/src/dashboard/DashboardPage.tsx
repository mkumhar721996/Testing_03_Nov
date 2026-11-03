import { fetchAppointments, type Appointment } from './appointments'
import { button, icon } from './buttonStyles'
import { PatientSummaryCard } from './PatientSummaryCard'
import { fetchPatientSummary, type PatientSummary } from './patientSummary'
import { UpcomingAppointments } from './UpcomingAppointments'
import { useAppointments } from './useAppointments'
import { TodayStatsTiles } from './stats/TodayStatsTiles'
import { useTodayStats, type StatsFetcher } from './stats/useTodayStats'
import { usePatientSummary } from './usePatientSummary'

export function DashboardPage({
  onAddReading,
  onBookAppointment,
  fetcher = fetchPatientSummary,
  appointmentsFetcher = fetchAppointments,
  now,
  statsFetcher,
}: {
  onAddReading: () => void
  onBookAppointment: () => void
  fetcher?: (signal?: AbortSignal) => Promise<PatientSummary>
  appointmentsFetcher?: (signal?: AbortSignal) => Promise<Appointment[]>
  now?: () => Date
  statsFetcher?: StatsFetcher
}) {
  const { state, retry } = usePatientSummary(fetcher)
  const appointments = useAppointments(appointmentsFetcher, now)
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
      <UpcomingAppointments state={appointments.state} onRetry={appointments.retry} onBookAppointment={onBookAppointment} />
    </div>
  )
}
