export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-11-12" -> "12 Nov 2026" (no Date, so no time-zone shift). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** [1, 2, 3, 5] -> "Mon, Tue, Wed, Fri" */
export function formatWorkingDays(days: number[]): string {
  return days.length ? days.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ') : 'Not set'
}
