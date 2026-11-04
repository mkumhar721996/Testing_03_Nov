import { fireEvent, render, screen } from '@testing-library/react'
import { OrganizationPage } from './OrganizationPage'
import type { Organization } from './organizationApi'

const org: Organization = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Alain Leroy Locke College Prep Academy',
  address: '325 E 111th St, Los Angeles CA 90061',
  admin: { name: 'Karishmah', email: 'karishmah@gmail.com' },
  createdBy: 'Daniel Gonzalez Bermudez',
  financeContact: {
    role: 'Fundraising Consultant',
    name: 'Morgan Gould',
    email: 'mgould@wfchocolate.com',
    phone: '(555) 218-4400',
  },
}

function renderPage(organization: Organization = org) {
  const fetcher = vi.fn().mockResolvedValue(organization)
  render(<OrganizationPage organizationId={org.id} fetcher={fetcher} />)
  return fetcher
}

describe('OrganizationPage', () => {
  it('shows the name, address, admin, creator and finance contact (AC1-6)', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: org.name })).toBeInTheDocument()
    expect(screen.getByText(org.address)).toBeInTheDocument()
    expect(screen.getByText('Karishmah')).toBeInTheDocument()
    expect(screen.getByText('karishmah@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Daniel Gonzalez Bermudez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'mgould@wfchocolate.com' })).toHaveAttribute(
      'href',
      'mailto:mgould@wfchocolate.com',
    )
    expect(screen.getByRole('link', { name: '(555) 218-4400' })).toHaveAttribute('href', 'tel:+15552184400')
  })

  it('shows the title, reference caption and finance contact block (AC7)', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Organization' })).toBeInTheDocument()
    expect(screen.getByText('UI REFERENCE — VIEW PANEL WITH FC SECTION')).toBeInTheDocument()
    expect(screen.getByText('Fundraising Consultant')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Morgan Gould' })).toBeInTheDocument()
  })

  it('shows Edit as primary and Delete as secondary, using the button tokens (AC8, AC9)', async () => {
    renderPage()
    const edit = await screen.findByRole('button', { name: 'Edit' })
    const del = screen.getByRole('button', { name: 'Delete' })
    expect(edit).toHaveClass('btn-primary')
    expect(del).toHaveClass('btn-secondary')
    expect(edit.className).toContain('var(--button-edit-background)')
    expect(del.className).toContain('var(--button-delete-background)')
  })

  it.each(['Edit', 'Delete'])('does nothing when %s is clicked (AC10, AC11)', async (name) => {
    const fetcher = renderPage()
    await screen.findByRole('button', { name })
    const before = window.location.hash
    fireEvent.click(screen.getByRole('button', { name }))
    expect(window.location.hash).toBe(before)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(screen.getByText(org.address)).toBeInTheDocument()
  })

  it('shows dashes for a missing finance email and phone (AC12, AC13)', async () => {
    renderPage({ ...org, financeContact: { ...org.financeContact, email: null, phone: null } })
    expect(await screen.findByRole('img', { name: 'No finance contact email' })).toHaveTextContent('—')
    expect(screen.getByRole('img', { name: 'No finance contact phone' })).toHaveTextContent('—')
  })

  it('shows a long name and address in full with wrapping (AC14, AC15)', async () => {
    const longName = 'N'.repeat(120)
    const longAddress = 'A'.repeat(120)
    renderPage({ ...org, name: longName, address: longAddress })
    expect(await screen.findByRole('heading', { name: longName })).toHaveClass('[overflow-wrap:anywhere]')
    expect(screen.getByText(longAddress)).toHaveClass('[overflow-wrap:anywhere]')
  })

  it('shows a loading status, then an error with Try again that refetches', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(org)
    render(<OrganizationPage organizationId={org.id} fetcher={fetcher} />)
    expect(screen.getByRole('status', { name: 'Loading organization details' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load this organization.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: org.name })).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
