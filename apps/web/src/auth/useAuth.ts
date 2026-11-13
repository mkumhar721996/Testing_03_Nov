import { useCallback, useEffect, useState } from 'react'
import * as api from './authApi'
import type { SessionUser } from './authApi'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let live = true
    api
      .fetchSession()
      .then((u) => live && (setUser(u), setStatus('signed-in')))
      .catch(() => live && setStatus('signed-out'))
    return () => {
      live = false
    }
  }, [])

  const enter = useCallback((u: SessionUser) => {
    setUser(u)
    setStatus('signed-in')
  }, [])

  const register = useCallback(async (email: string, password: string) => enter(await api.register(email, password)), [enter])
  const signIn = useCallback(async (email: string, password: string) => enter(await api.signIn(email, password)), [enter])
  const signOut = useCallback(async () => {
    await api.signOut()
    setUser(null)
    setStatus('signed-out')
  }, [])

  return { user, status, register, signIn, signOut }
}
