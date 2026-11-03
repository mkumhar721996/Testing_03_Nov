import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';

describe('health route', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    // The pool connects lazily, so no database is needed for this route test.
    process.env.DATABASE_URL = 'postgres://localhost:5432/test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('no longer serves GET /health', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(404);
  });
});
