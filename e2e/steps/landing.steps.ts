import { createBdd } from 'playwright-bdd';
import { expect, test } from '../support/fixtures';

const { Given, When, Then } = createBdd(test);

Given('я гость на лендинге', async ({ page, asGuest }) => {
  void asGuest;
  await page.goto('/');
  await expect(page.getByTestId('landing-hero')).toBeVisible();
});

When('я нажимаю CTA инвайта', async ({ page }) => {
  await page.getByTestId('landing-cta-invite').click();
  await expect(page).toHaveURL(/\/join/);
});

When('я открываю страницу «О клубе» с лендинга', async ({ page }) => {
  await page.getByTestId('landing-cta-about').click();
  await expect(page).toHaveURL(/\/about/);
});

Then('я вижу публичную информацию о клубе', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

Then('я не вижу навигацию в каталог или форум участников', async ({ page }) => {
  await expect(page.getByRole('link', { name: /каталог|аукцион/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^форум$/i })).toHaveCount(0);
});

Given('я вошёл как участник', async ({ asMember }) => {
  void asMember;
});

When('я открываю deep link дома участника', async ({ page }) => {
  await page.goto('/app');
});

Then('я остаюсь в зоне участника', async ({ page }) => {
  await expect(page).toHaveURL(/\/(app|auctions|forum|wallet|profile)/);
});

When('я открываю каталог аукционов', async ({ page }) => {
  await page.goto('/auctions');
});

Then('я вижу страницу аукционов', async ({ page }) => {
  await expect(page).toHaveURL(/\/auctions/);
  await expect(page.locator('body')).toBeVisible();
});

When('я открываю карточку лота из каталога если она есть', async ({ page }) => {
  await page.goto('/auctions');
  const first = page.locator('a[href*="/auctions/"]').first();
  if ((await first.count()) === 0) {
    test.skip(true, 'В mock/каталоге пока нет ссылок на лоты');
    return;
  }
  await first.click();
});

Then('я вижу страницу лота', async ({ page }) => {
  await expect(page).toHaveURL(/\/auctions\//);
});
