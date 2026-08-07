// Generated from: features/frequent/S-deep-link-member-home.feature
import { test } from "../../../support/fixtures.ts";

test.describe('Deep link участника', () => {

  test('Участник открывает домашнюю deep link', { tag: ['@S-deep-link', '@smoke'] }, async ({ Given, When, Then, asMember, page }) => { 
    await Given('я вошёл как участник', null, { asMember }); 
    await When('я открываю deep link дома участника', null, { page }); 
    await Then('я остаюсь в зоне участника', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/frequent/S-deep-link-member-home.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":8,"tags":["@S-deep-link","@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Допустим я вошёл как участник","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"Когда я открываю deep link дома участника","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Тогда я остаюсь в зоне участника","stepMatchArguments":[]}]},
]; // bdd-data-end