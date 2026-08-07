// Generated from: features/frequent/S-002-auctions-catalog.feature
import { test } from "../../../support/fixtures.ts";

test.describe('Каталог аукционов', () => {

  test('Участник открывает каталог аукционов', { tag: ['@S-002', '@smoke'] }, async ({ Given, When, Then, asMember, page }) => { 
    await Given('я вошёл как участник', null, { asMember }); 
    await When('я открываю каталог аукционов', null, { page }); 
    await Then('я вижу страницу аукционов', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/frequent/S-002-auctions-catalog.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":8,"tags":["@S-002","@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Допустим я вошёл как участник","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"Когда я открываю каталог аукционов","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Тогда я вижу страницу аукционов","stepMatchArguments":[]}]},
]; // bdd-data-end