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
