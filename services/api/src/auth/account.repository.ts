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
  /** Returns false when an account with this email (any case) already exists. */
  create(account: Account): Promise<boolean>;
  findByEmail(email: string): Promise<Account | undefined>;
  createSession(tokenHash: string, accountId: string, expiresAt: Date): Promise<void>;
  /** Returns undefined when the session is unknown or expired at `now`. */
  findSession(tokenHash: string, now: Date): Promise<Account | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
  getAttempts(email: string): Promise<SignInAttempts | undefined>;
  /** Upsert: adds one to the failed count and stamps `now`. */
  recordFailure(email: string, now: Date): Promise<void>;
  clearAttempts(email: string): Promise<void>;
}
