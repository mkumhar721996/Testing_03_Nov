import { isOnLocalDay, isOutOfRange, latestPerType, localDayBounds, tileModel, type Reading } from './todayStats'

const now = new Date(2026, 10, 3, 12, 0)
const at = (h: number, m = 0) => new Date(2026, 10, 3, h, m).toISOString()
const w = (value: number, h: number): Reading => ({ id: `w${h}`, type: 'weight', loggedAt: at(h), value })

describe('local day', () => {
  it('bounds are local midnight to next local midnight (AC10)', () => {
    const { from, to } = localDayBounds(now)
    expect(from).toBe(new Date(2026, 10, 3, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 10, 4, 0, 0, 0, 0).toISOString())
  })

  it('filters around midnight (AC10)', () => {
    expect(isOnLocalDay(new Date(2026, 10, 3, 0, 0, 0).toISOString(), now)).toBe(true)
    expect(isOnLocalDay(new Date(2026, 10, 3, 23, 59, 59).toISOString(), now)).toBe(true)
    expect(isOnLocalDay(new Date(2026, 10, 2, 23, 59, 59).toISOString(), now)).toBe(false)
    expect(isOnLocalDay(new Date(2026, 10, 4, 0, 0, 0).toISOString(), now)).toBe(false)
  })
})

describe('latestPerType', () => {
  it('picks the latest by loggedAt, not array order (AC9)', () => {
    const r = latestPerType([w(70, 8), w(72, 19), w(71, 12)], now)
    expect(r.weight?.value).toBe(72)
    expect(r.heartRate).toBeUndefined()
  })

  it('ignores readings from other days (AC10)', () => {
    const yesterday = { id: 'y', type: 'weight' as const, loggedAt: new Date(2026, 10, 2, 23, 59).toISOString(), value: 80 }
    expect(latestPerType([yesterday], now).weight).toBeUndefined()
  })
})

describe('isOutOfRange', () => {
  it('flags values outside the range (AC5)', () => {
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: at(9), value: 250 })).toBe(true)
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: at(9), value: 10 })).toBe(true)
  })

  it('flags blood pressure when either part is outside (AC5)', () => {
    expect(isOutOfRange({ id: 'a', type: 'bloodPressure', loggedAt: at(9), systolic: 300, diastolic: 80 })).toBe(true)
    expect(isOutOfRange({ id: 'a', type: 'bloodPressure', loggedAt: at(9), systolic: 120, diastolic: 20 })).toBe(true)
  })

  it('does not flag in-range values, boundaries inclusive (AC6)', () => {
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: at(9), value: 68 })).toBe(false)
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: at(9), value: 30 })).toBe(false)
    expect(isOutOfRange({ id: 'a', type: 'heartRate', loggedAt: at(9), value: 220 })).toBe(false)
    expect(isOutOfRange({ id: 'a', type: 'bloodPressure', loggedAt: at(9), systolic: 120, diastolic: 80 })).toBe(false)
  })
})

describe('tileModel', () => {
  it('shows a dash and empty for missing non-steps types (AC7)', () => {
    expect(tileModel('weight', undefined)).toMatchObject({ display: '—', empty: true, flagged: false })
  })

  it('shows 0 and not empty for missing steps (AC8)', () => {
    expect(tileModel('steps', undefined)).toMatchObject({ display: '0', empty: false, flagged: false })
  })

  it('formats figures (AC2)', () => {
    expect(tileModel('weight', w(72.4, 9)).display).toBe('72.4')
    expect(tileModel('bloodPressure', { id: 'b', type: 'bloodPressure', loggedAt: at(9), systolic: 120, diastolic: 80 }).display).toBe('120/80')
    expect(tileModel('steps', { id: 's', type: 'steps', loggedAt: at(9), value: 8200 }).display).toBe('8,200')
  })

  it('flags an out-of-range latest reading (AC5)', () => {
    expect(tileModel('heartRate', { id: 'h', type: 'heartRate', loggedAt: at(9), value: 250 })).toMatchObject({
      display: '250',
      flagged: true,
    })
  })
})
