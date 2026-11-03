import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuestSessionCleanup } from './guest-session-cleanup';

describe('GuestSessionCleanup', () => {
  afterEach(() => vi.useRealTimers());

  it('purges expired sessions on start and on every interval, until stopped', async () => {
    vi.useFakeTimers();
    const deleteExpired = vi.fn().mockResolvedValue(0);
    const cleanup = new GuestSessionCleanup({ deleteExpired } as never, { cookieMaxAgeSeconds: 60 }, 1000);
    cleanup.onModuleInit();
    expect(deleteExpired).toHaveBeenCalledWith(60);
    await vi.advanceTimersByTimeAsync(2000);
    expect(deleteExpired).toHaveBeenCalledTimes(3);
    cleanup.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(2000);
    expect(deleteExpired).toHaveBeenCalledTimes(3);
  });

  it('does not crash when a purge fails', async () => {
    const deleteExpired = vi.fn().mockRejectedValue(new Error('db down'));
    const cleanup = new GuestSessionCleanup({ deleteExpired } as never, { cookieMaxAgeSeconds: 60 }, 1000);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cleanup.onModuleInit();
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    cleanup.onModuleDestroy();
    log.mockRestore();
  });
});
