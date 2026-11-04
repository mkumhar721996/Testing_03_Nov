export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export const AUTH_REPOSITORY = 'AUTH_REPOSITORY';

export interface AuthRepository {
  /** Case-insensitive. */
  findUserByEmail(email: string): Promise<UserRecord | null>;
  /** Throws when the email already exists (case-insensitive). */
  createUser(u: { id: string; email: string; name: string; passwordHash: string }): Promise<void>;
  /**
   * Counts one failed attempt and locks the account for `lockMs` on reaching `maxAttempts`, in one
   * atomic statement. A lock that is still running is never extended; one that has passed restarts the count.
   */
  recordFailedAttempt(
    userId: string,
    now: Date,
    maxAttempts: number,
    lockMs: number,
  ): Promise<{ failedAttempts: number; lockedUntil: Date | null }>;
  clearFailures(userId: string): Promise<void>;
  /**
   * Clears the counter only if the account is not locked at `now`, in one atomic statement.
   * False means a lock is running, so no session may be issued.
   */
  clearFailuresIfUnlocked(userId: string, now: Date): Promise<boolean>;
  createSession(s: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>;
  /** Null when unknown or past its idle expiry. */
  findSession(
    tokenHash: string,
    now: Date,
  ): Promise<{ user: SessionUser; createdAt: Date; expiresAt: Date } | null>;
  touchSession(tokenHash: string, now: Date, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: string): Promise<void>;
  createResetToken(t: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>;
  /** Marks an unused, unexpired token as used in one statement and returns its user id, else null. */
  consumeResetToken(tokenHash: string, now: Date): Promise<string | null>;
  resetTokenState(tokenHash: string, now: Date): Promise<'valid' | 'invalid'>;
  /** Also clears failed_attempts and locked_until. */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
