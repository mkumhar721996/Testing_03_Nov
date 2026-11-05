import type { PaylineWin } from './spinApi'
import { symbolView } from './symbols'

// Mirrors services/api/src/spin/spin.constants.ts PAYLINES (row index per reel; no shared package).
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0],
]

/** Winning cells as "row-reel" keys, both zero-based. */
export function winningCells(wins: PaylineWin[]): Set<string> {
  const cells = new Set<string>()
  for (const { payline, count } of wins) {
    PAYLINES[payline].slice(0, count).forEach((row, reel) => cells.add(`${row}-${reel}`))
  }
  return cells
}

export function winSummary(wins: PaylineWin[]): string {
  if (wins.length === 0) return ''
  const best = wins.reduce((a, b) => (b.win > a.win ? b : a))
  const more = wins.length > 1 ? ` and ${wins.length - 1} more` : ''
  return `on ${best.count} of a kind: ${symbolView(best.symbol).label}${more}`
}
