import { test as base } from 'playwright-bdd';

export type E2EWindow = Window & {
  __tavridaE2E?: {
    signInDev: () => void;
    signOutDev: () => void;
  };
};

type AuthFixtures = {
  asGuest: void;
  asMember: void;
};

/**
 * Auth fixtures for PR E2E (no Logto Cloud).
 * Requires SPA built/served with `VITE_E2E=1` (see playwright.config webServer).
 */
export const test = base.extend<AuthFixtures>({
  asGuest: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('tavrida.actAs');
      } catch {
        /* ignore */
      }
    });
    await use();
  },

  asMember: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as E2EWindow).__tavridaE2E));
    await page.evaluate(() => {
      (window as E2EWindow).__tavridaE2E?.signInDev();
    });
    await use();
  },
});

export { expect } from '@playwright/test';
