import type { Account, AccountRepository, SignInAttempts } from './account.repository';

/** In-memory repository for unit tests. */
export class FakeAccountRepository implements AccountRepository {
  accounts: Account[] = [];
  sessions = new Map<string, { accountId: string; expiresAt: Date }>();
  attempts = new Map<string, SignInAttempts>();

  async create(account: Account) {
    if (await this.findByEmail(account.email)) return false;
    this.accounts.push({ ...account });
    return true;
  }

  async findByEmail(email: string) {
    return this.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { accountId, expiresAt });
  }

  async findSession(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return undefined;
    return this.accounts.find((a) => a.id === session.accountId);
  }

  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async getAttempts(email: string) {
    return this.attempts.get(email);
  }

  // No await inside, so the read and write cannot interleave with another call.
  async reserveAttempt(email: string, now: Date, max: number, windowMs: number) {
    const current = this.attempts.get(email);
    if (current && now.getTime() - current.lastFailedAt.getTime() < windowMs) {
      if (current.failedCount >= max) return false;
      this.attempts.set(email, { failedCount: current.failedCount + 1, lastFailedAt: now });
      return true;
    }
    this.attempts.set(email, { failedCount: 1, lastFailedAt: now });
    return true;
  }

  async clearAttempts(email: string) {
    this.attempts.delete(email);
  }
}
