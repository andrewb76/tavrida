import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanTagLabel, slugifyTag } from './tag-slug';

describe('tag-slug', () => {
  it('strips hash and trims', () => {
    assert.equal(cleanTagLabel('  #Крым  '), 'Крым');
  });

  it('slugifies cyrillic', () => {
    assert.equal(slugifyTag('Крым'), 'krym');
    assert.equal(slugifyTag('Монеты'), 'monety');
  });

  it('strips hash before slugify', () => {
    assert.equal(slugifyTag('#Керамика'), 'keramika');
  });

  it('slugifies latin and spaces', () => {
    assert.equal(slugifyTag('Black Sea'), 'black-sea');
  });

  it('collapses punctuation to hyphens', () => {
    assert.equal(slugifyTag('foo---bar!!'), 'foo-bar');
  });

  it('never returns empty', () => {
    const slug = slugifyTag('!!!', 'abcd-efgh');
    assert.match(slug, /^t-/);
  });
});
