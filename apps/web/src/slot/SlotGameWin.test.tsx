import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { BetControl } from '../components/BetControl'
import { ReelGrid } from './ReelGrid'
import { SlotGamePage } from './SlotGamePage'
import { getGuestId, getLatestSpin, type SpinOutcome } from './spinApi'
import { useSlotGame } from './useSlotGame'

vi.mock('./spinApi', async (orig) => ({ ...(await orig<typeof import('./spinApi')>()), getLatestSpin: vi.fn() }))

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const winOutcome: SpinOutcome = {
  grid,
  bet: 1,
  evaluation: { totalWin: 25, wins: [{ payline: 0, symbol: 'S6', count: 4, win: 25 }] },
  jackpotTrigger: false,
}
const noWin: SpinOutcome = { ...winOutcome, evaluation: { totalWin: 0, wins: [] } }
const storeKey = () => `slot.state.${getGuestId()}`

beforeEach(() => {
  localStorage.clear()
  vi.mocked(getLatestSpin).mockReset().mockResolvedValue(null)
})
afterEach(() => vi.useRealTimers())

async function spinToWin() {
  const spin = vi.fn().mockResolvedValue(winOutcome)
  const view = render(<SlotGamePage spin={spin} />)
  fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
  await screen.findByRole('button', { name: 'Collect' })
  return { spin, ...view }
}

describe('win state', () => {
  it('shows banner and winning grid instead of the reel grid (AC1-3)', async () => {
    await spinToWin()
    expect(screen.getByRole('status')).toHaveTextContent('You won 25.00 on 4 of a kind: Picture 2')
    expect(screen.getByRole('group', { name: /^Winning grid/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Reel grid/ })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Row 2, reel 1: .*winning symbol/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Row 2, reel 5: / })).not.toHaveAccessibleName(/winning symbol/)
  })

  it('Collect returns to the reel grid (AC4, AC5)', async () => {
    await spinToWin()
    fireEvent.click(screen.getByRole('button', { name: 'Collect' }))
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^Reel grid/ })).toBeInTheDocument()
    expect(localStorage.getItem(storeKey())).toBeNull()
  })

  it('Spin again starts a new spin at the same bet (AC6, AC7, AC14)', async () => {
    const { spin } = await spinToWin()
    spin.mockReturnValue(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: 'Spin again' }))
    expect(spin).toHaveBeenCalledTimes(2)
    expect(spin).toHaveBeenLastCalledWith(1, expect.any(String))
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Collect' })).not.toBeInTheDocument()
  })

  it('shows no banner after a no-win spin (AC8)', async () => {
    render(<SlotGamePage spin={vi.fn().mockResolvedValue(noWin)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(await screen.findByText('No win this spin. Press Spin to play again.')).toBeInTheDocument()
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
  })

  it('restores a win awaiting collection after reload (AC10-13)', () => {
    localStorage.setItem(storeKey(), JSON.stringify({ kind: 'win', outcome: winOutcome }))
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('You won 25.00')
    expect(screen.getByRole('group', { name: /^Winning grid/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collect' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Spin again' })).toBeEnabled()
  })

  it('round trips: win survives remount, collect does not', async () => {
    const { unmount } = await spinToWin()
    unmount()
    const again = render(<SlotGamePage spin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collect' }))
    again.unmount()
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^Reel grid/ })).toBeInTheDocument()
  })
})

