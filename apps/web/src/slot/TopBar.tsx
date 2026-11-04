function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col leading-[1.2]">
      <span className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export function TopBar({ gameName, balance, lastWin }: { gameName: string; balance: number; lastWin: number }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-[var(--space-4)] gap-y-[var(--space-2)] border-b border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-2)]">
      <strong className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] [overflow-wrap:anywhere]">
        {gameName}
      </strong>
      <div className="flex gap-[var(--space-4)]">
        <Figure label="Balance" value={balance} />
        <Figure label="Last win" value={lastWin} />
      </div>
    </header>
  )
}
