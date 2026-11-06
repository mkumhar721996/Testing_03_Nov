import { useState, type ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  href: string
}

// Dashboard, Items and Profile have no routes of their own yet; Settings and Profile open the Technicians list.
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '#' },
  { id: 'items', label: 'Items', href: '#' },
  { id: 'settings', label: 'Settings', href: '#/technicians' },
  { id: 'profile', label: 'Profile', href: '#/technicians' },
]

interface TechniciansShellProps {
  children: ReactNode
  /** Id of the navigation entry to highlight. */
  current?: string
  items?: NavItem[]
  /** Light grey page background behind white cards. */
  muted?: boolean
  footer?: ReactNode
}

/**
 * Minimal shell for the technician screens: a phone-only menu bar plus the left navigation.
 * Settings is highlighted on both screens because detail views stay inside their parent section.
 * The booking page reuses it with its own entries, highlight, background and footer.
 */
export function TechniciansShell({
  children,
  current = 'settings',
  items = NAV,
  muted = false,
  footer,
}: TechniciansShellProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`app${muted ? ' app--muted' : ''}`}>
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
            {items.map((item) => (
              <li key={item.id}>
                <a href={item.href} aria-current={item.id === current ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-main">
          {children}
          {footer && <p className="app-footer">{footer}</p>}
        </div>
      </div>
    </div>
  )
}
