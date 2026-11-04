import { useEffect, useRef, useState } from 'react'

export type RowAction = { id: 'view-details'; label: string }

const ACTIONS: RowAction[] = [{ id: 'view-details', label: 'View details' }]

interface Props {
  organizationName: string
  onAction: (actionId: RowAction['id'], trigger: HTMLButtonElement) => void
}

export function OrganizationRowMenu({ organizationName, onAction }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      const i = items.indexOf(document.activeElement as HTMLElement)
      const step = e.key === 'ArrowDown' ? 1 : -1
      items[(i + step + items.length) % items.length]?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${organizationName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[var(--control-height-md)] min-w-[var(--control-height-md)] items-center justify-center rounded-[var(--radius-md)] bg-[var(--button-ghost-background)] text-[var(--button-ghost-foreground)] hover:bg-[var(--button-ghost-background-hover)] focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-[var(--icon-size)] w-[var(--icon-size)]"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[var(--z-popup)] min-w-[var(--menu-min-width)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-1)]"
        >
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onAction(action.id, triggerRef.current as HTMLButtonElement)
              }}
              className="block w-full rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-2)] text-left text-[length:var(--font-size-md)] text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
