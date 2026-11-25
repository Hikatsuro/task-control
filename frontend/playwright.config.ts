import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Its own port: the site on 8080 (Django mode) and the root frontend on 5173 keep running.
    baseURL: 'http://127.0.0.1:5188',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5188',
    env: { VITE_DEMO_MODE: 'true' },
    url: 'http://127.0.0.1:5188',
  },
});
