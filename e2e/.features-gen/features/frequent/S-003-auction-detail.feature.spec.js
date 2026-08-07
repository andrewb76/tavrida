// Generated from: features/frequent/S-003-auction-detail.feature
import { test } from "../../../support/fixtures.ts";

test.describe('Страница лота', () => {

  test('Участник открывает карточку лота из каталога', { tag: ['@S-003', '@smoke', '@critical'] }, async ({ Given, When, Then, asMember, page }) => { 
    await Given('я вошёл как участник', null, { asMember }); 
    await When('я открываю карточку лота из каталога если она есть', null, { page }); 
    await Then('я вижу страницу лота', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/frequent/S-003-auction-detail.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":8,"tags":["@S-003","@smoke","@critical"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Допустим я вошёл как участник","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"Когда я открываю карточку лота из каталога если она есть","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Тогда я вижу страницу лота","stepMatchArguments":[]}]},
]; // bdd-data-end