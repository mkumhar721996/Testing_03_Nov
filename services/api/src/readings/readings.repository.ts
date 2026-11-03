export const READINGS_REPOSITORY = Symbol('READINGS_REPOSITORY');

export interface NewReading {
  tenantId: string;
  patientId: string;
  clientRequestId: string;
  type: string;
  values: Record<string, number>;
  date: string;
  note?: string;
}

export interface StoredReading extends NewReading {
  id: string;
  createdAt: Date;
}

export interface ReadingsRepository {
  /** Inserts, or returns the existing row when (tenantId, patientId, clientRequestId) already exists. */
  create(r: NewReading): Promise<{ reading: StoredReading; created: boolean }>;
}
