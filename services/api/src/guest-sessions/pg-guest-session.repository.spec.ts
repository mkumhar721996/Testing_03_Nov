import { describe, expect, it } from 'vitest';
import { PgGuestSessionRepository } from './pg-guest-session.repository';

const createdAt = new Date('2026-01-01T00:00:00Z');

function fakePool(rows: unknown[]) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows };
    },
  };
  return { calls, repo: new PgGuestSessionRepository(pool as never) };
}

describe('PgGuestSessionRepository', () => {
  it('inserts with the starting balance and maps the row', async () => {
    const { calls, repo } = fakePool([{ id: 'id-1', balance: 1000, created_at: createdAt }]);
    expect(await repo.create(1000)).toEqual({ id: 'id-1', balance: 1000, createdAt });
    expect(calls[0].params).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), 1000]);
  });

  it('maps a stored row with balance 0', async () => {
    const { calls, repo } = fakePool([{ id: 'id-1', balance: 0, created_at: createdAt }]);
    expect(await repo.find('id-1')).toEqual({ id: 'id-1', balance: 0, createdAt });
    expect(calls[0].params).toEqual(['id-1']);
  });

  it('returns null when not found', async () => {
    expect(await fakePool([]).repo.find('x')).toBeNull();
  });

  it('claims a top-up atomically only where balance < 1', async () => {
    const { calls, repo } = fakePool([{ id: 'id-1', balance: 1000, created_at: createdAt }]);
    expect((await repo.claimTopUp('id-1', 1000))?.balance).toBe(1000);
    expect(calls[0].sql).toContain('WHERE id = $1 AND balance < 1');
    expect(calls[0].params).toEqual(['id-1', 1000]);
  });

  it('returns null when not eligible for a top-up', async () => {
    expect(await fakePool([]).repo.claimTopUp('id-1', 1000)).toBeNull();
  });
});
