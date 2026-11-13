export function AuthTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-2)]">
      <strong className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)]">Bounteous Repairs</strong>
      <nav aria-label="Top bar">
        <a href="#/account" aria-current="page" className="btn btn-ghost btn-sm">
          Account
        </a>
      </nav>
    </header>
  )
}
