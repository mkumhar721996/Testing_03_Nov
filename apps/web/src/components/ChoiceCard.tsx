import type { ReactNode } from 'react'

/** Layout for a group of choice cards: as many columns as fit, never narrower than the minimum column. */
export const CHOICE_GRID =
  'grid grid-cols-[repeat(auto-fit,minmax(var(--grid-min-column),1fr))] gap-[var(--space-2)]'

interface ChoiceCardProps {
  /** Radio group name; cards sharing it form one choice. */
  name: string
  label: string
  description?: string
  /** Status shown under the text, for example an availability badge. */
  badge?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

/** A radio choice drawn as a card with a tick; the whole card is the click target. */
export function ChoiceCard({ name, label, description, badge, checked, disabled, onChange }: ChoiceCardProps) {
  return (
    <label
      className={[
        'relative flex min-h-[var(--control-height-lg)] items-start gap-[var(--space-2)] overflow-hidden break-words',
        'rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[color:var(--color-border-strong)]',
        'px-[var(--space-3)] py-[var(--space-2)] bg-[var(--color-info-bg)] cursor-pointer',
        'hover:border-[color:var(--color-primary)]',
        'has-checked:border-[color:var(--color-primary)] has-checked:bg-[var(--color-bg)]',
        'has-checked:shadow-[0_0_0_var(--border-width)_var(--color-primary)]',
        'has-disabled:cursor-not-allowed has-disabled:bg-[var(--color-bg-muted)] has-disabled:opacity-[var(--opacity-disabled)]',
        'has-disabled:hover:border-[color:var(--color-border-strong)]',
        'has-focus-visible:outline has-focus-visible:outline-[length:var(--focus-ring-width)]',
        'has-focus-visible:outline-offset-[var(--focus-ring-width)] has-focus-visible:outline-[color:var(--color-focus)]',
      ].join(' ')}
    >
      <input
        type="radio"
        className="peer absolute inset-0 m-0 h-full w-full cursor-[inherit] opacity-0"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        aria-hidden="true"
        className="mt-[var(--space-1)] inline-flex h-[var(--icon-size)] w-[var(--icon-size)] flex-none items-center justify-center rounded-[var(--radius-full)] border-[length:var(--border-width)] border-[color:var(--color-border-strong)] text-transparent peer-checked:border-[color:var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:text-[color:var(--color-on-primary)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[var(--space-3)] w-[var(--space-3)] fill-none stroke-current stroke-[3]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-[var(--font-weight-medium)]">{label}</span>
        {description && <span className="text-[var(--color-fg-muted)]">{description}</span>}
        {badge && <span className="mt-[var(--space-1)] self-start">{badge}</span>}
      </span>
    </label>
  )
}
