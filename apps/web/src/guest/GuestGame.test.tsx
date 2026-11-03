import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GuestGame from './GuestGame'

const view = (over = {}) => ({
  balance: 1000,
  startingBalance: 1000,
  resumed: false,
  canClaimTopUp: false,
  ...over,
})

const respond = (...bodies: object[]) => {
  const fetchMock = vi.fn()
  bodies.forEach((b) => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => b }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const start = async () => {
  const user = userEvent.setup()
  render(<GuestGame />)
  await user.click(screen.getByRole('button', { name: 'Play as guest' }))
  return user
}

afterEach(() => vi.unstubAllGlobals())

describe('GuestGame', () => {
  it('shows the start panel first', () => {
    render(<GuestGame />)
    expect(screen.getByRole('heading', { name: 'Play as a guest' })).toBeInTheDocument()
    expect(
      screen.getByText('Play with a fixed play-money balance. No account or payment needed.'),
    ).toBeInTheDocument()
  })

  it('shows the starting balance for a new session as a plain number (AC2)', async () => {
    respond(view())
    await start()
    expect(await screen.findByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('New guest session')).toBeInTheDocument()
    expect(screen.queryByText(/[$€£]/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows a resumed session with its last balance (AC3)', async () => {
    respond(view({ balance: 240, resumed: true }))
    await start()
    expect(await screen.findByText('240')).toBeInTheDocument()
    expect(screen.getByText('Resumed guest session')).toBeInTheDocument()
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
  })

  it('shows the no balance modal and ignores Escape (AC5)', async () => {
    respond(view({ balance: 0, resumed: true, canClaimTopUp: true }))
    const user = await start()
    const dialog = await screen.findByRole('alertdialog', { name: 'No balance left' })
    expect(dialog).toHaveTextContent('The top-up sets your balance back to 1,000.')
    expect(screen.getByText('Balance used up')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim top-up' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('claims the top-up, restores the balance and closes the modal (AC6, AC7)', async () => {
    const fetchMock = respond(
      view({ balance: 0, resumed: true, canClaimTopUp: true }),
      view({ resumed: true }),
    )
    const user = await start()
    await user.click(await screen.findByRole('button', { name: 'Claim top-up' }))
    expect(await screen.findByText('1,000')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Top-up claimed. Balance is 1,000')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/guest-sessions/current/top-up', {
      method: 'POST',
      credentials: 'same-origin',
    })
  })

  it('offers no top-up when balance is 1 or more (AC8)', async () => {
    respond(view({ balance: 1, resumed: true }))
    await start()
    await screen.findByText('1')
    expect(screen.queryByRole('button', { name: 'Claim top-up' })).not.toBeInTheDocument()
  })
})
