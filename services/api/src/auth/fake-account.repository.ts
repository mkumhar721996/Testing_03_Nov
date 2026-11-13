import type { Account, AccountRepository } from './account.repository';

/** In-memory repository for unit tests. */
export class FakeAccountRepository implements AccountRepository {
  accounts: Account[] = [];
  sessions = new Map<string, { accountId: string; expiresAt: Date }>();
  attempts = new Map<string, { count: number; at: Date }>();

  async create(account: Account) {
    if (this.accounts.some((a) => a.email.toLowerCase() === account.email.toLowerCase())) return false;
    this.accounts.push(account);
    return true;
  }

  async findByEmail(email: string) {
    return this.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  async findById(id: string) {
    return this.accounts.find((a) => a.id === id);
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { accountId, expiresAt });
  }

  async findSession(tokenHash: string, now: Date) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) return undefined;
    return this.findById(s.accountId);
  }

  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async reserveAttempt(email: string, now: Date, windowMs: number, max: number) {
    const prev = this.attempts.get(email);
    if (!prev || now.getTime() - prev.at.getTime() >= windowMs) {
      this.attempts.set(email, { count: 1, at: now });
      return 1;
    }
    if (prev.count > max) return prev.count;
    const count = prev.count + 1;
    this.attempts.set(email, { count, at: count <= max ? now : prev.at });
    return count;
  }

  async deleteExpiredSessions(now: Date) {
    for (const [hash, s] of this.sessions) if (s.expiresAt <= now) this.sessions.delete(hash);
  }

  async clearAttempts(email: string) {
    this.attempts.delete(email);
  }
}
