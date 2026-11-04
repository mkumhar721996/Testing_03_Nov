import type { ReactNode } from 'react'
import './auth.css'

/** Pre-sign-in pages sit outside the app shell: a logo bar and one centred column. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-bar">
        <span className="auth-logo" role="img" aria-label="Company logo">
          Logo
        </span>
      </div>
      <main className="auth-col stack">{children}</main>
    </div>
  )
}

export function goTo(hash: string) {
  window.location.hash = hash
}
