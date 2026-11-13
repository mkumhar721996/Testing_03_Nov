export function AuthTopBar() {
  return (
    <header className="flex items-center justify-between border-b-[length:var(--border-width)] border-solid border-b-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-3)] py-[var(--space-2)]">
      <strong className="text-[var(--color-fg)]">Bounteous Repairs</strong>
      <nav aria-label="Top">
        <a href="#/account" aria-current="page" className="btn btn-ghost btn-sm">
          Account
        </a>
      </nav>
    </header>
  )
}
