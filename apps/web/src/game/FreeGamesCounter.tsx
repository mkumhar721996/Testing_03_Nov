export function FreeGamesCounter({ remaining, unchanged = false }: { remaining: number; unchanged?: boolean }) {
  return (
    <div className="card flex flex-col gap-[var(--space-1)]">
      <span className="text-muted">Free games</span>
      <strong
        aria-label={`${remaining} free games`}
        className="text-[length:var(--font-size-xl)] leading-tight font-[var(--font-weight-bold)]"
      >
        {remaining}
      </strong>
      <span className={unchanged ? 'badge' : 'badge badge-success'}>
        {unchanged ? 'Unchanged by this spin' : 'Saved on server'}
      </span>
    </div>
  )
}
