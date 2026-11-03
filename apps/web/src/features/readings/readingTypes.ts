export interface ValueFieldLimits {
  key: 'value' | 'systolic' | 'diastolic'
  label: string
  unit: string
  min: number
  max: number
}

export interface ReadingTypeConfig {
  id: string
  label: string
  fields: ValueFieldLimits[]
}

export interface FieldValidation {
  valid: boolean
  blank: boolean
  message?: string
}

/** Same rules and message text as the API's validateReading. */
export function validateField(f: ValueFieldLimits, raw: string): FieldValidation {
  if (raw.trim() === '') return { valid: false, blank: true }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < f.min || n > f.max) {
    return { valid: false, blank: false, message: `Enter a value between ${f.min} and ${f.max} ${f.unit}.` }
  }
  return { valid: true, blank: false }
}

export const isValidDate = (date: string, today: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today

export function isFormValid(
  type: ReadingTypeConfig | undefined,
  raw: Record<string, string>,
  date: string,
  today: string,
): boolean {
  if (!type) return false
  return type.fields.every((f) => validateField(f, raw[f.key] ?? '').valid) && isValidDate(date, today)
}

/** YYYY-MM-DD in the device's local time. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
