import { createBdd } from 'playwright-bdd';
import { expect, test } from '../support/fixtures';

const { Given, When, Then } = createBdd(test);

Given('регистрация только по инвайту', async ({ page }) => {
  // По умолчанию clubAccess.inviteOnly=true, если public settings недоступны.
  await page.goto('/');
});

When('я открываю поток вступления с заглушкой кода', async ({ page }) => {
  await page.goto('/join');
  await expect(page).toHaveURL(/\/join/);
});

Then('я вижу экран вступления или инвайта', async ({ page }) => {
  await expect(page.locator('body')).toContainText(/инвит|приглаш|код/i);
});

Given('у меня достаточно баланса для тарифа', async () => {
  test.skip(true, 'W2: нужен seed биллинга');
});

When('я активирую платный тариф со страницы тарифов', async ({ page }) => {
  await page.goto('/plans');
});

Then('я вижу результат активации или paywall', async ({ page }) => {
  await expect(page).toHaveURL(/\/plans/);
});

Given('есть активный лот на который я могу ставить', async () => {
  test.skip(true, 'W2: нужен seed аукциона');
});

When('я делаю корректную ставку', async () => {
  test.skip(true, 'W2: нужны шаги UI ставки');
});

Then('ставка принята', async () => {
  test.skip(true, 'W2');
});

Given('мне разрешено создать аукцион сегодня', async () => {
  test.skip(true, 'W2: лимиты тарифа + форма');
});

When('я публикую новый английский аукцион', async () => {
  test.skip(true, 'W2');
});

Then('аукцион появляется в каталоге', async () => {
  test.skip(true, 'W2');
});

When('я пытаюсь выполнить платное действие без достаточного баланса', async () => {
  test.skip(true, 'W2 S-036');
});

Then('я вижу ответ об оплате или paywall', async () => {
  test.skip(true, 'W2 S-036');
});

Given('мне разрешено писать на форуме', async () => {
  test.skip(true, 'W3');
});

When('я создаю тему с комментарием', async () => {
  test.skip(true, 'W3');
});

Then('тема видна', async () => {
  test.skip(true, 'W3');
});

Given('есть завершённая сделка с ожидающим отзывом', async () => {
  test.skip(true, 'W3 S-015');
});

When('я отправляю отзыв о сделке', async () => {
  test.skip(true, 'W3');
});

Then('отзыв сохранён', async () => {
  test.skip(true, 'W3');
});

Given('есть активное объявление услуги', async () => {
  test.skip(true, 'W3 S-024');
});

When('я завершаю заказ на маркетплейсе', async () => {
  test.skip(true, 'W3');
});

Then('доступен ожидающий отзыв', async () => {
  test.skip(true, 'W3');
});

Given('я вошёл как администратор', async () => {
  test.skip(true, 'W4: seed ролей admin');
});

When('я вхожу и выхожу из имперсонации', async () => {
  test.skip(true, 'W4');
});

Then('состояние сессии не утекает на целевого пользователя', async () => {
  test.skip(true, 'W4');
});

Given('я модератор', async () => {
  test.skip(true, 'W4 S-031');
});

When('я модерирую тему форума', async () => {
  test.skip(true, 'W4');
});

Then('видны маркеры модерации', async () => {
  test.skip(true, 'W4');
});
