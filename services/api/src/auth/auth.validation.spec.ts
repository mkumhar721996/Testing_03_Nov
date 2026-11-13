import { describe, expect, it } from 'vitest';
import { isValidEmail, isValidPassword, normaliseEmail } from './auth.validation';

describe('auth validation', () => {
  it('normalises email by trimming and lower-casing', () => {
    expect(normaliseEmail(' SAM@Example.COM ')).toBe('sam@example.com');
  });

  it.each(['sam.example.com', 'a@@b.com', 'a@b@c.com', 'sam@localhost', 'sam@example.', '@example.com', 'sam@.com'])(
    'rejects email %s (AC12)',
    (e) => expect(isValidEmail(e)).toBe(false),
  );

  it('accepts a plain email', () => {
    expect(isValidEmail('sam@example.com')).toBe(true);
  });

  it.each(['Pass1', 'password', '12345678', 'Passw0r'])('rejects password %s (AC10)', (pw) =>
    expect(isValidPassword(pw)).toBe(false),
  );

  it('accepts exactly 8 chars with a letter and a digit (AC11)', () => {
    expect(isValidPassword('Passw0rd')).toBe(true);
  });
});
