import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from './apiFetch'
import * as authApi from './authApi'
import type { SessionUser, SignInResult } from './authApi'

/** Why nobody is signed in, so the sign-in page can say so. */
export type SignedOutReason = 'first-visit' | 'signed-out' | 'expired'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-in'; user: SessionUser }
  | { status: 'signed-out'; reason: SignedOutReason }

interface AuthContextValue {
  state: AuthState
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    authApi.getSession().then(
      (user) => {
        if (!cancelled) setState(user ? { status: 'signed-in', user } : { status: 'signed-out', reason: 'first-visit' })
      },
      () => {
        if (!cancelled) setState({ status: 'signed-out', reason: 'first-visit' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Any 401 after load means the session has ended.
  useEffect(() => {
    setUnauthorizedHandler(() =>
      setState((current) => (current.status === 'signed-in' ? { status: 'signed-out', reason: 'expired' } : current)),
    )
    return () => setUnauthorizedHandler(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.signIn(email, password)
    if (result.ok) setState({ status: 'signed-in', user: result.user })
    return result
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut()
    } finally {
      setState({ status: 'signed-out', reason: 'signed-out' })
    }
  }, [])

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
