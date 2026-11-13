import { useState, type ReactNode } from 'react'

// Dashboard, Items and Profile have no routes of their own yet; Settings and Profile open the Technicians list.
const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '#' },
  { id: 'items', label: 'Items', href: '#/bookings' },
  { id: 'settings', label: 'Settings', href: '#/technicians' },
  { id: 'profile', label: 'Profile', href: '#/technicians' },
]

/**
 * Minimal shell for the technician screens: a phone-only menu bar plus the left navigation.
 * Settings is highlighted on both technician screens because detail views stay inside their parent section;
 * `section` picks the highlighted entry for other screens (Bookings sits under Items).
 */
export function TechniciansShell({ children, section = 'settings' }: { children: ReactNode; section?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="app">
      <header className="app-header">
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
      </header>
      <div className="app-body">
        <nav id="main-nav" aria-label="Main" className={`app-nav${open ? ' is-open' : ''}`}>
          <ul>
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={item.href} aria-current={item.id === section ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-main">{children}</div>
      </div>
    </div>
  )
}
