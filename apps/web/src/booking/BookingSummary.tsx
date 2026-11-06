import type { VisitFee } from './bookingApi'

export const formatMoney = ({ amount, currency }: VisitFee) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)

interface BookingSummaryProps {
  service?: string
  address?: string
  slot?: string
  /** Shown once a service is chosen. */
  fee: VisitFee | null
  /** Names of the steps still to do, in order. */
  missing: string[]
  canConfirm: boolean
  submitting: boolean
  onConfirm: () => void
}

/** The booking so far, the fixed visit fee and the one confirm action. */
export function BookingSummary({
  service,
  address,
  slot,
  fee,
  missing,
  canConfirm,
  submitting,
  onConfirm,
}: BookingSummaryProps) {
  const rows: [string, string | undefined][] = [
    ['Service', service],
    ['Address', address],
    ['Slot', slot],
  ]
  return (
    <aside
      aria-labelledby="summary-heading"
      className="card flex max-w-[calc(var(--grid-min-column)*1.5)] min-w-[var(--grid-min-column)] flex-[1_1_var(--grid-min-column)] flex-col gap-[var(--space-3)] bg-[var(--color-info-bg)]! sticky top-[var(--space-3)]"
    >
      <h2 id="summary-heading" className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">
        Your booking
      </h2>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-[var(--space-3)] gap-y-[var(--space-2)]">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-[var(--color-fg-muted)]">{term}</dt>
            <dd className="m-0">{value ?? 'Not chosen yet'}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between gap-[var(--space-2)] border-t-[length:var(--border-width)] border-[color:var(--color-border)] pt-[var(--space-3)] font-[var(--font-weight-bold)]">
        <span>Fixed visit fee</span>
        <strong className="text-[length:var(--font-size-lg)] tabular-nums">
          {service && fee ? formatMoney(fee) : 'Shown once you choose a service'}
        </strong>
      </div>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={!canConfirm}
        aria-describedby="confirm-hint"
        onClick={onConfirm}
      >
        {submitting ? 'Confirming' : 'Confirm booking'}
      </button>
      <p id="confirm-hint" role="status" className="m-0 text-[var(--color-fg-muted)]">
        {missing.length
          ? `Still to choose: ${missing.join(', ')}.`
          : 'Ready to confirm. Your booking is confirmed straight away.'}
      </p>
    </aside>
  )
}
