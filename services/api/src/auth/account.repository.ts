import type { Role } from './auth.constants';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface AccountRepository {
  /** Returns false when an account for the email already exists (case-insensitive). */
  create(account: Account): Promise<boolean>;
  findByEmail(email: string): Promise<Account | undefined>;
  findById(id: string): Promise<Account | undefined>;
  createSession(tokenHash: string, accountId: string, expiresAt: Date): Promise<void>;
  /** Undefined when the session is unknown or expired at `now`. */
  findSession(tokenHash: string, now: Date): Promise<Account | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
  /**
   * Atomically reserves a sign-in attempt and returns the resulting count. The count restarts at 1
   * when the previous reserved attempt is older than `windowMs`, and stops at `max + 1` (a locked
   * attempt neither grows it further nor moves the window). A count above `max` means locked.
   */
  reserveAttempt(email: string, now: Date, windowMs: number, max: number): Promise<number>;
  /** Housekeeping: removes sessions that expired at or before `now`. */
  deleteExpiredSessions(now: Date): Promise<void>;
  clearAttempts(email: string): Promise<void>;
}
