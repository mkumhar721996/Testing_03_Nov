import type { ApiSymbol } from './symbols'

export interface PaytableView {
  /** Payouts are multiples of the per-payline stake. */
  symbols: { symbol: ApiSymbol; payouts: { 3: number; 4: number; 5: number } }[]
  rules: { wild: string; scatter: string }
}

export async function fetchPaytable(signal?: AbortSignal): Promise<PaytableView> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/paytable`, { signal })
  if (!res.ok) throw new Error(`Paytable failed: ${res.status}`)
  return (await res.json()) as PaytableView
}
