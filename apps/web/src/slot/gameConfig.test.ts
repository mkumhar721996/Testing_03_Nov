import { AUTOPLAY_COUNTS, BET_STEPS, JACKPOT_TIERS, formatCredits } from './gameConfig'

describe('gameConfig', () => {
  it('has the story bet steps and autoplay counts (AC25)', () => {
    expect([...BET_STEPS]).toEqual([1, 2, 3, 5, 10])
    expect([...AUTOPLAY_COUNTS]).toEqual([10, 20, 50, 100])
  })

  it('has six jackpot tiers with fixed display values (AC17)', () => {
    expect(JACKPOT_TIERS.map((t) => t.value)).toEqual(['$400.00', '$100.00', '$25.00', '$20.00', '$10.00', '$5.00'])
  })

  it('formats credits as plain numbers (AC1-AC5)', () => {
    expect(formatCredits(2)).toBe('2')
    expect(formatCredits(1024)).toBe('1,024')
    expect(formatCredits(0.3)).toBe('0.3')
  })
})
