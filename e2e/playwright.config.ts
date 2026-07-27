import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['steps/**/*.ts', 'support/fixtures.ts'],
  tags: 'not @wip',
});

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    cucumberReporter('html', { outputFile: 'playwright-report/cucumber.html' }),
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ru-RU',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @tavrida/frontend exec vite --host 127.0.0.1 --port 5173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_USE_MOCK: 'true',
      VITE_E2E: '1',
      // Force guest/dev auth path (no Logto Cloud in PR E2E).
      VITE_LOGTO_ENDPOINT: '',
      VITE_LOGTO_APP_ID: '',
    },
  },
});
