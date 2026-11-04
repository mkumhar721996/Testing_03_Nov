import type { ReactNode } from 'react'

export interface ControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

/** Class for an input or select; pass `invalid` to switch the border to the danger colour. */
export const controlClass = (invalid: boolean) =>
  `min-h-[var(--control-height-md)] w-full rounded-[var(--radius-md)] border-[length:var(--border-width)] bg-[var(--color-bg)] px-[var(--space-2)] text-[var(--color-fg)] focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)] ${
    invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]'
  }`

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: (control: ControlProps) => ReactNode
}

/** A visible label, optional hint and inline error wired to the control by id. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <label htmlFor={id} className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <span id={hintId} className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-[length:var(--font-size-sm)] text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  )
}
