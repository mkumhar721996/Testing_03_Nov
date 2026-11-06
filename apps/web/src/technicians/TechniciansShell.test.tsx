import { fireEvent, render, screen, within } from '@testing-library/react'
import { TechniciansShell } from './TechniciansShell'

describe('TechniciansShell', () => {
  it('lists the four navigation entries with Settings current', () => {
    render(
      <TechniciansShell>
        <p>x</p>
      </TechniciansShell>,
    )
    const links = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['Dashboard', 'Items', 'Settings', 'Profile'])
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Account')).not.toBeInTheDocument()
  })

  it('takes its own entries, current item, muted background and footer', () => {
    const { container } = render(
      <TechniciansShell
        current="items"
        muted
        footer="Web App · Help · Privacy"
        items={[
          { id: 'dashboard', label: 'Dashboard', href: '#' },
          { id: 'items', label: 'Items', href: '#' },
          { id: 'settings', label: 'Settings', href: '#' },
        ]}
      >
        <p>x</p>
      </TechniciansShell>,
    )
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Dashboard', 'Items', 'Settings'])
    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    expect(screen.getByText('Web App · Help · Privacy')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('app--muted')
  })

  it('toggles the navigation from the menu button', () => {
    render(
      <TechniciansShell>
        <p>x</p>
      </TechniciansShell>,
    )
    const menu = screen.getByRole('button', { name: 'Menu' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass('is-open')
  })
})
