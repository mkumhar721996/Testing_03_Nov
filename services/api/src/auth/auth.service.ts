import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ACCOUNT_REPOSITORY, type AccountRepository } from './account.repository';
import {
  LOCK_WINDOW_MS,
  MAX_FAILED_ATTEMPTS,
  REGISTER_REFUSED,
  SESSION_TTL_MS,
  SIGN_IN_LOCKED,
  SIGN_IN_REFUSED,
  type Role,
} from './auth.constants';
import { MAX_PASSWORD_LENGTH, isValidEmail, isValidPassword, normaliseEmail } from './auth.validation';
import { hashPassword, verifyPassword } from './password.hasher';

export const CLOCK = Symbol('CLOCK');

export type SessionUser = { id: string; email: string; role: Role };
/** The token goes to the session cookie only, never into a JSON body. */
export type AuthResult = { token: string; user: SessionUser };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so timing does not tell the cases apart.
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(CLOCK) private readonly clock: () => Date,
  ) {}

  async register(rawEmail: string, password: string): Promise<AuthResult> {
    const email = typeof rawEmail === 'string' ? normaliseEmail(rawEmail) : '';
    const errors: Record<string, string> = {};
    if (!isValidEmail(email)) errors.email = 'Enter an email address with one @ and a domain.';
    if (typeof password !== 'string' || !isValidPassword(password)) {
      errors['password'] = 'Needs at least 8 characters, a letter and a digit.';
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: 'Registration details are invalid', errors });
    }
    const user: SessionUser = { id: randomUUID(), email, role: 'customer' };
    const created = await this.accounts.create({ ...user, passwordHash: await hashPassword(password) });
    if (!created) throw new ConflictException(REGISTER_REFUSED);
    return { token: await this.startSession(user.id), user };
  }

  async signIn(rawEmail: string, password: string): Promise<AuthResult> {
    const email = typeof rawEmail === 'string' ? normaliseEmail(rawEmail) : '';
    const now = this.clock();
    // The attempt is counted before the slow hash check, so parallel guesses cannot all slip under the
    // limit. A locked attempt is not counted, so the lock ends 15 minutes after the fifth failure.
    if (!(await this.accounts.reserveAttempt(email, now, MAX_FAILED_ATTEMPTS, LOCK_WINDOW_MS))) {
      throw new HttpException(SIGN_IN_LOCKED, HttpStatus.TOO_MANY_REQUESTS);
    }

    const account = await this.accounts.findByEmail(email);
    this.dummyHash ??= hashPassword('dummy-password-0');
    // An over-long password is never hashed; it cannot match, so it is refused like any wrong one.
    const ok =
      typeof password === 'string' &&
      password.length <= MAX_PASSWORD_LENGTH &&
      (await verifyPassword(password, account?.passwordHash ?? (await this.dummyHash)));
    if (!account || !ok) throw new UnauthorizedException(SIGN_IN_REFUSED);
    await this.accounts.clearAttempts(email);
    return {
      token: await this.startSession(account.id),
      user: { id: account.id, email: account.email, role: account.role },
    };
  }

  async signOut(token: string | undefined): Promise<void> {
    if (token) await this.accounts.deleteSession(hashToken(token));
  }

  async sessionFor(token: string | undefined): Promise<SessionUser> {
    const account = token ? await this.accounts.findSession(hashToken(token), this.clock()) : undefined;
    if (!account) throw new UnauthorizedException();
    return { id: account.id, email: account.email, role: account.role };
  }

  private async startSession(accountId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.accounts.createSession(hashToken(token), accountId, new Date(this.clock().getTime() + SESSION_TTL_MS));
    return token;
  }
}
