import { randomUUID } from 'node:crypto';
import type { NewReading, ReadingsRepository, StoredReading } from './readings.repository';

/** Test double for the repository port; not bound in any module. */
export class InMemoryReadingsRepository implements ReadingsRepository {
  private readonly rows = new Map<string, StoredReading>();

  async create(r: NewReading): Promise<{ reading: StoredReading; created: boolean }> {
    const key = `${r.tenantId}|${r.patientId}|${r.clientRequestId}`;
    const existing = this.rows.get(key);
    if (existing) return { reading: existing, created: false };
    const reading: StoredReading = { ...r, id: randomUUID(), createdAt: new Date() };
    this.rows.set(key, reading);
    return { reading, created: true };
  }

  count(): number {
    return this.rows.size;
  }
}
