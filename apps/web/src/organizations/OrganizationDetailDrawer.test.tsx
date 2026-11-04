import { fireEvent, render, screen, within } from '@testing-library/react'
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer'
import type { Organization } from './organizationApi'

const full: Organization = {
  id: 'org-b',
  name: 'Beta Org',
  type: 'Charity',
  reference: 'ORG-1',
  phone: '0113 111 1111',
  street: '12 Main St',
  street2: 'Suite 2',
  city: 'Leeds',
  state: 'WY',
  postalCode: 'LS1 1AA',
  adminName: 'Ada Admin',
  adminEmail: 'ada@example.test',
  adminPhone: '0113 000 0000',
  createdByName: 'Sam Setup',
  createdByRole: 'WFC Admin',
  createdAt: '2026-01-02T03:04:05.000Z',
}
const sparse: Organization = {
  ...full,
  type: null,
  reference: null,
  phone: null,
  street: null,
  street2: null,
  city: null,
  state: null,
  postalCode: null,
  adminName: null,
  adminEmail: null,
  adminPhone: null,
  createdByName: null,
  createdByRole: null,
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

  it('names the panel and the organization it shows (AC2)', () => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Organization details' })
    expect(within(dialog).getByText('Beta Org', { selector: 'p' })).toBeVisible()
  })

  it.each(['Organization', 'Address', 'Admin', 'Created by'])('shows the %s section (AC4-7)', (name) => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name })).toBeVisible()
  })

  it('has no Edit or Delete action (AC8)', () => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })

  it('closes from the close button (AC12)', () => {
    const onClose = vi.fn()
    render(<OrganizationDetailDrawer organization={full} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape (AC13)', () => {
    const onClose = vi.fn()
    render(<OrganizationDetailDrawer organization={full} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps Tab focus inside the panel', () => {
    render(<OrganizationDetailDrawer organization={full} onClose={() => {}} />)
    const close = screen.getByRole('button', { name: 'Close details' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()
  })

  it('shows a dash for each field with no value (AC15)', () => {
    render(<OrganizationDetailDrawer organization={sparse} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    const labels = [
      'Type', 'Reference', 'Phone', 'Street', 'Address line 2', 'City', 'State', 'Postal code',
      'Email', 'Role', 'Created on',
    ]
    for (const label of labels) {
      const dts = within(dialog).getAllByText(label)
      expect(dts.every((dt) => dt.nextElementSibling?.textContent === '-')).toBe(true)
    }
  })
})
