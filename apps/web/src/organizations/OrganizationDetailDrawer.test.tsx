import { fireEvent, render, screen, within } from '@testing-library/react'
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer'
import { makeOrg } from './testOrganizations'

const renderDrawer = (org = makeOrg(), onClose = () => {}) =>
  render(<OrganizationDetailDrawer organization={org} onClose={onClose} />)

describe('OrganizationDetailDrawer', () => {
  it('shows every value as plain text, not an editable field (AC3)', () => {
    renderDrawer()
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelectorAll('input, textarea, select')).toHaveLength(0)
    expect(within(dialog).queryByRole('textbox')).toBeNull()
    expect(within(dialog).getByText('12 Main St').tagName).toBe('DD')
  })

  it('is named "Organization details" and shows the organization name (AC2)', () => {
    renderDrawer()
    const dialog = screen.getByRole('dialog', { name: 'Organization details' })
    expect(within(dialog).getByText('Alpha Org', { selector: 'p' })).toBeVisible()
  })

  it.each(['Organization', 'Address', 'Admin', 'Created by'])('shows the %s section (AC4-7)', (name) => {
    renderDrawer()
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', { level: 3, name: new RegExp(`^${name}$`, 'i') }),
    ).toBeVisible()
  })

  it('has no Edit or Delete action (AC8)', () => {
    renderDrawer()
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })

  it('shows a dash with a "No value" label for each empty field', () => {
    renderDrawer(makeOrg({ phone: null, street2: '', adminPhone: '  ' }))
    const dialog = screen.getByRole('dialog')
    const dd = within(dialog).getAllByText('Phone')[0].nextElementSibling
    expect(dd).toHaveTextContent('-')
    expect(dd).toHaveAttribute('aria-label', 'No value')
    expect(within(dialog).getByText('Address line 2').nextElementSibling).toHaveTextContent('-')
    expect(within(dialog).getAllByText('Phone')[1].nextElementSibling).toHaveTextContent('-')
  })

  it('focuses the heading on open', () => {
    renderDrawer()
    expect(screen.getByRole('heading', { level: 2, name: 'Organization details' })).toHaveFocus()
  })

  it('calls onClose from the close button, Escape and the backdrop', () => {
    const onClose = vi.fn()
    const { container } = renderDrawer(makeOrg(), onClose)
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(container.querySelector('[data-backdrop]') as Element)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('keeps Tab focus inside the panel', () => {
    renderDrawer()
    const close = screen.getByRole('button', { name: 'Close details' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()
  })
})
