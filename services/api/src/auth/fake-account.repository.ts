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

  async recordFailure(email: string, now: Date) {
    const current = this.attempts.get(email);
    this.attempts.set(email, { failedCount: (current?.failedCount ?? 0) + 1, lastFailedAt: now });
  }

  async clearAttempts(email: string) {
    this.attempts.delete(email);
  }
}
