import { winningCells, winSummary } from './winCells'

const win4 = { payline: 0, symbol: 'S6' as const, count: 4 as const, win: 25 }

describe('winCells', () => {
  it('lists the first count cells of the payline', () => {
    expect([...winningCells([win4])].sort()).toEqual(['1-0', '1-1', '1-2', '1-3'])
  })

  it('follows a bent payline', () => {
    expect([...winningCells([{ payline: 3, symbol: 'S1', count: 3, win: 1 }])].sort()).toEqual(['0-0', '1-1', '2-2'])
  })

  it('summarises the highest-paying win', () => {
    expect(winSummary([win4])).toBe('on 4 of a kind: Picture 2')
  })

  it('appends the number of remaining lines', () => {
    const small = { payline: 1, symbol: 'S1' as const, count: 3 as const, win: 1 }
    expect(winSummary([small, win4, small])).toBe('on 4 of a kind: Picture 2 and 2 more')
  })
})
