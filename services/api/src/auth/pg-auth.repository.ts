import type { Pool } from 'pg';
import type { AuthRepository, SessionUser, UserRecord } from './auth.repository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
}

function toUser(r: UserRow): UserRecord {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    failedAttempts: r.failed_attempts,
    lockedUntil: r.locked_until,
  };
}

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1)', [
      email,
    ]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async createUser(u: { id: string; email: string; name: string; passwordHash: string }): Promise<void> {
    await this.pool.query('INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)', [
      u.id,
      u.email,
      u.name,
      u.passwordHash,
    ]);
  }

  async recordFailedAttempt(userId: string, now: Date, maxAttempts: number, lockMs: number) {
    // One statement: the row lock serialises concurrent attempts, so the count cannot be lost.
    const { rows } = await this.pool.query<{ failed_attempts: number; locked_until: Date | null }>(
      `UPDATE users SET
         failed_attempts = n.attempts,
         locked_until = CASE
           WHEN n.running_lock THEN n.current_lock
           WHEN n.attempts >= $3 THEN $2::timestamptz + ($4::double precision * interval '1 millisecond')
           ELSE NULL END
       FROM (
         SELECT id, locked_until AS current_lock,
                (locked_until IS NOT NULL AND locked_until > $2::timestamptz) AS running_lock,
                CASE
                  WHEN locked_until IS NOT NULL AND locked_until > $2::timestamptz THEN failed_attempts
                  WHEN locked_until IS NOT NULL THEN 1
                  ELSE failed_attempts + 1 END AS attempts
         FROM users WHERE id = $1 FOR UPDATE
       ) n
       WHERE users.id = n.id
       RETURNING users.failed_attempts, users.locked_until`,
      [userId, now, maxAttempts, lockMs],
    );
    if (!rows[0]) throw new Error('Unknown user');
    return { failedAttempts: rows[0].failed_attempts, lockedUntil: rows[0].locked_until };
  }

  async clearFailures(userId: string): Promise<void> {
    await this.pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [
      userId,
    ]);
  }

  async createSession(s: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void> {
    await this.pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      s.tokenHash,
      s.userId,
      s.expiresAt,
    ]);
  }

  async findSession(tokenHash: string, now: Date) {
    const { rows } = await this.pool.query<{
      id: string;
      email: string;
      name: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT u.id, u.email, u.name, s.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    const r = rows[0];
    if (!r) return null;
    const user: SessionUser = { id: r.id, email: r.email, name: r.name };
    return { user, createdAt: r.created_at, expiresAt: r.expires_at };
  }

  async touchSession(tokenHash: string, now: Date, expiresAt: Date): Promise<void> {
    await this.pool.query('UPDATE sessions SET last_seen_at = $2, expires_at = $3 WHERE token_hash = $1', [
      tokenHash,
      now,
      expiresAt,
    ]);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async deleteSessionsForUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async createResetToken(t: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void> {
    await this.pool.query(
      'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [t.tokenHash, t.userId, t.expiresAt],
    );
  }

  async consumeResetToken(tokenHash: string, now: Date): Promise<string | null> {
    // Single statement: of two concurrent uses exactly one matches `used_at IS NULL`.
    const { rows } = await this.pool.query<{ user_id: string }>(
      `UPDATE password_reset_tokens SET used_at = $2
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
       RETURNING user_id`,
      [tokenHash, now],
    );
    return rows[0]?.user_id ?? null;
  }

  async resetTokenState(tokenHash: string, now: Date): Promise<'valid' | 'invalid'> {
    const { rowCount } = await this.pool.query(
      'SELECT 1 FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2',
      [tokenHash, now],
    );
    return rowCount ? 'valid' : 'invalid';
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId, passwordHash],
    );
  }
}
