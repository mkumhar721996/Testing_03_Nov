/** The same standard windows are offered every day. */
export const WINDOWS = ['08:00-11:00', '11:00-14:00', '14:00-17:00'] as const;
export type SlotWindow = (typeof WINDOWS)[number];

/** Upper bound for a day's visit limit; matches the Slot capacity screen's input. */
export const MAX_VISIT_LIMIT = 200;
