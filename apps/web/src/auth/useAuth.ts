import { useCallback, useEffect, useState } from 'react'
import * as api from './authApi'

const TOKEN_KEY = 'auth-token'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export function useAuth() {
  const [user, setUser] = useState<api.SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (sessionStorage.getItem(TOKEN_KEY) ? 'loading' : 'signed-out'))

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) return
    let live = true
    api.fetchSession(token).then(
      (u) => {
        if (!live) return
        setUser(u)
        setStatus('signed-in')
      },
      (err) => {
        if (!live) return
        // Only drop the token when the server refused it, not on a network blip.
        if (err instanceof api.AuthRefusedError) sessionStorage.removeItem(TOKEN_KEY)
        setStatus('signed-out')
      },
    )
    return () => {
      live = false
    }
  }, [])

  const start = useCallback(async (call: Promise<api.AuthResult>) => {
    const { token, user: u } = await call
    sessionStorage.setItem(TOKEN_KEY, token)
    setUser(u)
    setStatus('signed-in')
  }, [])

  const register = useCallback((email: string, password: string) => start(api.register(email, password)), [start])
  const signIn = useCallback((email: string, password: string) => start(api.signIn(email, password)), [start])

  const signOut = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setStatus('signed-out')
    if (token) await api.signOut(token).catch(() => undefined)
  }, [])

  return { user, status, register, signIn, signOut }
}
