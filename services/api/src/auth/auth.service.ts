import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUTH_CONFIG, LOCK_MINUTES, MAX_FAILED_ATTEMPTS, type AuthConfig } from './auth.config';
import { AUTH_REPOSITORY, type AuthRepository, type SessionUser } from './auth.repository';
import { EMAIL_SENDER, type EmailSender } from './email.sender';
import { hashPassword, validatePassword, verifyPassword } from './password';
import { hashToken, newToken } from './tokens';

export const CLOCK = 'CLOCK';

export type SignInResult =
  | { kind: 'ok'; sessionToken: string; expiresAt: Date; user: SessionUser }
  | { kind: 'invalid' }
  | { kind: 'locked' };

// Verified against when the email has no account, so both failures cost the same time.
const DUMMY_HASH = hashPassword('no-account-placeholder');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repo: AuthRepository,
    @Inject(EMAIL_SENDER) private readonly mailer: EmailSender,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(CLOCK) private readonly clock: () => Date,
  ) {}

  async signIn(email: string, password: string): Promise<SignInResult> {
    const now = this.clock();
    const user = await this.repo.findUserByEmail(email.trim());
    if (!user) {
      await verifyPassword(password, await DUMMY_HASH);
      return { kind: 'invalid' };
    }
    // Checked before the password, so the right password is refused while locked.
    if (user.lockedUntil && user.lockedUntil > now) return { kind: 'locked' };

    if (!(await verifyPassword(password, user.passwordHash))) {
      const { lockedUntil } = await this.repo.recordFailedAttempt(
        user.id,
        now,
        MAX_FAILED_ATTEMPTS,
        LOCK_MINUTES * 60_000,
      );
      return lockedUntil && lockedUntil > now ? { kind: 'locked' } : { kind: 'invalid' };
    }

    if (user.failedAttempts > 0 || user.lockedUntil) await this.repo.clearFailures(user.id);
    const { token, tokenHash } = newToken();
    const expiresAt = this.slideExpiry(now, now);
    await this.repo.createSession({ tokenHash, userId: user.id, expiresAt });
    return {
      kind: 'ok',
      sessionToken: token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async signOut(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) await this.repo.deleteSession(hashToken(sessionToken));
  }

  /** Slides the idle expiry, capped at the absolute lifetime from sign-in. */
  async resolveSession(sessionToken: string | undefined): Promise<SessionUser | null> {
    if (!sessionToken) return null;
    const now = this.clock();
    const tokenHash = hashToken(sessionToken);
    const session = await this.repo.findSession(tokenHash, now);
    if (!session) return null;
    if (now.getTime() >= session.createdAt.getTime() + this.config.sessionAbsoluteMs) {
      await this.repo.deleteSession(tokenHash);
      return null;
    }
    await this.repo.touchSession(tokenHash, now, this.slideExpiry(session.createdAt, now));
    return session.user;
  }

  /** Always resolves, whether or not the email has an account. */
  async requestReset(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email.trim());
    if (!user) return;
    const { token, tokenHash } = newToken();
    await this.repo.createResetToken({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(this.clock().getTime() + this.config.resetLinkMs),
    });
    const link = `${this.config.webBaseUrl}/#/reset-password?${new URLSearchParams({ token })}`;
    try {
      await this.mailer.sendPasswordReset({ email: user.email, name: user.name }, link);
    } catch (err) {
      // Not surfaced: the answer must be the same for every address.
      this.logger.error(`Could not send the password reset email: ${String(err)}`);
    }
  }

  async checkResetToken(token: string): Promise<boolean> {
    return (await this.repo.resetTokenState(hashToken(token), this.clock())) === 'valid';
  }

  async confirmReset(
    token: string,
    newPassword: string,
  ): Promise<'ok' | 'invalid-link' | 'weak-password'> {
    if (validatePassword(newPassword)) return 'weak-password';
    const userId = await this.repo.consumeResetToken(hashToken(token), this.clock());
    if (!userId) return 'invalid-link';
    await this.repo.updatePassword(userId, await hashPassword(newPassword));
    await this.repo.deleteSessionsForUser(userId);
    return 'ok';
  }

  private slideExpiry(createdAt: Date, now: Date): Date {
    return new Date(
      Math.min(
        now.getTime() + this.config.sessionIdleMs,
        createdAt.getTime() + this.config.sessionAbsoluteMs,
      ),
    );
  }
}
