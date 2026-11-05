import type { ReactNode } from 'react'

export type AlertVariant = 'danger' | 'warning' | 'success'

const variants: Record<AlertVariant, string> = {
  danger: 'border-[var(--color-danger)] bg-[var(--color-danger-bg)]',
  warning: 'border-[var(--color-warning)] bg-[var(--color-warning-bg)]',
  success: 'border-[var(--color-success)] bg-[var(--color-success-bg)]',
}

/** Page-level message. Danger and warning interrupt (role="alert"); success is polite (role="status"). */
export function Alert({ variant, children }: { variant: AlertVariant; children: ReactNode }) {
  return (
    <div
      role={variant === 'success' ? 'status' : 'alert'}
      className={`flex flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] border-[length:var(--border-width)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-fg)] [overflow-wrap:anywhere] ${variants[variant]}`}
    >
      {children}
    </div>
  )
}
