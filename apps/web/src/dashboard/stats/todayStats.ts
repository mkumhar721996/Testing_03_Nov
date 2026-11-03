export type ReadingType = 'weight' | 'bloodPressure' | 'bloodSugar' | 'heartRate' | 'steps'

export interface Reading {
  id: string
  type: ReadingType
  /** ISO instant */
  loggedAt: string
  value?: number
  systolic?: number
  diastolic?: number
}

export const READING_TYPES: ReadingType[] = ['weight', 'bloodPressure', 'bloodSugar', 'heartRate', 'steps']

interface Range {
  min: number
  max: number
}

// Plausible ranges are an unconfirmed assumption; bounds are inclusive.
export const PLAUSIBLE_RANGE: Record<Exclude<ReadingType, 'bloodPressure'>, Range> & {
  systolic: Range
  diastolic: Range
} = {
  weight: { min: 20, max: 300 },
  bloodSugar: { min: 2, max: 30 },
  heartRate: { min: 30, max: 220 },
  steps: { min: 0, max: 100000 },
  systolic: { min: 70, max: 250 },
  diastolic: { min: 40, max: 150 },
}

const META: Record<ReadingType, { label: string; unit: string }> = {
  weight: { label: 'Weight', unit: 'kg' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg' },
  bloodSugar: { label: 'Blood sugar', unit: 'mmol/L' },
  heartRate: { label: 'Heart rate', unit: 'bpm' },
  steps: { label: 'Steps', unit: 'steps' },
}

export function localDayBounds(now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function isOnLocalDay(loggedAt: string, now: Date): boolean {
  const t = new Date(loggedAt).getTime()
  const { from, to } = localDayBounds(now)
  return t >= new Date(from).getTime() && t < new Date(to).getTime()
}

export function latestPerType(readings: Reading[], now: Date): Record<ReadingType, Reading | undefined> {
  const result: Record<ReadingType, Reading | undefined> = {
    weight: undefined,
    bloodPressure: undefined,
    bloodSugar: undefined,
    heartRate: undefined,
    steps: undefined,
  }
  for (const r of readings) {
    if (!isOnLocalDay(r.loggedAt, now)) continue
    const current = result[r.type]
    if (!current || new Date(r.loggedAt).getTime() > new Date(current.loggedAt).getTime()) result[r.type] = r
  }
  return result
}

const outside = (n: number | undefined, range: Range) => n === undefined || n < range.min || n > range.max

export function isOutOfRange(r: Reading): boolean {
  if (r.type === 'bloodPressure') {
    return outside(r.systolic, PLAUSIBLE_RANGE.systolic) || outside(r.diastolic, PLAUSIBLE_RANGE.diastolic)
  }
  return outside(r.value, PLAUSIBLE_RANGE[r.type])
}

function format(r: Reading): string {
  switch (r.type) {
    case 'bloodPressure':
      return `${r.systolic}/${r.diastolic}`
    case 'weight':
    case 'bloodSugar':
      return (r.value ?? 0).toFixed(1)
    case 'steps':
      return (r.value ?? 0).toLocaleString('en-US')
    default:
      return String(r.value)
  }
}

export function tileModel(type: ReadingType, latest: Reading | undefined) {
  const { label, unit } = META[type]
  if (!latest) {
    return type === 'steps'
      ? { label, display: '0', unit, empty: false, flagged: false }
      : { label, display: '—', unit, empty: true, flagged: false }
  }
  return { label, display: format(latest), unit, empty: false, flagged: isOutOfRange(latest) }
}
