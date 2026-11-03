import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GuestSessionController } from './guest-session.controller';
import { GuestSessionService } from './guest-session.service';
import {
  GUEST_SESSION_CONFIG,
  GUEST_SESSION_REPOSITORY,
  GuestSession,
  GuestSessionRepository,
} from './guest-session.types';

class MemoryRepo implements GuestSessionRepository {
  sessions = new Map<string, GuestSession>();
  private n = 0;
  async create(startingBalance: number) {
    const s = {
      id: `00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}`,
      balance: startingBalance,
      createdAt: new Date(),
    };
    this.sessions.set(s.id, s);
    return s;
  }
  async find(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async claimTopUp(id: string, startingBalance: number) {
    const s = this.sessions.get(id);
    if (!s || s.balance >= 1) return null;
    s.balance = startingBalance;
    return s;
  }
}

describe('GuestSessionController', () => {
  let app: INestApplication;
  let base: string;
  const repo = new MemoryRepo();

  const post = (path: string, cookie?: string) =>
    fetch(`${base}/api${path}`, { method: 'POST', headers: cookie ? { cookie } : {} });
  const cookieOf = (res: Response) => res.headers.get('set-cookie')!.split(';')[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GuestSessionController],
      providers: [
        GuestSessionService,
        { provide: GUEST_SESSION_REPOSITORY, useValue: repo },
        { provide: GUEST_SESSION_CONFIG, useValue: { startingBalance: 1000, cookieMaxAgeSeconds: 123 } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a guest with an httpOnly cookie and no auth (AC1, AC2)', async () => {
    const res = await post('/guest-sessions');
    expect(res.status).toBe(201);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toContain('guest_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=123');
    expect(await res.json()).toEqual({
      balance: 1000,
      startingBalance: 1000,
      resumed: false,
      canClaimTopUp: false,
    });
  });

  it('resumes with the last balance and sets no new cookie (AC3)', async () => {
    const first = await post('/guest-sessions');
    const cookie = cookieOf(first);
    const id = cookie.split('=')[1];
    repo.sessions.get(id)!.balance = 240;
    const again = await post('/guest-sessions', cookie);
    expect(again.headers.get('set-cookie')).toBeNull();
    expect(await again.json()).toMatchObject({ balance: 240, resumed: true });
  });

  it('starts a new session for an unknown cookie (AC4)', async () => {
    const res = await post('/guest-sessions', 'guest_session=00000000-0000-4000-8000-ffffffffffff');
    expect(res.headers.get('set-cookie')).toContain('guest_session=');
    expect(await res.json()).toMatchObject({ balance: 1000, resumed: false });
  });

  it('flags a claim for balance below 1 and tops up (AC5, AC6)', async () => {
    const cookie = cookieOf(await post('/guest-sessions'));
    repo.sessions.get(cookie.split('=')[1])!.balance = 0;
    const view = await (await post('/guest-sessions', cookie)).json();
    expect(view.canClaimTopUp).toBe(true);
    const res = await post('/guest-sessions/current/top-up', cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ balance: 1000, canClaimTopUp: false });
  });

  it('answers 409 and leaves balance unchanged at balance 1 (AC8)', async () => {
    const cookie = cookieOf(await post('/guest-sessions'));
    const id = cookie.split('=')[1];
    repo.sessions.get(id)!.balance = 1;
    expect((await post('/guest-sessions/current/top-up', cookie)).status).toBe(409);
    expect(repo.sessions.get(id)!.balance).toBe(1);
  });

  it('answers 404 for a top-up with no or unknown cookie', async () => {
    expect((await post('/guest-sessions/current/top-up')).status).toBe(404);
    const unknown = 'guest_session=00000000-0000-4000-8000-eeeeeeeeeeee';
    expect((await post('/guest-sessions/current/top-up', unknown)).status).toBe(404);
  });
});
