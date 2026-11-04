import { useEffect, useRef } from 'react'
import { displayValue } from './organizationDisplay'
import type { Organization } from './organizationApi'

interface Props {
  organization: Organization
  onClose: () => void
}

type Field = { label: string; value: string | null }

function Section({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <section className="mb-[var(--space-4)]">
      <h3 className="mb-[var(--space-2)] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)]">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        {fields.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">{f.label}</dt>
            <dd className="text-[length:var(--font-size-md)]">{displayValue(f.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function OrganizationDetailDrawer({ organization: o, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => dialogRef.current?.focus(), [])

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--color-backdrop)] opacity-[var(--opacity-backdrop)]" />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-detail-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        className="fixed inset-y-0 right-0 z-[var(--z-overlay)] w-[var(--drawer-width)] max-w-full overflow-y-auto bg-[var(--color-bg)] p-[var(--space-3)] text-[var(--color-fg)] focus:outline-none"
      >
        <div className="mb-[var(--space-3)] flex items-center justify-between">
          <h2 id="organization-detail-title" className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">
            {o.name}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-[var(--control-height-md)] min-w-[var(--control-height-md)] rounded-[var(--radius-md)] bg-[var(--button-ghost-background)] text-[var(--button-ghost-foreground)] hover:bg-[var(--button-ghost-background-hover)]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <Section title="Organization" fields={[{ label: 'Name', value: o.name }, { label: 'Type', value: o.type }]} />
        <Section
          title="Address"
          fields={[
            { label: 'Street', value: o.street },
            { label: 'City', value: o.city },
            { label: 'Region', value: o.region },
            { label: 'Postal code', value: o.postalCode },
            { label: 'Country', value: o.country },
          ]}
        />
        <Section
          title="Admin"
          fields={[
            { label: 'Name', value: o.adminName },
            { label: 'Email', value: o.adminEmail },
            { label: 'Phone', value: o.adminPhone },
          ]}
        />
        <Section
          title="Created By"
          fields={[
            { label: 'Name', value: o.createdByName },
            { label: 'Created on', value: o.createdAt ? o.createdAt.slice(0, 10) : null },
          ]}
        />
      </aside>
    </>
  )
}
