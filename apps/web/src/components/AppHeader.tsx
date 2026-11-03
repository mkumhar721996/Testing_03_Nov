export type View = 'dashboard' | 'log'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'log', label: 'Log' },
]

interface AppHeaderProps {
  active: View
  onNavigate: (view: View) => void
}

export default function AppHeader({ active, onNavigate }: AppHeaderProps) {
  return (
    <header
      className="cluster cluster-lg"
      style={{
        padding: 'var(--space-3)',
        background: 'var(--color-bg)',
        borderBottom: 'var(--border-width) solid var(--color-border)',
      }}
    >
      <h3 style={{ fontWeight: 'var(--font-weight-bold)' }}>Health</h3>
      <nav aria-label="Main">
        <ul className="cluster cluster-lg" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'page' : undefined}
                style={{
                  color: active === item.id ? 'var(--color-primary)' : 'var(--color-fg)',
                  fontWeight: active === item.id ? 'var(--font-weight-bold)' : undefined,
                }}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(item.id)
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
