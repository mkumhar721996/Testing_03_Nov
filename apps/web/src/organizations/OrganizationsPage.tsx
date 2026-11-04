import { useRef, useState } from 'react'
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer'
import { OrganizationRowMenu } from './OrganizationRowMenu'
import { fetchOrganizations, type Identity, type Organization } from './organizationApi'
import { displayValue } from './organizationDisplay'
import { useCurrentUser } from './useCurrentUser'
import { useOrganizations } from './useOrganizations'

interface Props {
  identity?: Identity | null
  fetcher?: (identity: Identity, signal?: AbortSignal) => Promise<Organization[]>
}

const secondaryButton =
  'h-[var(--control-height-md)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--button-secondary-border)] bg-[var(--button-secondary-background)] px-[var(--space-3)] text-[var(--button-secondary-foreground)] hover:bg-[var(--button-secondary-background-hover)]'

export function OrganizationsPage({ identity, fetcher = fetchOrganizations }: Props) {
  const current = useCurrentUser()
  const user = identity ?? current
  return (
    <main aria-label="Organizations" className="mx-auto max-w-[var(--content-max-width)] p-[var(--space-3)] text-[var(--color-fg)]">
      <h1 className="mb-[var(--space-3)] text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">Organizations</h1>
      {user ? (
        <OrganizationList identity={user} fetcher={fetcher} />
      ) : (
        <p role="alert">Sign in to see organizations.</p>
      )}
    </main>
  )
}

function OrganizationList({ identity, fetcher }: { identity: Identity; fetcher: NonNullable<Props['fetcher']> }) {
  const { state, retry } = useOrganizations(identity, fetcher)
  const [selected, setSelected] = useState<Organization | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = () => {
    setSelected(null)
    triggerRef.current?.focus()
  }

  if (state.status === 'loading') return <div className="skeleton" role="status" aria-label="Loading organizations">Loading organizations</div>
  if (state.status === 'error') {
    return (
      <div role="alert" className="flex items-center gap-[var(--space-3)]">
        <span>Organizations could not be loaded. Check your connection and try again.</span>
        <button type="button" onClick={retry} className={secondaryButton}>
          Retry
        </button>
      </div>
    )
  }
  if (state.organizations.length === 0) {
    return (
      <div className="empty-state">
        <h3>No organizations to show</h3>
        <p>Your account is not linked to an organization yet. Ask a WFC Admin to add you.</p>
      </div>
    )
  }
  return (
    <>
      <div className="table-wrap overflow-x-auto">
        <table className="table w-full text-left text-[length:var(--font-size-md)]">
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-[var(--color-border)]">
              <th scope="col" className="p-[var(--space-2)]">Organization</th>
              <th scope="col" className="p-[var(--space-2)]">City</th>
              <th scope="col" className="p-[var(--space-2)]">Admin</th>
              <th scope="col" className="p-[var(--space-2)]">Created</th>
              <th scope="col" className="p-[var(--space-2)]"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {state.organizations.map((o) => (
              <tr key={o.id} className="border-b-[length:var(--border-width)] border-[var(--color-border)]">
                <td className="p-[var(--space-2)]">{o.name}</td>
                <td className="p-[var(--space-2)]">{displayValue([o.city, o.state].filter(Boolean).join(', '))}</td>
                <td className="p-[var(--space-2)]">{displayValue(o.adminName)}</td>
                <td className="p-[var(--space-2)]">{displayValue(o.createdAt?.slice(0, 10))}</td>
                <td className="p-[var(--space-2)] text-right">
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
      {selected && <OrganizationDetailDrawer organization={selected} onClose={close} />}
    </>
  )
}