describe('reload mid-spin (AC9)', () => {
  const seed = (startedAt = Date.now()) => localStorage.setItem(storeKey(), JSON.stringify({ kind: 'spinning', startedAt }))

  it('keeps the reel grid spinning until a result is known', () => {
    seed()
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.getByRole('group', { name: /^Reel grid/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Spinning/ })).toBeDisabled()
    expect(screen.getByText('Spinning. The reels are still turning.')).toBeInTheDocument()
  })

  it('picks up a winning record once it appears', async () => {
    vi.useFakeTimers()
    const startedAt = Date.now()
    seed(startedAt)
    render(<SlotGamePage spin={vi.fn()} />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
    vi.mocked(getLatestSpin).mockResolvedValue({ ...winOutcome, spunAt: new Date(startedAt + 500).toISOString() })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getByRole('status')).toHaveTextContent('You won 25.00')
  })

  it('shows the no-win message for a no-win record', async () => {
    vi.useFakeTimers()
    const startedAt = Date.now()
    seed(startedAt)
    vi.mocked(getLatestSpin).mockResolvedValue({ ...noWin, spunAt: new Date(startedAt + 1).toISOString() })
    render(<SlotGamePage spin={vi.fn()} />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('No win this spin. Press Spin to play again.')).toBeInTheDocument()
    expect(localStorage.getItem(storeKey())).toBeNull()
  })

  it('ignores a record older than the spin', async () => {
    vi.useFakeTimers()
    const startedAt = Date.now()
    seed(startedAt)
    vi.mocked(getLatestSpin).mockResolvedValue({ ...winOutcome, spunAt: new Date(startedAt - 5000).toISOString() })
    render(<SlotGamePage spin={vi.fn()} />)
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(screen.queryByText(/You won/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Spinning/ })).toBeDisabled()
  })

  it('gives up and returns to idle when no record ever arrives', async () => {
    vi.useFakeTimers()
    seed()
    render(<SlotGamePage spin={vi.fn()} />)
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(screen.getByRole('button', { name: 'Spin' })).toBeEnabled()
    expect(localStorage.getItem(storeKey())).toBeNull()
  })
})

describe('useSlotGame phase', () => {
  it('moves spinning, win, idle and stores the win', async () => {
    let resolve!: (o: SpinOutcome) => void
    const spin = vi.fn().mockReturnValue(new Promise<SpinOutcome>((r) => (resolve = r)))
    const { result } = renderHook(() => useSlotGame(spin))
    expect(result.current.phase).toBe('idle')
    let p!: Promise<void>
    act(() => {
      p = result.current.spin()
    })
    expect(result.current.phase).toBe('spinning')
    expect(JSON.parse(localStorage.getItem(storeKey())!).kind).toBe('spinning')
    await act(async () => {
      resolve(winOutcome)
      await p
    })
    expect(result.current.phase).toBe('win')
    expect(result.current.win?.amount).toBe(25)
    expect(JSON.parse(localStorage.getItem(storeKey())!).kind).toBe('win')
    act(() => result.current.collect())
    expect(result.current.phase).toBe('idle')
    expect(localStorage.getItem(storeKey())).toBeNull()
  })

  it('goes to nowin for a zero win and idle after a failed spin', async () => {
    const spin = vi.fn().mockResolvedValueOnce(noWin).mockRejectedValueOnce(new Error('x'))
    const { result } = renderHook(() => useSlotGame(spin))
    await act(() => result.current.spin())
    expect(result.current.phase).toBe('nowin')
    await act(() => result.current.spin())
    expect(result.current.phase).toBe('idle')
    expect(localStorage.getItem(storeKey())).toBeNull()
  })
})

describe('design tokens', () => {
  it('colours J and Picture 4 purple, not warning', () => {
    render(<ReelGrid grid={[['S4', 'S8', 'S1', 'S1', 'S1'], ...grid.slice(1)]} spinning={false} />)
    expect(screen.getByRole('img', { name: 'Row 1, reel 1: J' }).className).toContain('var(--sym-purple)')
    expect(screen.getByRole('img', { name: 'Row 1, reel 2: Picture 4' }).className).not.toContain('--color-warning')
  })

  it('sets the bet amount in the large size', () => {
    render(<BetControl bet={1} canDecrease={false} canIncrease onDecrease={vi.fn()} onIncrease={vi.fn()} />)
    const amount = screen.getByLabelText('Bet', { selector: 'output' })
    expect(amount.className).toContain('--font-size-lg')
    expect(amount.className).not.toContain('--font-size-xl')
  })
})
