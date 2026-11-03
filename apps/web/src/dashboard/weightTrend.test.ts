import { toTrendPoints } from './weightTrend'

const now = new Date('2026-11-03T12:00:00')
const r = (recordedAt: string, weightKg: number) => ({ recordedAt, weightKg })

describe('toTrendPoints', () => {
  it('plots readings in the last 30 days, oldest first (AC1)', () => {
    const pts = toTrendPoints([r('2026-11-01T08:00:00', 79), r('2026-10-20T08:00:00', 80)], now)
    expect(pts.map((p) => p.weightKg)).toEqual([80, 79])
  })

  it('drops a reading from 31 days ago (AC2)', () => {
    expect(toTrendPoints([r('2026-10-03T08:00:00', 82)], now)).toEqual([])
  })

  it('collapses a day to its latest reading (AC5)', () => {
    const pts = toTrendPoints([r('2026-11-02T19:00:00', 80.4), r('2026-11-02T07:00:00', 81)], now)
    expect(pts).toEqual([{ day: '2026-11-02', weightKg: 80.4 }])
  })

  it('keeps a single reading as one point (AC6)', () => {
    expect(toTrendPoints([r('2026-11-02T07:00:00', 81)], now)).toHaveLength(1)
  })
})
