import { describe, expect, it } from 'vitest';
import { corsOptions } from './cors';

describe('corsOptions', () => {
  it('allows the configured web origin and the x-guest-id header', () => {
    const opts = corsOptions({ WEB_ORIGIN: 'http://web.test' });
    expect(opts.origin).toEqual(['http://web.test']);
    expect(opts.allowedHeaders).toEqual(expect.arrayContaining(['x-guest-id', 'content-type']));
    expect(opts.methods).toEqual(expect.arrayContaining(['GET', 'POST']));
  });

  it('defaults to the local Vite dev origin', () => {
    expect(corsOptions({}).origin).toEqual(['http://localhost:5173']);
  });

  it('accepts several comma-separated origins', () => {
    expect(corsOptions({ WEB_ORIGIN: 'http://a.test, http://b.test' }).origin).toEqual([
      'http://a.test',
      'http://b.test',
    ]);
  });
});
