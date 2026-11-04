import { act, render, screen } from '@testing-library/react'
import { apiFetch } from './apiFetch'
import { AuthProvider, useAuth } from './AuthProvider'
import * as authApi from './authApi'

vi.mock('./authApi')

const user = { id: 'u1', email: 'priya.raman@northwind.example', name: 'Priya Raman' }

function Probe() {
  const { state, signOut } = useAuth()
  return (
    <div>
      <p>{state.status === 'signed-out' ? `out:${state.reason}` : state.status}</p>
      <button onClick={() => signOut()}>out</button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthProvider', () => {
  it('is signed in when the session resolves', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(user)
    renderProbe()
    expect(await screen.findByText('signed-in')).toBeVisible()
  })

  it('is signed out on a first visit without a session (AC5)', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(null)
    renderProbe()
    expect(await screen.findByText('out:first-visit')).toBeVisible()
  })

  it('records a sign-out', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(user)
    vi.mocked(authApi.signOut).mockResolvedValue()
    renderProbe()
    await screen.findByText('signed-in')
    await act(async () => screen.getByRole('button', { name: 'out' }).click())
    expect(await screen.findByText('out:signed-out')).toBeVisible()
  })

  it('records an expired session when the API answers 401 (AC5)', async () => {
    vi.mocked(authApi.getSession).mockResolvedValue(user)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    renderProbe()
    await screen.findByText('signed-in')
    await act(async () => {
      await apiFetch('/patients/me')
    })
    expect(await screen.findByText('out:expired')).toBeVisible()
  })
})
