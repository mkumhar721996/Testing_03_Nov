import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SlotGamePage } from './SlotGamePage'
import type { SpinOutcome } from './spinApi'

const grid = [0, 1, 2].map(() => ['S1', 'S2', 'S3', 'S4', 'S5']) as SpinOutcome['grid']
const outcome = (totalWin = 0): SpinOutcome => ({ grid, bet: 1, evaluation: { totalWin }, jackpotTrigger: false })
const balanceText = () => screen.getByText('Balance').nextSibling

function held() {
  let resolve!: (o: SpinOutcome) => void
  const spin = vi.fn().mockReturnValue(new Promise<SpinOutcome>((r) => (resolve = r)))
  return { spin, resolve }
}

describe('SlotGamePage', () => {
  it('shows the idle screen (AC1, AC8, AC10, AC12, AC13)', () => {
    render(<SlotGamePage spin={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Wheels Go round Tiger' })).toBeInTheDocument()
    expect(balanceText()).toHaveTextContent('1000.00')
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('0.00')
    expect(screen.getByLabelText('Bet', { selector: 'output' })).toHaveTextContent('1.00')
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
  })

  it('paints the spin result on the grid (AC4)', async () => {
    render(<SlotGamePage spin={vi.fn().mockResolvedValue(outcome())} />)
    // Row 2, reel 1 is S5 ("Picture 1") on the idle grid but S1 ("A") in the spin outcome.
    expect(screen.getByRole('img', { name: 'Row 2, reel 1: Picture 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(await screen.findByRole('img', { name: 'Row 2, reel 1: A' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Row 2, reel 1: Picture 1' })).not.toBeInTheDocument()
  })

  it('locks the controls while spinning and unlocks after (AC17-AC20)', async () => {
    const { spin, resolve } = held()
    render(<SlotGamePage spin={spin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(screen.getByRole('button', { name: 'Decrease bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase bet' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Spinning/ })).toBeDisabled()
    resolve(outcome())
    expect(await screen.findByRole('button', { name: 'Spin' })).toBeEnabled()
  })

  describe('paytable', () => {
    const body = {
      symbols: [{ symbol: 'S1', payouts: { 3: 7, 4: 11, 5: 13 } }],
      rules: { wild: 'Wild rule text', scatter: 'Scatter rule text' },
    }
    beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body })))
    afterEach(() => vi.unstubAllGlobals())

    const open = async () => {
      const button = screen.getByRole('button', { name: 'Paytable' })
      button.focus() // fireEvent.click does not move focus as a real click does
      fireEvent.click(button)
      return screen.findByRole('dialog', { name: 'Paytable' })
    }

    it('is enabled on the idle reel view (AC9)', () => {
      render(<SlotGamePage spin={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Paytable' })).toBeEnabled()
    })

    it('opens over the game and shows the server figures and rules (AC1-AC5)', async () => {
      render(<SlotGamePage spin={vi.fn()} />)
      expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument()
      const dialog = await open()
      expect(await within(dialog).findByText('11×')).toBeInTheDocument()
      expect(within(dialog).getByText('Wild rule text')).toBeInTheDocument()
      expect(within(dialog).getByText('Scatter rule text')).toBeInTheDocument()
    })

    it('closes with the close button, returning focus, and with Escape (AC6, AC7)', async () => {
      render(<SlotGamePage spin={vi.fn()} />)
      await open()
      fireEvent.click(screen.getByRole('button', { name: 'Close paytable' }))
      expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument()
      expect(screen.getByRole('group', { name: /Reel grid/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Paytable' })).toHaveFocus()
      await open()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: 'Paytable' })).not.toBeInTheDocument()
    })

    it('is disabled while a spin is in progress (AC8)', async () => {
      const { spin, resolve } = held()
      render(<SlotGamePage spin={spin} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
      expect(screen.getByRole('button', { name: 'Paytable' })).toBeDisabled()
      resolve(outcome())
      await waitFor(() => expect(screen.getByRole('button', { name: 'Paytable' })).toBeEnabled())
    })
  })

  it('deducts the bet at once and adds the win after (AC23, AC24)', async () => {
    const { spin, resolve } = held()
    render(<SlotGamePage spin={spin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }))
    expect(balanceText()).toHaveTextContent('999.00')
    resolve(outcome(25))
    await waitFor(() => expect(balanceText()).toHaveTextContent('1024.00'))
    expect(screen.getByText('Last win').nextSibling).toHaveTextContent('25.00')
  })
})
