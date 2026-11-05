import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-warning-bg)] px-[var(--space-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-warning)]">
      {children}
    </span>
  )
}
