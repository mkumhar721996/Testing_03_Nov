export function WinBanner({ amount, summary }: { amount: number; summary: string }) {
  return (
    <div
      role="status"
      className="alert alert-success items-center text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]"
    >
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
      </svg>
      <p>
        You won {amount.toFixed(2)} {summary}
      </p>
    </div>
  )
}
