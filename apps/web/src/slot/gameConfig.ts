// Mirrors services/api/src/spin/spin.constants.ts ALLOWED_BETS (no shared package between apps).
export const BET_STEPS = [1, 2, 3, 5, 10] as const
export const AUTOPLAY_COUNTS = [10, 20, 50, 100] as const

// Reel animation lengths from the approved design; turbo changes the animation only, never the result.
export const SPIN_MS = 1600
export const TURBO_SPIN_MS = 500
export const SPIN_TIMEOUT_MS = 10_000

// Fixed display values: jackpot pooling and payout are out of scope.
export const JACKPOT_TIERS = [
  { id: 'major-jackpot', name: 'Major jackpot', value: '$400.00' },
  { id: 'minor-jackpot', name: 'Minor jackpot', value: '$100.00' },
  { id: 'mix-jackpot', name: 'Mix jackpot', value: '$25.00' },
  { id: 'major-bonus', name: 'Major bonus', value: '$20.00' },
  { id: 'minor-bonus', name: 'Minor bonus', value: '$10.00' },
  { id: 'mix-bonus', name: 'Mix bonus', value: '$5.00' },
] as const

// The tier highlighted on a jackpot spin; the API does not say which tier was hit.
export const JACKPOT_HIT_TIER_ID = 'mix-jackpot'

export const formatCredits = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)

// Display copy only: sample multipliers from the approved design, not the server evaluator's table.
export const PAYTABLE_ROWS = [
  { id: 'miner', symbol: 'Pirate miner', pays: [10, 50, 250] },
  { id: 'cart', symbol: 'Gold cart', pays: [8, 30, 150] },
  { id: 'silver', symbol: 'Silver ore', pays: [5, 25, 120] },
  { id: 'gems', symbol: 'Green gems', pays: [5, 20, 100] },
  { id: 'lantern', symbol: 'Lantern', pays: [4, 15, 60] },
  { id: 'mine', symbol: 'Mine entrance', pays: [3, 10, 40] },
  { id: 'king-ace', symbol: 'K and A', pays: [2, 8, 30] },
  { id: 'ten', symbol: '10', pays: [1, 4, 15] },
] as const

export const RULES = [
  'The grid has 3 rows and 5 reels. Wins pay left to right on neighbouring reels.',
  'Choose a bet of 1, 2, 3, 5 or 10 credits with the minus and plus buttons. The bet is locked while reels spin.',
  'Autoplay runs 10, 20, 50 or 100 spins. It stops when the count ends, when you press autoplay again or when your credits no longer cover the bet.',
  'Turbo shortens the reel animation. It never changes the result.',
  'A jackpot spin shows a jackpot message and no win amount. Jackpot values on screen are fixed display values.',
  'If a spin fails, the reels stop. The bet stays deducted from your balance on screen.',
] as const
