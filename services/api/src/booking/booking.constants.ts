/** The visit fee is fixed: the same for every service. It is stored on each booking when made. */
export const VISIT_FEE = { amount: 35, currency: 'GBP' } as const;

/** Short zone name of an IANA time zone on a given day, for example GMT or CET. */
export function zoneLabel(day: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'short' }).formatToParts(
    new Date(`${day}T12:00:00Z`),
  );
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}
