export type SessionBadge = 'new' | 'resumed' | 'used-up' | 'topped-up'

const BADGES: Record<SessionBadge, { label: string; className: string }> = {
  new: { label: 'New guest session', className: 'badge badge-success' },
  resumed: { label: 'Resumed guest session', className: 'badge badge-success' },
  'used-up': { label: 'Balance used up', className: 'badge badge-warning' },
  'topped-up': { label: 'Top-up claimed', className: 'badge' },
}

interface BalanceDisplayProps {
  balance: number
  badge: SessionBadge
}

// Thin stand-in: the real balance display belongs to Game Client & Controls.
export default function BalanceDisplay({ balance, badge }: BalanceDisplayProps) {
  const { label, className } = BADGES[badge]
  return (
    <div className="flex flex-wrap items-center justify-between gap-s3 rounded-ds-md border border-ds-border bg-ds-bg-muted px-s3 py-s2">
      <div>
        <div className="text-ds-sm text-ds-fg-muted">Balance</div>
        <div
          aria-live="polite"
          className={`text-ds-xl font-semibold tabular-nums ${balance < 1 ? 'text-ds-danger' : ''}`}
        >
          {balance.toLocaleString('en-US')}
        </div>
      </div>
      <span className={className}>{label}</span>
    </div>
  )
}
