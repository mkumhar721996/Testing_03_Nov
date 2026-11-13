import type { Account, AccountRepository, SignInAttempts } from './account.repository';

/** In-memory repository for unit tests. */
export class FakeAccountRepository implements AccountRepository {
  accounts: Account[] = [];
  sessions = new Map<string, { accountId: string; expiresAt: Date }>();
  attempts = new Map<string, SignInAttempts>();

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

  async getAttempts(email: string) {
    return this.attempts.get(email);
  }

  async recordFailure(email: string, now: Date, windowMs: number) {
    const prev = this.attempts.get(email);
    const fresh = prev && now.getTime() - prev.lastFailedAt.getTime() < windowMs;
    this.attempts.set(email, { failedCount: fresh ? prev.failedCount + 1 : 1, lastFailedAt: now });
  }

  async clearAttempts(email: string) {
    this.attempts.delete(email);
  }
}
