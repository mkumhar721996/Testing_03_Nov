import { describe, expect, it } from 'vitest';
import { loadGuestSessionConfig } from './guest-session.config';

describe('loadGuestSessionConfig', () => {
  it('defaults the starting balance to 1000 and cookie max age to 30 days', () => {
    expect(loadGuestSessionConfig({})).toEqual({
      startingBalance: 1000,
      cookieMaxAgeSeconds: 2592000,
    });
  });

  it('reads configured values', () => {
    expect(
      loadGuestSessionConfig({
        GUEST_STARTING_BALANCE: '500',
        GUEST_SESSION_COOKIE_MAX_AGE_SECONDS: '60',
      }),
    ).toEqual({ startingBalance: 500, cookieMaxAgeSeconds: 60 });
  });

  it.each(['0', 'abc', '-5', '1.5', ''])('rejects GUEST_STARTING_BALANCE=%j', (value) => {
    expect(() => loadGuestSessionConfig({ GUEST_STARTING_BALANCE: value })).toThrow(
      /GUEST_STARTING_BALANCE/,
    );
  });

  it.each(['0', 'abc', '-1'])('rejects cookie max age %j', (value) => {
    expect(() =>
      loadGuestSessionConfig({ GUEST_SESSION_COOKIE_MAX_AGE_SECONDS: value }),
    ).toThrow(/GUEST_SESSION_COOKIE_MAX_AGE_SECONDS/);
  });
});
