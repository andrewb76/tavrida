// Generated from: features/frequent/S-001-landing.feature
import { test } from "../../../support/fixtures.ts";

test.describe('Лендинг для гостя', () => {

  test('Гость видит лендинг и CTA инвайта', { tag: ['@S-001', '@smoke', '@critical'] }, async ({ Given, When, Then, asGuest, page }) => { 
    await Given('я гость на лендинге', null, { asGuest, page }); 
    await When('я нажимаю CTA инвайта', null, { page }); 
    await Then('я вижу экран вступления или инвайта', null, { page }); 
  });

  test('Гость открывает «О клубе» с лендинга', { tag: ['@S-001', '@smoke', '@critical'] }, async ({ Given, When, Then, And, asGuest, page }) => { 
    await Given('я гость на лендинге', null, { asGuest, page }); 
    await When('я открываю страницу «О клубе» с лендинга', null, { page }); 
    await Then('я вижу публичную информацию о клубе', null, { page }); 
    await And('я не вижу навигацию в каталог или форум участников', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/frequent/S-001-landing.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":8,"tags":["@S-001","@smoke","@critical"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Допустим я гость на лендинге","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"Когда я нажимаю CTA инвайта","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Тогда я вижу экран вступления или инвайта","stepMatchArguments":[]}]},
  {"pwTestLine":12,"pickleLine":13,"tags":["@S-001","@smoke","@critical"],"steps":[{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"Допустим я гость на лендинге","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"Когда я открываю страницу «О клубе» с лендинга","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Тогда я вижу публичную информацию о клубе","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"И я не вижу навигацию в каталог или форум участников","stepMatchArguments":[]}]},
]; // bdd-data-end