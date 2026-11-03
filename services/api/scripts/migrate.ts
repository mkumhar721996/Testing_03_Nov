import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

// Run from services/api (via `pnpm migrate`); Node strips the types, so no extra runner is needed.
async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const dir = join(process.cwd(), 'migrations');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await client.query(readFileSync(join(dir, file), 'utf8'));
      console.log(`applied ${file}`);
    }
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
