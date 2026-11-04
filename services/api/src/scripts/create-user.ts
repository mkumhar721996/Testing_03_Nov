import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Pool } from 'pg';
import type { AuthRepository } from '../auth/auth.repository';
import { PgAuthRepository } from '../auth/pg-auth.repository';
import { hashPassword, validatePassword } from '../auth/password';

/** Creates an employee account; throws on a weak password or an email that already exists. */
export async function createUserAccount(
  repo: AuthRepository,
  input: { email: string; name: string; password: string },
): Promise<{ id: string }> {
  const email = input.email.trim();
  const weak = validatePassword(input.password);
  if (weak) throw new Error(weak);
  if (await repo.findUserByEmail(email)) throw new Error(`An account for ${email} already exists`);
  const id = randomUUID();
  await repo.createUser({ id, email, name: input.name.trim(), passwordHash: await hashPassword(input.password) });
  return { id };
}

/** Reads one line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (s: string) => void };
    process.stdout.write(question);
    writer._writeToOutput = () => {};
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) throw new Error('Usage: pnpm create-user <email> <name>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const password = await promptHidden('Password: ');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { id } = await createUserAccount(new PgAuthRepository(pool), { email, name, password });
    console.log(`Created account ${id} for ${email}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
