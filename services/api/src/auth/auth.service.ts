import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
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
  MAX_PASSWORD_LENGTH,
  REGISTER_REFUSED,
  SESSION_TTL_MS,
  SIGN_IN_LOCKED,
  SIGN_IN_REFUSED,
  type Role,
} from './auth.constants';
import { isValidEmail, isValidPassword, normaliseEmail } from './auth.validation';
import { hashPassword, verifyPassword } from './password.hasher';

export const CLOCK = Symbol('CLOCK');
export type Clock = () => Date;

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}
export interface AuthResult {
  token: string;
  user: SessionUser;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so timing does not reveal whether it exists.
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async register(rawEmail: unknown, password: unknown): Promise<AuthResult> {
    const email = normaliseEmail(typeof rawEmail === 'string' ? rawEmail : '');
    const problems: string[] = [];
    if (!isValidEmail(email)) problems.push('Enter an email address with one @ and a domain such as example.com.');
    if (typeof password !== 'string' || !isValidPassword(password)) {
      problems.push('Password needs at least 8 characters, a letter and a digit.');
    }
    if (problems.length > 0 || typeof password !== 'string') {
      throw new BadRequestException({ message: problems.join(' '), problems });
    }
    const account = { id: randomUUID(), email, passwordHash: await hashPassword(password), role: 'customer' as const };
    // Same status as a validation failure, so the response does not reveal that the email is taken.
    if (!(await this.accounts.create(account))) {
      throw new BadRequestException({ message: REGISTER_REFUSED, problems: [REGISTER_REFUSED] });
    }
    return this.startSession(account);
  }

  async signIn(rawEmail: unknown, password: unknown): Promise<AuthResult> {
    const email = normaliseEmail(typeof rawEmail === 'string' ? rawEmail : '');
    const now = this.clock();
    // The attempt is reserved atomically before the (slow) password check, so concurrent guesses
    // cannot all pass the lock check. A locked attempt does not move the lock window.
    const count = await this.accounts.reserveAttempt(email, now, LOCK_WINDOW_MS, MAX_FAILED_ATTEMPTS);
    if (count > MAX_FAILED_ATTEMPTS) throw new HttpException(SIGN_IN_LOCKED, HttpStatus.TOO_MANY_REQUESTS);
    const account = await this.accounts.findByEmail(email);
    const hash = account?.passwordHash ?? (await this.getDummyHash());
    // Oversized passwords are refused before hashing so they cannot be used to burn CPU.
    const ok = typeof password === 'string' && password.length <= MAX_PASSWORD_LENGTH && (await verifyPassword(password, hash));
    if (!account || !ok) throw new UnauthorizedException(SIGN_IN_REFUSED);
    await this.accounts.clearAttempts(email);
    return this.startSession(account);
  }

  async signOut(token: string): Promise<void> {
    await this.accounts.deleteSession(sha256(token));
  }

  async sessionFor(token: string | undefined): Promise<SessionUser> {
    const account = token ? await this.accounts.findSession(sha256(token), this.clock()) : undefined;
    if (!account) throw new UnauthorizedException('Not signed in');
    return { id: account.id, email: account.email, role: account.role };
  }

  private getDummyHash() {
    this.dummyHash ??= hashPassword(randomBytes(8).toString('hex'));
    return this.dummyHash;
  }

  private async startSession(account: { id: string; email: string; role: Role }): Promise<AuthResult> {
    const token = randomBytes(32).toString('base64url');
    await this.accounts.deleteExpiredSessions(this.clock());
    await this.accounts.createSession(sha256(token), account.id, new Date(this.clock().getTime() + SESSION_TTL_MS));
    return { token, user: { id: account.id, email: account.email, role: account.role } };
  }
}
