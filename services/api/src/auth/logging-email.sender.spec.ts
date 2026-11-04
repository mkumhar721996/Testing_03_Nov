import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoggingEmailSender } from './logging-email.sender';

const LINK = 'http://localhost:5173/#/reset-password?token=fake-token';
const to = { email: 'priya.raman@northwind.example', name: 'Priya Raman' };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function captureLogs(): string[] {
  const lines: string[] = [];
  vi.spyOn(Logger.prototype, 'log').mockImplementation((m) => void lines.push(String(m)));
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((m) => void lines.push(String(m)));
  return lines;
}

describe('LoggingEmailSender', () => {
  it('logs the link outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const lines = captureLogs();
    await new LoggingEmailSender().sendPasswordReset(to, LINK);
    expect(lines.join('\n')).toContain(LINK);
  });

  it.each(['production', 'staging', ''])('never logs the link when NODE_ENV is %j', async (env) => {
    vi.stubEnv('NODE_ENV', env);
    const lines = captureLogs();
    await new LoggingEmailSender().sendPasswordReset(to, LINK);
    expect(lines).toHaveLength(1);
    expect(lines.join('\n')).not.toContain('fake-token');
  });
});
