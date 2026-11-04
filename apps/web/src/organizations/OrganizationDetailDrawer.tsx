import { useEffect, useRef } from 'react'
import type { Organization } from './organizationApi'
import { displayValue, formatCreated } from './organizationDisplay'

interface Props {
  organization: Organization
  onClose: () => void
}

type Field = { label: string; value: string | null | undefined }

function Section({ id, title, fields }: { id: string; title: string; fields: Field[] }) {
  return (
    <section aria-labelledby={id} className="mb-[var(--space-4)]">
      <h3 id={id} className="mb-[var(--space-2)] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]">
        {title}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        {fields.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{f.label}</dt>
            {f.value?.trim() ? (
              <dd className="text-[length:var(--font-size-md)]">{f.value}</dd>
            ) : (
              <dd aria-label="No value" className="text-[length:var(--font-size-md)] text-[var(--color-fg-muted)]">
                {displayValue(f.value)}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}

export function OrganizationDetailDrawer({ organization: o, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Tab') {
      // The panel is modal: keep Tab and Shift+Tab inside it.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === headingRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <>
      <div
        data-backdrop
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--color-backdrop)] opacity-[var(--opacity-backdrop)]"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-detail-title"
        onKeyDown={onKeyDown}
        className="fixed inset-y-0 right-0 z-[var(--z-overlay)] w-[var(--drawer-width)] max-w-full overflow-y-auto bg-[var(--color-bg)] p-[var(--space-3)] text-[var(--color-fg)]"
      >
        <div className="mb-[var(--space-3)] flex items-start justify-between gap-[var(--space-2)]">
          <div>
            <h2
              id="organization-detail-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] focus:outline-none"
            >
              Organization details
            </h2>
            <p className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{o.name}</p>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="inline-flex h-[var(--control-height-md)] min-w-[var(--control-height-md)] items-center justify-center rounded-[var(--radius-md)] bg-[var(--button-ghost-background)] text-[var(--button-ghost-foreground)] hover:bg-[var(--button-ghost-background-hover)] focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--color-focus)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-[var(--icon-size)] w-[var(--icon-size)]"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <Section
          id="org-section-organization"
          title="Organization"
          fields={[
            { label: 'Name', value: o.name },
            { label: 'Type', value: o.type },
            { label: 'Reference', value: o.reference },
            { label: 'Phone', value: o.phone },
          ]}
        />
        <Section
          id="org-section-address"
          title="Address"
          fields={[
            { label: 'Street', value: o.street },
            { label: 'Address line 2', value: o.street2 },
            { label: 'City', value: o.city },
            { label: 'State', value: o.state },
            { label: 'Postal code', value: o.postalCode },
          ]}
        />
        <Section
          id="org-section-admin"
          title="Admin"
          fields={[
            { label: 'Name', value: o.adminName },
            { label: 'Email', value: o.adminEmail },
            { label: 'Phone', value: o.adminPhone },
          ]}
        />
        <Section
          id="org-section-created-by"
          title="Created by"
          fields={[
            { label: 'Name', value: o.createdByName },
            { label: 'Role', value: o.createdByRole },
            { label: 'Created on', value: formatCreated(o.createdAt) },
          ]}
        />
      </aside>
    </>
  )
}
