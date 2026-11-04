import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { OrganizationsPage } from './OrganizationsPage'
import type { Organization } from './organizationApi'

const org = (id: string, name: string): Organization => ({
  id,
  name,
  type: 'Charity',
  reference: null,
  phone: null,
  street: '12 Main St',
  street2: null,
  city: 'Leeds',
  state: 'WY',
  postalCode: null,
  adminName: 'Ada Admin',
  adminEmail: null,
  adminPhone: null,
  createdByName: null,
  createdByRole: null,
  createdAt: null,
})
const orgs = [org('a', 'Alpha Org'), org('b', 'Beta Org')]
const identity = { role: 'wfc_admin', organizationId: undefined }

async function openDetails(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }))
}

describe('OrganizationsPage', () => {
  it('shows a "..." menu control on every row (AC1)', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    expect(await screen.findAllByRole('button', { name: /^More actions for / })).toHaveLength(2)
  })

  it('lists organization, city, admin and created columns', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    await screen.findByText('Alpha Org')
    for (const name of ['Organization', 'City', 'Admin', 'Created']) {
      expect(screen.getByRole('columnheader', { name })).toBeVisible()
    }
    expect(screen.getAllByText('Leeds, WY')).toHaveLength(2)
  })

  it('opens the panel for the chosen row (AC2)', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    await openDetails('Beta Org')
    expect(within(screen.getByRole('dialog')).getByText('Beta Org', { selector: 'p' })).toBeVisible()
  })

  it.each(['wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff'])('opens the panel for %s (AC11)', async (role) => {
    const fetcher = vi.fn().mockResolvedValue(orgs)
    const id = { role, organizationId: 'a' }
    render(<OrganizationsPage identity={id} fetcher={fetcher} />)
    await openDetails('Alpha Org')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(fetcher.mock.calls[0][0]).toEqual(id)
  })

  it('offers no Edit or Delete with the menu open or the panel open (AC8)', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    fireEvent.click(await screen.findByRole('button', { name: 'More actions for Alpha Org' }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
    expect(screen.queryByRole('menuitem', { name: /edit|delete/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }))
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })

  it('closes with the Close button and returns focus to the row menu (AC12, AC14)', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    await openDetails('Beta Org')
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'More actions for Beta Org' })).toHaveFocus())
  })

  it('closes on Escape and returns focus to the row menu (AC13, AC14)', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => orgs} />)
    await openDetails('Beta Org')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'More actions for Beta Org' })).toHaveFocus())
  })

  it('shows an error with Retry when loading fails', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(orgs)
    render(<OrganizationsPage identity={identity} fetcher={fetcher} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Alpha Org')).toBeVisible()
  })

  it('shows an empty state when there are no organizations', async () => {
    render(<OrganizationsPage identity={identity} fetcher={async () => []} />)
    expect(await screen.findByText('No organizations to show')).toBeVisible()
  })
})
