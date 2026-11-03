export interface GuestSessionView {
  balance: number
  startingBalance: number
  resumed: boolean
  canClaimTopUp: boolean
}

async function post(path: string): Promise<GuestSessionView> {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
  return res.json()
}

export const startGuestSession = () => post('/api/guest-sessions')

export const claimTopUp = () => post('/api/guest-sessions/current/top-up')
