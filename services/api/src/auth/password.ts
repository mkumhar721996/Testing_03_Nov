import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 16384;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 8;

function derive(plain: string, salt: Buffer, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, KEY_LENGTH, { N: n }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Stored as `scrypt$N$salt$hash` (salt and hash base64). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(plain, salt, N);
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, n, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(plain, Buffer.from(salt, 'base64'), Number(n));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Returns null when the password is acceptable, otherwise the message to show. */
export function validatePassword(plain: string): string | null {
  return plain.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
}
