import type { ReactNode } from 'react'

interface ChoiceCardProps {
  /** Radio group name; cards sharing it form one choice. */
  name: string
  label: string
  description?: string
  /** Status shown at the end of the card, for example an availability badge. */
  badge?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

/** A radio choice drawn as a card; the whole card is the click target. */
export function ChoiceCard({ name, label, description, badge, checked, disabled, onChange }: ChoiceCardProps) {
  const tone = checked
    ? 'border-[var(--color-primary)] bg-[var(--color-info-bg)]'
    : 'border-[var(--color-border-strong)] bg-[var(--color-bg)]'
  return (
    <label
      className={`flex min-h-[var(--control-height-lg)] items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border-[length:var(--border-width)] p-[var(--space-3)] focus-within:outline focus-within:outline-[length:var(--focus-ring-width)] focus-within:outline-[color:var(--color-focus)] ${tone} ${
        disabled ? 'opacity-[var(--opacity-disabled)]' : 'cursor-pointer'
      }`}
    >
      <input
        type="radio"
        className="sr-only"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="flex flex-col">
        <span className="font-[var(--font-weight-medium)]">{label}</span>
        {description && <span className="text-[var(--color-fg-muted)]">{description}</span>}
      </span>
      {badge}
    </label>
  )
}
