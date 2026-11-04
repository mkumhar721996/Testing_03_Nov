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

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          triggerRef.current?.focus()
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${organizationName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="h-[var(--control-height-md)] min-w-[var(--control-height-md)] rounded-[var(--radius-md)] bg-[var(--button-ghost-background)] text-[var(--button-ghost-foreground)] hover:bg-[var(--button-ghost-background-hover)] focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]"
      >
        <span aria-hidden="true">...</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${organizationName}`}
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
              className="block w-full rounded-[var(--radius-md)] px-[var(--space-2)] py-[var(--space-1)] text-left text-[length:var(--font-size-md)] text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
