import { SYMBOL_LABELS, symbolView, type ApiSymbol } from './symbols'

const ALL: ApiSymbol[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'WILD', 'SCATTER']

describe('symbols', () => {
  it('maps every API symbol to one of the 10 game labels (AC3)', () => {
    for (const s of ALL) expect(SYMBOL_LABELS).toContain(symbolView(s).label)
    expect(SYMBOL_LABELS).toHaveLength(10)
  })
})
