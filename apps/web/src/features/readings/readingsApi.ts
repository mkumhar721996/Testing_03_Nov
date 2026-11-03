import type { ReadingTypeConfig } from './readingTypes'

export interface SaveReadingBody {
  clientRequestId: string
  type: string
  values: Record<string, number>
  date: string
  note?: string
}

export type SaveErrorKind = 'offline' | 'failed' | 'invalid'

export class SaveError extends Error {
  constructor(
    readonly kind: SaveErrorKind,
    readonly field?: string,
    message?: string,
  ) {
    super(message ?? kind)
    this.name = 'SaveError'
  }
}

export async function fetchReadingTypes(): Promise<ReadingTypeConfig[]> {
  const res = await fetch('/reading-types')
  if (!res.ok) throw new Error(`Could not load reading types (${res.status})`)
  return res.json()
}

export async function saveReading(body: SaveReadingBody): Promise<void> {
  if (navigator.onLine === false) throw new SaveError('offline')
  let res: Response
  try {
    res = await fetch('/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new SaveError('failed')
  }
  if (res.ok) return
  if (res.status === 400) {
    const detail = await res.json().catch(() => undefined)
    if (detail?.field && detail?.message) throw new SaveError('invalid', detail.field, detail.message)
  }
  throw new SaveError('failed')
}
