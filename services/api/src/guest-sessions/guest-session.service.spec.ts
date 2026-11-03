import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { GuestSession, GuestSessionRepository } from './guest-session.types';
import { GuestSessionService } from './guest-session.service';

class FakeRepo implements GuestSessionRepository {
  created: GuestSession[] = [];
  private sessions = new Map<string, GuestSession>();
  private next = 0;

  async create(startingBalance: number) {
    const session = {
      id: `00000000-0000-4000-8000-${String(++this.next).padStart(12, '0')}`,
      balance: startingBalance,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    this.created.push(session);
    return session;
  }
  async find(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async claimTopUp(id: string, startingBalance: number) {
    const s = this.sessions.get(id);
    if (!s || s.balance >= 1) return null;
    s.balance = startingBalance;
    return s;
  }
  setBalance(id: string, balance: number) {
    this.sessions.get(id)!.balance = balance;
  }
}

const setup = () => {
  const repo = new FakeRepo();
  return { repo, svc: new GuestSessionService(repo, { startingBalance: 1000 }) };
};

describe('GuestSessionService', () => {
  it('creates a guest session without a cookie (AC1)', async () => {
    const { repo, svc } = setup();
    const { session, resumed } = await svc.startOrResume(undefined);
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(resumed).toBe(false);
    expect(repo.created).toHaveLength(1);
  });

  it('gives a new session the starting balance (AC2)', async () => {
    const { svc } = setup();
    expect((await svc.startOrResume(undefined)).session.balance).toBe(1000);
  });

  it('resumes the same session with its last balance (AC3)', async () => {
    const { repo, svc } = setup();
    const first = await svc.startOrResume(undefined);
    repo.setBalance(first.session.id, 240);
    const again = await svc.startOrResume(first.session.id);
    expect(again.session.id).toBe(first.session.id);
    expect(again.session.balance).toBe(240);
    expect(again.resumed).toBe(true);
  });

  it('starts new for an id this store never issued (AC4)', async () => {
    const { svc } = setup();
    const unknown = '00000000-0000-4000-8000-000000000000';
    const other = await svc.startOrResume(unknown);
    expect(other.resumed).toBe(false);
    expect(other.session.balance).toBe(1000);
    expect(other.session.id).not.toBe(unknown);
  });

  it('starts new for a malformed id without throwing (AC4)', async () => {
    const { svc } = setup();
    const other = await svc.startOrResume('not-a-uuid');
    expect(other.resumed).toBe(false);
  });

  it('flags top-up eligibility only below 1 (AC5, AC8)', async () => {
    const { repo, svc } = setup();
    const { session } = await svc.startOrResume(undefined);
    expect(svc.view(session, true).canClaimTopUp).toBe(false);
    repo.setBalance(session.id, 0);
    expect(svc.view((await repo.find(session.id))!, true).canClaimTopUp).toBe(true);
    repo.setBalance(session.id, 0.5);
    expect(svc.view((await repo.find(session.id))!, true).canClaimTopUp).toBe(true);
    repo.setBalance(session.id, 1);
    expect(svc.view((await repo.find(session.id))!, true).canClaimTopUp).toBe(false);
  });

  it('claim sets the balance to the starting balance (AC6)', async () => {
    const { repo, svc } = setup();
    const { session } = await svc.startOrResume(undefined);
    repo.setBalance(session.id, 0);
    expect((await svc.claimTopUp(session.id)).balance).toBe(1000);
  });

  it('refuses a claim at balance 1 or more (AC8)', async () => {
    const { repo, svc } = setup();
    const { session } = await svc.startOrResume(undefined);
    repo.setBalance(session.id, 1);
    expect((await svc.startOrResume(session.id)).session.balance).toBe(1);
    await expect(svc.claimTopUp(session.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a claim with a missing or unknown id', async () => {
    const { svc } = setup();
    await expect(svc.claimTopUp(undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      svc.claimTopUp('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
