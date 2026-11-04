import { fireEvent, render, screen, within } from '@testing-library/react'
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer'
import type { Organization } from './organizationApi'

const full: Organization = {
  id: 'org-b',
  name: 'Beta Org',
  type: 'Charity',
  street: '12 Main St',
  city: 'Leeds',
  region: 'West Yorkshire',
  postalCode: 'LS1 1AA',
  country: 'UK',
  adminName: 'Ada Admin',
  adminEmail: 'ada@example.test',
  adminPhone: '0113 000 0000',
  createdByName: 'Sam Setup',
  createdAt: '2026-01-02T03:04:05.000Z',
}
const sparse: Organization = {
  ...full,
  street: null,
  city: null,
  region: null,
  postalCode: null,
  country: null,
  adminName: null,
  adminEmail: null,
  adminPhone: null,
  createdByName: null,
  createdAt: null,
}

describe('OrganizationDetailDrawer', () => {
  it('shows every value as plain text, not an editable field (AC3)', () => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    expect(dialog.querySelectorAll('input, textarea, select')).toHaveLength(0)
    expect(within(dialog).getByText('12 Main St')).toBeVisible()
  })

  it.each(['Organization', 'Address', 'Admin', 'Created By'])('shows the %s section (AC4-7)', (name) => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name })).toBeVisible()
  })

  it('has no Edit or Delete action (AC8)', () => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })

  it('closes from the Close button (AC12)', () => {
    const onClose = vi.fn()
    render(<OrganizationDetailDrawer organization={full} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape (AC13)', () => {
    const onClose = vi.fn()
    render(<OrganizationDetailDrawer organization={full} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a dash for each field with no value (AC15)', () => {
    render(<OrganizationDetailDrawer organization={sparse} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    for (const label of ['Street', 'City', 'Region', 'Postal code', 'Country', 'Name', 'Email', 'Phone', 'Created on']) {
      const dts = within(dialog).getAllByText(label)
      expect(dts.some((dt) => dt.nextElementSibling?.textContent === '-')).toBe(true)
    }
  })
})
