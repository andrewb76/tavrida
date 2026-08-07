// Generated from: features/frequent/S-010-invite-signin.feature
import { test } from "../../../support/fixtures.ts";

test.describe('Вход и инвайт', () => {

  test('Гость открывает поток вступления', { tag: ['@S-010', '@smoke', '@critical'] }, async ({ Given, When, Then, page }) => { 
    await Given('регистрация только по инвайту', null, { page }); 
    await When('я открываю поток вступления с заглушкой кода', null, { page }); 
    await Then('я вижу экран вступления или инвайта', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/frequent/S-010-invite-signin.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":8,"tags":["@S-010","@smoke","@critical"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Допустим регистрация только по инвайту","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"Когда я открываю поток вступления с заглушкой кода","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Тогда я вижу экран вступления или инвайта","stepMatchArguments":[]}]},
]; // bdd-data-end