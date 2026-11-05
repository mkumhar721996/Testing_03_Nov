import { render, screen } from '@testing-library/react'
import { JackpotPanel } from './JackpotPanel'
import { JACKPOT_TIERS } from './gameConfig'

describe('JackpotPanel', () => {
  it('shows six tiers, each with its fixed display value (AC17)', () => {
    render(<JackpotPanel hit={false} />)
    const tiers = screen.getAllByTestId('jackpot-tier')
    expect(tiers).toHaveLength(6)
    JACKPOT_TIERS.forEach((t, i) => {
      expect(tiers[i]).toHaveTextContent(t.name)
      expect(tiers[i]).toHaveTextContent(t.value)
    })
  })

  it('highlights a tier only on a jackpot spin (AC29)', () => {
    const { rerender } = render(<JackpotPanel hit={false} />)
    expect(document.querySelector('.is-hit')).toBeNull()
    rerender(<JackpotPanel hit />)
    expect(document.querySelectorAll('.is-hit')).toHaveLength(1)
  })
})
