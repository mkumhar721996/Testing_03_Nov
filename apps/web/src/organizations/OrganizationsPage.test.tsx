import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { OrganizationsPage } from './OrganizationsPage'
import { makeOrg } from './testOrganizations'

const orgs = [makeOrg({ id: 'a', name: 'Alpha Org' }), makeOrg({ id: 'b', name: 'Beta Org' })]
const stub = () => vi.fn().mockResolvedValue(orgs)

const openMenu = async (name: string) =>
  fireEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }))
const openDetails = async (name: string) => {
  await openMenu(name)
  fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }))
}

describe('OrganizationsPage', () => {
  it('shows a "..." menu control on every row (AC1)', async () => {
    render(<OrganizationsPage fetcher={stub()} />)
    expect(await screen.findAllByRole('button', { name: /^More actions for / })).toHaveLength(2)
  })

  it('opens the panel for the chosen row (AC2)', async () => {
    render(<OrganizationsPage fetcher={stub()} />)
    await openDetails('Beta Org')
    const dialog = screen.getByRole('dialog', { name: 'Organization details' })
    expect(within(dialog).getByText('Beta Org', { selector: 'p' })).toBeVisible()
    expect(within(dialog).queryByText('Alpha Org')).toBeNull()
  })

  it('offers no Edit or Delete with the menu open or the panel open (AC8)', async () => {
    render(<OrganizationsPage fetcher={stub()} />)
    await openMenu('Alpha Org')
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
    expect(screen.queryByRole('menuitem', { name: /edit|delete/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }))
    expect(screen.queryByRole('menuitem', { name: /edit|delete/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })

  it('shows each organization in its own row with a count caption (AC9)', async () => {
    render(<OrganizationsPage fetcher={stub()} />)
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Alpha Org')).toBeVisible()
    expect(within(rows[1]).getByText('Beta Org')).toBeVisible()
    expect(within(table).getByText('2 organizations')).toBeVisible()
    expect(within(rows[0]).getByText('Seattle, WA')).toBeVisible()
  })

  it('uses a singular caption for one organization', async () => {
    render(<OrganizationsPage fetcher={vi.fn().mockResolvedValue([orgs[0]])} />)
    expect(await screen.findByText('1 organization')).toBeVisible()
  })

  it.each(['button', 'escape', 'backdrop'])('closes by %s and returns focus to the row menu', async (how) => {
    const { container } = render(<OrganizationsPage fetcher={stub()} />)
    await openDetails('Beta Org')
    if (how === 'button') fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    if (how === 'escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    if (how === 'backdrop') fireEvent.click(container.querySelector('[data-backdrop]') as Element)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'More actions for Beta Org' })).toHaveFocus())
  })

  it('closes only the menu when Escape is pressed on an open menu', async () => {
    render(<OrganizationsPage fetcher={stub()} />)
    await openMenu('Alpha Org')
    expect(screen.getByRole('menuitem', { name: 'View details' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'View details' }), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'More actions for Alpha Org' })).toHaveFocus()
  })

  it('shows a loading state', () => {
    render(<OrganizationsPage fetcher={() => new Promise(() => {})} />)
    expect(screen.getByLabelText('Loading organizations')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows an empty state', async () => {
    render(<OrganizationsPage fetcher={vi.fn().mockResolvedValue([])} />)
    expect(await screen.findByRole('heading', { name: 'No organizations to show' })).toBeVisible()
  })

  it('shows an alert on failure and refetches on Retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(orgs)
    render(<OrganizationsPage fetcher={fetcher} />)
    expect(await screen.findByRole('alert')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Alpha Org')).toBeVisible()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
