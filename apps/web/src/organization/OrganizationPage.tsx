import type { ReactNode } from 'react'
import { fetchOrganization, type Organization } from './organizationApi'
import { useOrganization } from './useOrganization'

const wrap = '[overflow-wrap:anywhere] min-w-0'
const label = 'text-[length:var(--font-size-md)] text-[var(--color-fg-muted)]'
const inlineRow = 'flex flex-wrap items-baseline gap-x-[var(--space-3)] gap-y-[var(--space-1)]'
const iconClass =
  'h-[var(--icon-size)] w-[var(--icon-size)] flex-none fill-none stroke-current [stroke-linecap:round] [stroke-width:2]'
const actionClass =
  'min-w-[44px]! gap-[var(--space-2)]! px-[var(--space-4)]! text-[length:var(--font-size-lg)]! min-h-[var(--control-height-lg)]!'

// The prototype's phone link is E.164; a bare 10-digit number is read as a +1 number.
function telHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `tel:${phone.trim().startsWith('+') ? '+' : digits.length === 10 ? '+1' : ''}${digits}`
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
      <span className={label}>{title}</span>
      {children}
    </div>
  )
}

function Absent({ what }: { what: 'email' | 'phone' }) {
  return (
    <span role="img" aria-label={`No finance contact ${what}`}>
      —
    </span>
  )
}

function ContactBlock({ contact }: { contact: Organization['financeContact'] }) {
  const link = 'text-[var(--color-info)] ' + wrap
  return (
    <div className="rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-info-bg)] p-[var(--space-3)] text-[var(--color-info)]">
      <span className={wrap}>{contact.role}</span>
      <h3 className={`my-[var(--space-1)] text-[length:var(--font-size-xl)] ${wrap}`}>
        {contact.name}
      </h3>
      <div className={inlineRow}>
        {contact.email ? (
          <a className={link} href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        ) : (
          <Absent what="email" />
        )}
        <span aria-hidden="true">·</span>
        {contact.phone ? (
          <a className={link} href={telHref(contact.phone)}>
            {contact.phone}
          </a>
        ) : (
          <Absent what="phone" />
        )}
      </div>
    </div>
  )
}

function Skeleton({ width, tall }: { width?: string; tall?: boolean }) {
  return (
    <span
      className={`skeleton ${tall ? 'min-h-[var(--space-4)]' : ''}`}
      style={width ? { width } : undefined}
    />
  )
}

function Loading() {
  const rows: [string, string, boolean?][] = [
    ['20%', '70%', true],
    ['15%', '55%'],
    ['12%', '45%'],
    ['18%', '40%'],
  ]
  return (
    <div role="status" aria-label="Loading organization details" className="flex flex-col gap-[var(--space-3)]">
      {rows.map(([a, b, tall]) => (
        <div key={a} className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <Skeleton width={a} />
          <Skeleton width={b} tall={tall} />
        </div>
      ))}
      <span className="skeleton min-h-[var(--space-6)]" />
    </div>
  )
}

function Details({ organization }: { organization: Organization }) {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <FieldGroup title="Organization">
        <h2 className={`text-[length:var(--font-size-xl)] ${wrap}`}>{organization.name}</h2>
      </FieldGroup>
      <FieldGroup title="Address">
        <span className={wrap}>{organization.address}</span>
      </FieldGroup>
      <FieldGroup title="Admin">
        <div className={inlineRow}>
          <span className={`text-[var(--color-primary)] ${wrap}`}>{organization.admin.name}</span>
          <span className={wrap}>{organization.admin.email}</span>
        </div>
      </FieldGroup>
      <FieldGroup title="Created by">
        <span className={`text-[var(--color-primary)] ${wrap}`}>{organization.createdBy}</span>
      </FieldGroup>
      <ContactBlock contact={organization.financeContact} />
      <div className="flex flex-wrap gap-[var(--space-3)]">
        <button
          type="button"
          className={`btn btn-primary ${actionClass} border-[var(--button-edit-border)]! bg-[var(--button-edit-background)]! text-[var(--button-edit-foreground)]! hover:bg-[var(--button-edit-background-hover)]!`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClass}>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Edit
        </button>
        <button
          type="button"
          className={`btn btn-secondary ${actionClass} border-[var(--button-delete-border)]! bg-[var(--button-delete-background)]! text-[var(--button-delete-foreground)]! hover:bg-[var(--button-delete-background-hover)]!`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClass}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  )
}

export function OrganizationPage({
  organizationId,
  fetcher = fetchOrganization,
}: {
  organizationId: string
  fetcher?: (id: string, signal?: AbortSignal) => Promise<Organization>
}) {
  const { state, retry } = useOrganization(organizationId, fetcher)
  return (
    <main className="p-[var(--space-3)] text-[var(--color-fg)]">
      <h1 className="mb-[var(--space-2)] text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">
        Organization
      </h1>
      <p className="mb-[var(--space-2)] text-[length:var(--font-size-md)] text-[var(--color-fg-muted)]">
        UI REFERENCE — VIEW PANEL WITH FC SECTION
      </p>
      <div className="rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-panel-bg)] p-[var(--space-2)] sm:p-[var(--space-4)]">
        <div className="card p-[var(--space-3)]! sm:p-[var(--space-4)]! rounded-[var(--radius-lg)] text-[length:var(--font-size-md)] sm:text-[length:var(--font-size-lg)]">
          {state.status === 'loading' && <Loading />}
          {state.status === 'error' && (
            <div className="flex flex-col gap-[var(--space-3)]">
              <div className="alert alert-danger" role="alert">
                <strong>We couldn’t load this organization.</strong>
                <div>The details didn’t come back from the server. Check your connection and try again.</div>
              </div>
              <div>
                <button type="button" className="btn btn-secondary" onClick={retry}>
                  Try again
                </button>
              </div>
            </div>
          )}
          {state.status === 'loaded' && <Details organization={state.organization} />}
        </div>
      </div>
    </main>
  )
}
