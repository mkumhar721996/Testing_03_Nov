import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { ForgotPasswordPage } from './auth/ForgotPasswordPage'
import { ResetPasswordPage } from './auth/ResetPasswordPage'
import { SignInPage } from './auth/SignInPage'
import { BetControl } from './components/BetControl'
import { DashboardPage } from './dashboard/DashboardPage'

const ADD_READING = '#/readings/new'
const BOOK_APPOINTMENT = '#/appointments/new'
const SIGN_IN = '#/sign-in'
const FORGOT_ROUTE = '#/forgot-password'
const RESET_ROUTE = '#/reset-password'
const AUTH_ROUTES = [SIGN_IN, FORGOT_ROUTE, RESET_ROUTE]

// Hash navigation is a stand-in until the shell, router and form stories land.
function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

const landings: Record<string, string> = {
  [ADD_READING]: 'Add reading',
  [BOOK_APPOINTMENT]: 'Book appointment',
}

function AppRoutes() {
  // No spin endpoint exists yet, so the balance is local state only.
  const [balance] = useState(100)
  const { state, signOut } = useAuth()
  const hash = useRoute()
  const [path, query = ''] = hash.split('?')
  const isAuthRoute = AUTH_ROUTES.includes(path)
  const signedOut = state.status === 'signed-out'
  const signedIn = state.status === 'signed-in'

  // Signed-out or expired sessions go to the sign-in page; a signed-in person has no use for it.
  useEffect(() => {
    if (signedOut && !isAuthRoute) window.location.hash = SIGN_IN
    if (signedIn && isAuthRoute) window.location.hash = ''
  }, [signedOut, signedIn, isAuthRoute])

  if (state.status === 'loading') return null

  if (path === FORGOT_ROUTE) return <ForgotPasswordPage />
  if (path === RESET_ROUTE) return <ResetPasswordPage token={new URLSearchParams(query).get('token') ?? ''} />
  if (state.status === 'signed-out') {
    const notice = state.reason === 'first-visit' ? undefined : state.reason
    return <SignInPage notice={notice} />
  }

  // Temporary: moves into the top bar account menu with the shell story.
  const signOutButton = (
    <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
      Sign out
    </button>
  )

  const landing = landings[path]
  if (landing) {
    return (
      <main aria-label={landing} className="p-[var(--space-3)] text-[var(--color-fg)]">
        {signOutButton}
        <h1 className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]">{landing}</h1>
      </main>
    )
  }
  return (
    <main>
      {signOutButton}
      <DashboardPage
        onAddReading={() => (window.location.hash = ADD_READING)}
        onBookAppointment={() => (window.location.hash = BOOK_APPOINTMENT)}
      />
      <BetControl balance={balance} onSpin={() => {}} />
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
