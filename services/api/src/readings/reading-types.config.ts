export const READING_TYPES_TOKEN = Symbol('READING_TYPES');

export type ReadingTypeId = string;

export interface ValueFieldLimits {
  key: 'value' | 'systolic' | 'diastolic';
  label: string;
  unit: string;
  min: number;
  max: number;
}

/** One value field, or two for Blood pressure (systolic and diastolic). */
export interface ReadingTypeConfig {
  id: ReadingTypeId;
  label: string;
  fields: ValueFieldLimits[];
}

/**
 * Single source of truth for reading types; the web form reads it from GET /reading-types.
 *
 * BLOCKED ON PRODUCT: the id, minimum, maximum and unit of every reading type must be
 * supplied by Product/Domain experts. They are deliberately not guessed here, so the list
 * is empty until they arrive. Add one entry per type, e.g.
 * `{ id, label, fields: [{ key: 'value', label: 'Value', unit, min, max }] }`.
 */
export const READING_TYPES: ReadingTypeConfig[] = [];
