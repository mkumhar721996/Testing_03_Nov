import type { Pool } from 'pg';
import type { Account, AccountRepository, SignInAttempts } from './account.repository';
import type { Role } from './auth.constants';

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
}

const toAccount = (r: AccountRow): Account => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role,
});

export class PgAccountRepository implements AccountRepository {
  constructor(private readonly pool: Pool) {}

  async create(a: Account): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'INSERT INTO accounts (id, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [a.id, a.email, a.passwordHash, a.role],
    );
    return rowCount === 1;
  }

  async findByEmail(email: string) {
    const { rows } = await this.pool.query<AccountRow>(
      'SELECT id, email, password_hash, role FROM accounts WHERE lower(email) = lower($1)',
      [email],
    );
    return rows[0] && toAccount(rows[0]);
  }

  async findById(id: string) {
    const { rows } = await this.pool.query<AccountRow>(
      'SELECT id, email, password_hash, role FROM accounts WHERE id = $1',
      [id],
    );
    return rows[0] && toAccount(rows[0]);
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: Date) {
    await this.pool.query('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)', [
      tokenHash,
      accountId,
      expiresAt,
    ]);
  }

  async findSession(tokenHash: string, now: Date) {
    const { rows } = await this.pool.query<AccountRow>(
      `SELECT a.id, a.email, a.password_hash, a.role FROM sessions s
         JOIN accounts a ON a.id = s.account_id
        WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    return rows[0] && toAccount(rows[0]);
  }

  async deleteSession(tokenHash: string) {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async getAttempts(email: string): Promise<SignInAttempts | undefined> {
    const { rows } = await this.pool.query<{ failed_count: number; last_failed_at: Date }>(
      'SELECT failed_count, last_failed_at FROM sign_in_attempts WHERE email = $1',
      [email],
    );
    return rows[0] && { failedCount: rows[0].failed_count, lastFailedAt: rows[0].last_failed_at };
  }

  async recordFailure(email: string, now: Date, windowMs: number) {
    await this.pool.query(
      `INSERT INTO sign_in_attempts (email, failed_count, last_failed_at) VALUES ($1, 1, $2)
       ON CONFLICT (email) DO UPDATE SET
         failed_count = CASE WHEN $2::timestamptz - sign_in_attempts.last_failed_at < ($3 * interval '1 millisecond')
                             THEN sign_in_attempts.failed_count + 1 ELSE 1 END,
         last_failed_at = $2`,
      [email, now, windowMs],
    );
  }

  async clearAttempts(email: string) {
    await this.pool.query('DELETE FROM sign_in_attempts WHERE email = $1', [email]);
  }
}
