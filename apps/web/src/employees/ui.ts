// Tailwind-over-token equivalents of the prototype's .card, .btn-* and .skeleton classes.
const focusRing =
  'focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]'

const button =
  'inline-flex min-h-[var(--control-height-md)] items-center justify-center gap-[var(--space-2)] rounded-[var(--button-default-radius)] border-[length:var(--border-width)] px-[var(--space-3)] font-[var(--font-weight-medium)] disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)]'

export const primaryButton = `${button} border-[var(--button-primary-border)] bg-[var(--button-primary-background)] text-[var(--button-primary-foreground)] enabled:hover:bg-[var(--button-primary-background-hover)] ${focusRing}`

export const secondaryButton = `${button} border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] text-[var(--button-secondary-foreground)] enabled:hover:bg-[var(--button-secondary-background-hover)] ${focusRing}`

export const card =
  'rounded-[var(--card-default-radius)] border-[length:var(--border-width)] border-[var(--card-default-border)] bg-[var(--card-default-background)] p-[var(--card-default-padding)] text-[var(--card-default-foreground)]'

export const cardTitle = 'mb-[var(--space-3)] text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]'

export const skeleton =
  'block min-h-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] animate-pulse motion-reduce:animate-none'

export const spinner =
  'inline-block h-[var(--spinner-size)] w-[var(--spinner-size)] rounded-full border-[length:var(--focus-ring-width)] border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin motion-reduce:animate-none'

/** The light-blue page panel the prototype wraps each screen in. */
export const page =
  'rounded-[var(--radius-lg)] bg-[var(--color-info-bg)] p-[var(--space-3)] text-[var(--color-fg)] md:p-[var(--space-4)] mx-auto w-full max-w-[var(--content-max-width)]'

export const statusLabel = (status: string) => (status === 'pending_start' ? 'Pending start' : status)
