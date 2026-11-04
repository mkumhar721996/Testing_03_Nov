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

  it('traps Tab and Shift+Tab inside the panel', () => {
    renderDrawer()
    const heading = screen.getByRole('heading', { level: 2, name: 'Organization details' })
    const close = screen.getByRole('button', { name: 'Close details' })
    const outside = document.body.appendChild(document.createElement('button'))
    // Tab from the last control would leave the panel: it must be intercepted and wrapped.
    close.focus()
    expect(fireEvent.keyDown(close, { key: 'Tab' })).toBe(false)
    expect(close).toHaveFocus()
    // Shift+Tab from the heading (focused on open) must not escape backwards.
    heading.focus()
    expect(fireEvent.keyDown(heading, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(close).toHaveFocus()
    expect(outside).not.toHaveFocus()
    outside.remove()
  })
})
