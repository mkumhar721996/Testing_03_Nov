import { describe, expect, it } from 'vitest';
import { loadGuestSessionConfig } from './guest-session.config';

describe('loadGuestSessionConfig', () => {
  it('defaults the starting balance to 1000 and cookie max age to 30 days', () => {
    expect(loadGuestSessionConfig({})).toEqual({
      startingBalance: 1000,
      cookieMaxAgeSeconds: 2592000,
      createLimit: 10,
      createWindowSeconds: 3600,
    });
  });

  it('reads configured values', () => {
    expect(
      loadGuestSessionConfig({
        GUEST_STARTING_BALANCE: '500',
        GUEST_SESSION_COOKIE_MAX_AGE_SECONDS: '60',
        GUEST_SESSION_CREATE_LIMIT: '3',
        GUEST_SESSION_CREATE_WINDOW_SECONDS: '30',
      }),
    ).toEqual({
      startingBalance: 500,
      cookieMaxAgeSeconds: 60,
      createLimit: 3,
      createWindowSeconds: 30,
    });
  });

  it.each(['0', 'abc', '-5', '1.5', ''])('rejects GUEST_STARTING_BALANCE=%j', (value) => {
    expect(() => loadGuestSessionConfig({ GUEST_STARTING_BALANCE: value })).toThrow(
      /GUEST_STARTING_BALANCE/,
    );
  });

  it.each(['0', 'abc'])('rejects rate limit settings %j', (value) => {
    expect(() => loadGuestSessionConfig({ GUEST_SESSION_CREATE_LIMIT: value })).toThrow(
      /GUEST_SESSION_CREATE_LIMIT/,
    );
    expect(() => loadGuestSessionConfig({ GUEST_SESSION_CREATE_WINDOW_SECONDS: value })).toThrow(
      /GUEST_SESSION_CREATE_WINDOW_SECONDS/,
    );
  });

  it.each(['0', 'abc', '-1'])('rejects cookie max age %j', (value) => {
    expect(() =>
      loadGuestSessionConfig({ GUEST_SESSION_COOKIE_MAX_AGE_SECONDS: value }),
    ).toThrow(/GUEST_SESSION_COOKIE_MAX_AGE_SECONDS/);
  });
});
