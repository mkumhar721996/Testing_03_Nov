import type { ReactNode } from 'react'

export function AuthPanel({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--space-3)] rounded-[var(--card-default-radius)] border border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--space-4)] text-[var(--card-default-foreground)]">
      {children}
    </section>
  )
}
