import type { WeightPoint } from './weightTrend'
import type { WeightTrendState } from './useWeightTrend'

const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

const button = `inline-flex min-h-[var(--control-height-md)] items-center justify-center rounded-[var(--button-default-radius)] border-[length:var(--border-width)] px-[var(--space-3)] font-[var(--font-weight-medium)] ${focusRing}`

const skeleton =
  'block min-h-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] animate-pulse motion-reduce:animate-none'

const W = 320
const H = 160
const PAD_X = 40
const PAD_Y = 20

function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-[var(--space-2)]">
      <span className={`${skeleton} h-[calc(var(--control-height-lg)*2)] w-full`} />
      <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">Loading your weight trend</span>
    </div>
  )
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full flex-wrap items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-fg)]"
    >
      <p className="min-w-[12rem] flex-1">We couldn't load your weight trend. Check your connection and try again.</p>
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

function Empty({ onAddReading }: { onAddReading: () => void }) {
  return (
    <div className="empty-state flex flex-col items-start gap-[var(--space-2)] py-[var(--space-2)]">
      <p className="text-[var(--color-fg-muted)]">
        No weight readings in the last 30 days. Add your first reading to see your trend.
      </p>
      <button
        type="button"
        onClick={onAddReading}
        className={`${button} border-[var(--button-primary-border)] bg-[var(--button-primary-background)] text-[var(--button-primary-foreground)] hover:bg-[var(--button-primary-background-hover)]`}
      >
        Add reading
      </button>
    </div>
  )
}

function Chart({ points }: { points: WeightPoint[] }) {
  const weights = points.map((p) => p.weightKg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const lo = min - span * 0.2
  const hi = max + span * 0.2
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD_X + (i * (W - PAD_X - PAD_Y)) / (points.length - 1))
  const y = (kg: number) => PAD_Y + ((hi - kg) * (H - 2 * PAD_Y)) / (hi - lo)
  const latest = points[points.length - 1]
  const label = `Weight trend: ${points.length} ${points.length === 1 ? 'reading' : 'readings'}, latest ${latest.weightKg} kg on ${latest.day}`
  return (
    <>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full text-[length:var(--font-size-sm)]"
      >
        <line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={H - PAD_Y} stroke="var(--color-border-strong)" />
        <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_Y} y2={H - PAD_Y} stroke="var(--color-border-strong)" />
        <line x1={PAD_X} y1={PAD_Y} x2={W - PAD_Y} y2={PAD_Y} stroke="var(--color-border)" />
        <text x={PAD_X - 4} y={PAD_Y} textAnchor="end" dominantBaseline="middle" fill="var(--color-fg-muted)" fontSize="10">
          {+max.toFixed(1)}
        </text>
        <text x={PAD_X - 4} y={H - PAD_Y} textAnchor="end" dominantBaseline="middle" fill="var(--color-fg-muted)" fontSize="10">
          {+min.toFixed(1)}
        </text>
        <text x={PAD_X - 4} y={H / 2} textAnchor="end" dominantBaseline="middle" fill="var(--color-fg-muted)" fontSize="10">
          kg
        </text>
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--color-fg-muted)" fontSize="10">
          Date
        </text>
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            points={points.map((p, i) => `${x(i)},${y(p.weightKg)}`).join(' ')}
          />
        )}
        {points.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.weightKg)} r="3.5" fill="var(--color-primary)" />
        ))}
      </svg>
      <table className="sr-only">
        <caption>Weight readings, last 30 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Weight (kg)</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <td>{p.day}</td>
              <td>{p.weightKg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function WeightTrendCard({
  state,
  onRetry,
  onAddReading,
}: {
  state: WeightTrendState
  onRetry: () => void
  onAddReading: () => void
}) {
  return (
    <section
      aria-labelledby="trend-heading"
      aria-busy={state.status === 'loading'}
      className="rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)] text-[var(--card-default-foreground)]"
    >
      <h2 id="trend-heading" className="mb-[var(--space-1)] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]">
        Weight trend
      </h2>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorBox onRetry={onRetry} />}
      {state.status === 'loaded' &&
        (state.points.length === 0 ? <Empty onAddReading={onAddReading} /> : <Chart points={state.points} />)}
    </section>
  )
}
