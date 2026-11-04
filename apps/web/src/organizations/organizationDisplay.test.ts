import { displayValue, formatCreated } from './organizationDisplay'

describe('displayValue', () => {
  it.each([null, undefined, '', '  '])('shows a dash for %j', (v) => {
    expect(displayValue(v)).toBe('-')
  })

  it('returns a present value unchanged', () => {
    expect(displayValue('12 Main St')).toBe('12 Main St')
  })
})

describe('formatCreated', () => {
  it('formats an ISO timestamp as a locale date', () => {
    expect(formatCreated('2026-01-02T12:00:00.000Z')).toBe(new Date('2026-01-02T12:00:00.000Z').toLocaleDateString())
  })
})
