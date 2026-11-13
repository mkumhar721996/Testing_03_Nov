import { describe, expect, it } from 'vitest';
import { isValidEmail, isValidPassword, normaliseEmail } from './auth.validation';

describe('auth validation', () => {
  it.each(['Pass1', 'password', '12345678', 'Passw0r'])('rejects password %s', (pw) => {
    expect(isValidPassword(pw)).toBe(false);
  });

  it('accepts a password of exactly 8 characters with a letter and a digit', () => {
    expect(isValidPassword('Passw0rd')).toBe(true);
    expect(isValidPassword('Passw0rd-and-longer')).toBe(true);
  });

  it.each(['sam.example.com', 'a@@b.com', 'a@b@c.com', 'sam@localhost', 'sam@example.', '@example.com', 'sam@.com'])(
    'rejects email %s',
    (e) => expect(isValidEmail(e)).toBe(false),
  );

  it('accepts a normal email', () => {
    expect(isValidEmail('sam@example.com')).toBe(true);
  });

  it('trims and lower-cases', () => {
    expect(normaliseEmail('  SAM@Example.COM ')).toBe('sam@example.com');
  });
});
