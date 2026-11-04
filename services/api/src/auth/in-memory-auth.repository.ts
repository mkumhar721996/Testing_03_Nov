import type { AuthRepository, SessionUser, UserRecord } from './auth.repository';

interface SessionRow {
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

interface ResetRow {
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

/** Test support: the same rules as the Postgres adapter, without a database. */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, SessionRow>();
  private readonly resets = new Map<string, ResetRow>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const found = [...this.users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase());
    return found ? { ...found } : null;
  }

  async createUser(u: { id: string; email: string; name: string; passwordHash: string }) {
    if (await this.findUserByEmail(u.email)) throw new Error('Email already exists');
    this.users.set(u.id, { ...u, failedAttempts: 0, lockedUntil: null });
  }

  async recordFailedAttempt(userId: string, now: Date, maxAttempts: number, lockMs: number) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Unknown user');
    if (user.lockedUntil && user.lockedUntil > now) {
      return { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil };
    }
    user.failedAttempts = (user.lockedUntil ? 0 : user.failedAttempts) + 1;
    user.lockedUntil =
      user.failedAttempts >= maxAttempts ? new Date(now.getTime() + lockMs) : null;
    return { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil };
  }

  async clearFailures(userId: string) {
    const user = this.users.get(userId);
    if (user) Object.assign(user, { failedAttempts: 0, lockedUntil: null });
  }

  async createSession(s: { tokenHash: string; userId: string; expiresAt: Date }) {
    this.sessions.set(s.tokenHash, {
      userId: s.userId,
      createdAt: this.clock(),
      expiresAt: s.expiresAt,
    });
  }

  async findSession(tokenHash: string, now: Date) {
    const row = this.sessions.get(tokenHash);
    const user = row && this.users.get(row.userId);
    if (!row || !user || row.expiresAt <= now) return null;
    const sessionUser: SessionUser = { id: user.id, email: user.email, name: user.name };
    return { user: sessionUser, createdAt: row.createdAt, expiresAt: row.expiresAt };
  }

  async touchSession(tokenHash: string, _now: Date, expiresAt: Date) {
    const row = this.sessions.get(tokenHash);
    if (row) row.expiresAt = expiresAt;
  }

  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async deleteSessionsForUser(userId: string) {
    for (const [hash, row] of this.sessions) if (row.userId === userId) this.sessions.delete(hash);
  }

  async createResetToken(t: { tokenHash: string; userId: string; expiresAt: Date }) {
    this.resets.set(t.tokenHash, { userId: t.userId, expiresAt: t.expiresAt, usedAt: null });
  }

  async consumeResetToken(tokenHash: string, now: Date) {
    const row = this.resets.get(tokenHash);
    if (!row || row.usedAt || row.expiresAt <= now) return null;
    row.usedAt = now;
    return row.userId;
  }

  async resetTokenState(tokenHash: string, now: Date) {
    const row = this.resets.get(tokenHash);
    return row && !row.usedAt && row.expiresAt > now ? 'valid' : 'invalid';
  }

  async updatePassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (user) Object.assign(user, { passwordHash, failedAttempts: 0, lockedUntil: null });
  }

  // Inspection helpers for tests.
  sessionCount(): number {
    return this.sessions.size;
  }

  get tokenHashes(): string[] {
    return [...this.resets.keys()];
  }
}
