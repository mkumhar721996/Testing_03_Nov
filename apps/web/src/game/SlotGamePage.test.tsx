import { fireEvent, render, screen } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'

type Resolver = (value: unknown) => void

function grid(scatters: number): string[][] {
  const g = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6'])
  for (let i = 0; i < scatters; i++) g[i % 3][i % 5] = 'SCATTER'
  return g
}

function spinResponse(scatterCount: number, awarded: number, remaining: number) {
  return { grid: grid(scatterCount), scatterCount, freeGames: { awarded, remaining } }
}

function stubServer(initialRemaining: number, spin: () => Promise<unknown>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/spin/free-games')) {
      return Promise.resolve({ ok: true, json: async () => ({ remaining: initialRemaining }) })
    }
    return spin().then((body) => ({ ok: true, json: async () => body }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const clickSpin = () => fireEvent.click(screen.getByRole('button', { name: 'Spin' }))

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('SlotGamePage', () => {
  it('shows an award only after the server returns the spin (AC5)', async () => {
    let resolveSpin: Resolver = () => {}
    const fetchMock = stubServer(0, () => new Promise((r) => (resolveSpin = r)))
    render(<SlotGamePage />)
    clickSpin()
    expect(screen.getByText('Spinning…', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.queryByText(/free games awarded/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/free games$/)).not.toBeInTheDocument()
    resolveSpin(spinResponse(3, 10, 10))
    expect(await screen.findByText('3 scatters: 10 free games awarded')).toBeInTheDocument()

    const [, init] = fetchMock.mock.calls.find(([u]) => !u.endsWith('/spin/free-games'))!
    expect(JSON.parse(init!.body as string)).toEqual({ bet: 1 })
    expect((init!.headers as Record<string, string>)['x-guest-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each([
    [3, 10],
    [4, 15],
    [5, 20],
  ])('%i scatters award %i free games and show the counter (AC1-AC3, AC7)', async (n, award) => {
    stubServer(0, async () => spinResponse(n, award, award))
    render(<SlotGamePage />)
    clickSpin()
    expect(await screen.findByText(`${n} scatters: ${award} free games awarded`)).toBeInTheDocument()
    expect(screen.getByLabelText(`${award} free games`)).toHaveTextContent(String(award))
    expect(screen.getByText('Saved on server')).toBeInTheDocument()
  })

  it('shows no award and no counter for 2 scatters (AC4, AC8)', async () => {
    stubServer(0, async () => spinResponse(2, 0, 0))
    render(<SlotGamePage />)
    clickSpin()
    expect(await screen.findByText('2 scatters: no free games this spin.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/free games$/)).not.toBeInTheDocument()
    expect(screen.getByText('No free games active.')).toBeInTheDocument()
  })

  it('restores the counter from the server on load (AC6)', async () => {
    stubServer(10, async () => spinResponse(0, 0, 10))
    render(<SlotGamePage />)
    expect(await screen.findByLabelText('10 free games')).toBeInTheDocument()
  })

  it('awards nothing more while free games are in progress (AC9)', async () => {
    stubServer(10, async () => spinResponse(3, 0, 10))
    render(<SlotGamePage />)
    await screen.findByLabelText('10 free games')
    clickSpin()
    expect(
      await screen.findByText('3 scatters landed: no additional free games awarded.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('10 free games')).toBeInTheDocument()
  })

  it('shows an error and keeps the counter when the spin fails', async () => {
    stubServer(10, () => Promise.reject(new Error('network')))
    render(<SlotGamePage />)
    await screen.findByLabelText('10 free games')
    clickSpin()
    expect(await screen.findByRole('alert')).toHaveTextContent("The spin didn't complete.")
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/free games awarded/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('10 free games')).toBeInTheDocument()
  })
})
