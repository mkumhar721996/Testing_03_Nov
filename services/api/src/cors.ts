import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_WEB_ORIGIN = 'http://localhost:5173';

/** The web app calls the API cross-origin with a custom `x-guest-id` header, so it needs a preflight allowance. */
export function corsOptions(env: Record<string, string | undefined> = process.env): CorsOptions {
  const origin = (env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    origin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-guest-id'],
  };
}
