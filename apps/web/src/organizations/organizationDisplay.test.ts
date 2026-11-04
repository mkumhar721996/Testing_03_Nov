import { displayValue } from './organizationDisplay'

describe('displayValue', () => {
  it.each([null, undefined, '', '  '])('shows a dash for %j (AC15)', (v) => {
    expect(displayValue(v)).toBe('-')
  })

  it('returns a present value unchanged', () => {
    expect(displayValue('12 Main St')).toBe('12 Main St')
  })
})
