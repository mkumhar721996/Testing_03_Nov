export type ApiSymbol = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10' | 'WILD' | 'SCATTER'

export const SYMBOL_LABELS = ['A', 'K', 'Q', 'J', 'Picture 1', 'Picture 2', 'Picture 3', 'Picture 4', 'Wild', 'Scatter']

export type SymbolTint = 'a' | 'k' | 'q' | 'j' | 'p1' | 'p2' | 'p3' | 'p4' | 'wild' | 'scatter'
export type SymbolIcon = 'letter' | 'picture' | 'wild' | 'scatter'

export interface SymbolView {
  label: string
  tint: SymbolTint
  icon: SymbolIcon
}

const view = (label: string, tint: SymbolTint, icon: SymbolIcon): SymbolView => ({ label, tint, icon })

// The API has 12 symbols, the game shows 10 labels. S1-S8 map in order; S9 and S10 reuse
// Picture 3 and Picture 4 until the designer assigns them labels.
const VIEWS: Record<ApiSymbol, SymbolView> = {
  S1: view('A', 'a', 'letter'),
  S2: view('K', 'k', 'letter'),
  S3: view('Q', 'q', 'letter'),
  S4: view('J', 'j', 'letter'),
  S5: view('Picture 1', 'p1', 'picture'),
  S6: view('Picture 2', 'p2', 'picture'),
  S7: view('Picture 3', 'p3', 'picture'),
  S8: view('Picture 4', 'p4', 'picture'),
  S9: view('Picture 3', 'p3', 'picture'),
  S10: view('Picture 4', 'p4', 'picture'),
  WILD: view('Wild', 'wild', 'wild'),
  SCATTER: view('Scatter', 'scatter', 'scatter'),
}

export function symbolView(symbol: ApiSymbol): SymbolView {
  return VIEWS[symbol]
}
