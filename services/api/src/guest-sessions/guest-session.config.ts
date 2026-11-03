export interface GuestSessionConfig {
  startingBalance: number;
  cookieMaxAgeSeconds: number;
}

// Placeholders: the real starting amount and the session retention are still undecided.
const DEFAULT_STARTING_BALANCE = 1000;
const DEFAULT_COOKIE_MAX_AGE_SECONDS = 2592000;

function positiveInteger(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be an integer of 1 or more, got "${raw}"`);
  }
  return value;
}

export function loadGuestSessionConfig(env: NodeJS.ProcessEnv = process.env): GuestSessionConfig {
  return {
    startingBalance: positiveInteger(env, 'GUEST_STARTING_BALANCE', DEFAULT_STARTING_BALANCE),
    cookieMaxAgeSeconds: positiveInteger(
      env,
      'GUEST_SESSION_COOKIE_MAX_AGE_SECONDS',
      DEFAULT_COOKIE_MAX_AGE_SECONDS,
    ),
  };
}
