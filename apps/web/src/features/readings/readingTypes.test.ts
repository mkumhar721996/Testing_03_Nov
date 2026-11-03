import { describe, expect, it } from 'vitest'
import { isFormValid, todayLocal, validateField, type ReadingTypeConfig } from './readingTypes'

// Fixture limits only: the real ones are served by the API and owned by Product.
const field = { key: 'value', label: 'Value', unit: 'fx', min: 10, max: 20 } as const
const single: ReadingTypeConfig = { id: 'fx', label: 'Fixture', fields: [field] }
const pair: ReadingTypeConfig = {
  id: 'fp',
  label: 'Pair',
  fields: [
    { key: 'systolic', label: 'Systolic', unit: 'fxp', min: 50, max: 100 },
    { key: 'diastolic', label: 'Diastolic', unit: 'fxp', min: 30, max: 60 },
  ],
}

describe('validateField', () => {
  it('accepts min, max and a middle value', () => {
    for (const raw of ['10', '20', '15', '12.5']) expect(validateField(field, raw).valid).toBe(true)
  })

  it('rejects below min and above max with range and unit', () => {
    const message = 'Enter a value between 10 and 20 fx.'
    expect(validateField(field, '9')).toEqual({ valid: false, blank: false, message })
    expect(validateField(field, '21')).toEqual({ valid: false, blank: false, message })
  })

  it('reports blank and non-numeric input', () => {
    expect(validateField(field, '')).toMatchObject({ valid: false, blank: true })
    expect(validateField(field, '  ')).toMatchObject({ valid: false, blank: true })
    expect(validateField(field, 'abc')).toMatchObject({ valid: false, blank: false })
  })
})

describe('isFormValid', () => {
  const today = '2026-11-03'
  it('is false with no type or blank value', () => {
    expect(isFormValid(undefined, {}, today, today)).toBe(false)
    expect(isFormValid(single, { value: '' }, today, today)).toBe(false)
  })

  it('requires both Blood-pressure-style fields', () => {
    expect(isFormValid(pair, { systolic: '60' }, today, today)).toBe(false)
    expect(isFormValid(pair, { systolic: '60', diastolic: '40' }, today, today)).toBe(true)
  })

  it('is false for out-of-range values and true when in range', () => {
    expect(isFormValid(single, { value: '21' }, today, today)).toBe(false)
    expect(isFormValid(single, { value: '15' }, today, today)).toBe(true)
  })

  it('is false for a future or empty date', () => {
    expect(isFormValid(single, { value: '15' }, '2026-11-04', today)).toBe(false)
    expect(isFormValid(single, { value: '15' }, '', today)).toBe(false)
  })
})

describe('todayLocal', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(todayLocal(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03')
  })
})
