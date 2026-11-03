import { defineConfig } from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: './test/e2e',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `http://localhost:${port}/health`,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
