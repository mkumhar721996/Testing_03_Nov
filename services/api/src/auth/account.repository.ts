import type { Role } from './auth.constants';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface SignInAttempts {
  failedCount: number;
  lastFailedAt: Date;
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
  getAttempts(email: string): Promise<SignInAttempts | undefined>;
  /** Upsert: count + 1, or restart at 1 when the previous failure is older than `windowMs`. */
  recordFailure(email: string, now: Date, windowMs: number): Promise<void>;
  clearAttempts(email: string): Promise<void>;
}
