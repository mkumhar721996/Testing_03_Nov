import { useRef, useState } from 'react'
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer'
import { OrganizationRowMenu } from './OrganizationRowMenu'
import type { Organization } from './organizationApi'
import { displayValue, formatCreated } from './organizationDisplay'
import { useOrganizations } from './useOrganizations'

interface Props {
  fetcher?: (signal?: AbortSignal) => Promise<Organization[]>
}

const cell = 'p-[var(--space-2)]'

export function OrganizationsPage({ fetcher }: Props) {
  const { state, retry } = useOrganizations(fetcher)
  const [selected, setSelected] = useState<Organization | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = () => {
    setSelected(null)
    triggerRef.current?.focus()
  }

  return (
    <main
      aria-label="Organizations"
      className="mx-auto max-w-[var(--content-max-width)] p-[var(--space-3)] text-[var(--color-fg)]"
    >
      <h1 className="mb-[var(--space-3)] text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">
        Organizations
      </h1>
      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading organizations" className="flex flex-col gap-[var(--space-2)]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton block min-h-[var(--space-5)] rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)]" />
          ))}
        </div>
      )}
      {state.status === 'error' && (
        <div
          role="alert"
          className="alert flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-[var(--space-3)] text-[var(--color-danger)]"
        >
          <span>Organizations could not be loaded. Check your connection and try again.</span>
          <button
            type="button"
            onClick={retry}
            className="btn-secondary h-[var(--control-height-md)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] px-[var(--space-3)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)]"
          >
            Retry
          </button>
        </div>
      )}
      {state.status === 'loaded' && state.organizations.length === 0 && (
        <div className="empty-state">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">No organizations to show</h2>
          <p className="text-[var(--color-fg-muted)]">
            Your account is not linked to an organization yet. Ask a WFC Admin to add you.
          </p>
        </div>
      )}
      {state.status === 'loaded' && state.organizations.length > 0 && (
        <div className="table-wrap overflow-x-auto">
          <table className="table w-full text-left text-[length:var(--font-size-md)]">
            <caption className="p-[var(--space-2)] text-left text-[length:var(--font-size-sm)] text-[var(--color-fg-muted)]">
              {state.organizations.length} {state.organizations.length === 1 ? 'organization' : 'organizations'}
            </caption>
            <thead>
              <tr className="border-b-[length:var(--border-width)] border-[var(--color-border)]">
                <th scope="col" className={cell}>Organization</th>
                <th scope="col" className={cell}>City</th>
                <th scope="col" className={cell}>Admin</th>
                <th scope="col" className={cell}>Created</th>
                <th scope="col" className={cell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.organizations.map((o) => (
                <tr key={o.id} className="border-b-[length:var(--border-width)] border-[var(--color-border)]">
                  <td className={cell}>{o.name}</td>
                  <td className={cell}>{displayValue([o.city, o.state].filter(Boolean).join(', '))}</td>
                  <td className={cell}>{displayValue(o.adminName)}</td>
                  <td className={cell}>{formatCreated(o.createdAt)}</td>
                  <td className={`${cell} text-right`}>
                    <OrganizationRowMenu
                      organizationName={o.name}
                      onAction={(actionId, trigger) => {
                        if (actionId === 'view-details') {
                          triggerRef.current = trigger
                          setSelected(o)
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <OrganizationDetailDrawer organization={selected} onClose={close} />}
    </main>
  )
}
