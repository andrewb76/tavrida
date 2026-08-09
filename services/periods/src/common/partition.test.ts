import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateDays, validateSiblingPartition } from './partition';

describe('parseDateDays', () => {
  it('parses CE dates correctly', () => {
    assert.equal(parseDateDays('0001-01-01'), 1);    // 1 CE Jan 1 = day 1
    assert.equal(parseDateDays('0001-12-31'), 365);  // 1 CE Dec 31 = day 365 (not leap)
    assert.equal(parseDateDays('0002-01-01'), 366);  // 2 CE Jan 1 = day 366
  });

  it('parses BCE dates correctly (astronomical year)', () => {
    // -0001-01-01 = 1 BCE → should be BEFORE 0001-01-01 (1 CE)
    assert.ok(parseDateDays('-0001-01-01') < parseDateDays('0001-01-01'));
    // -0476-01-01 = 476 BCE → should be BEFORE -0001-01-01 (1 BCE)
    assert.ok(parseDateDays('-0476-01-01') < parseDateDays('-0001-01-01'));
  });

  it('handles leap years', () => {
    // 4 CE is a leap year (divisible by 4, not by 100)
    assert.ok(parseDateDays('0004-02-29') > parseDateDays('0004-02-28'));
    // 100 CE is NOT a leap year (divisible by 100, not by 400)
    assert.ok(parseDateDays('0100-03-01') > parseDateDays('0100-02-28'));
    // 400 CE IS a leap year (divisible by 400)
    assert.ok(parseDateDays('0400-02-29') > parseDateDays('0400-02-28'));
  });
});

describe('validateSiblingPartition', () => {
  const parent = { startsOn: '1400-01-01', endsOn: '1800-12-31' };

  it('allows empty children', () => {
    assert.equal(validateSiblingPartition(parent, []), null);
  });

  it('accepts a full single child', () => {
    assert.equal(
      validateSiblingPartition(parent, [{ startsOn: '1400-01-01', endsOn: '1800-12-31' }]),
      null,
    );
  });

  it('accepts adjacent siblings that cover parent', () => {
    assert.equal(
      validateSiblingPartition(parent, [
        { startsOn: '1400-01-01', endsOn: '1600-01-01' },
        { startsOn: '1600-01-01', endsOn: '1700-06-15' },
        { startsOn: '1700-06-15', endsOn: '1800-12-31' },
      ]),
      null,
    );
  });

  it('rejects gap between siblings', () => {
    const v = validateSiblingPartition(parent, [
      { startsOn: '1400-01-01', endsOn: '1500-01-01' },
      { startsOn: '1500-01-02', endsOn: '1800-12-31' },
    ]);
    assert.equal(v?.code, 'ADJACENT_GAP_OR_OVERLAP');
  });

  it('rejects first start mismatch', () => {
    const v = validateSiblingPartition(parent, [
      { startsOn: '1401-01-01', endsOn: '1800-12-31' },
    ]);
    assert.equal(v?.code, 'FIRST_START');
  });

  it('rejects last end mismatch', () => {
    const v = validateSiblingPartition(parent, [
      { startsOn: '1400-01-01', endsOn: '1799-12-31' },
    ]);
    assert.equal(v?.code, 'LAST_END');
  });

  it('accepts BCE partition (476 BCE → 1 BCE → 1 CE)', () => {
    const bceParent = { startsOn: '-0476-01-01', endsOn: '0001-01-01' };
    assert.equal(
      validateSiblingPartition(bceParent, [
        { startsOn: '-0476-01-01', endsOn: '-0001-01-01' },
        { startsOn: '-0001-01-01', endsOn: '0001-01-01' },
      ]),
      null,
    );
  });

  it('accepts all-BCE partition', () => {
    const parent = { startsOn: '-1000-01-01', endsOn: '-0500-01-01' };
    assert.equal(
      validateSiblingPartition(parent, [
        { startsOn: '-1000-01-01', endsOn: '-0750-01-01' },
        { startsOn: '-0750-01-01', endsOn: '-0500-01-01' },
      ]),
      null,
    );
  });

  it('rejects inverted BCE bounds', () => {
    const v = validateSiblingPartition(
      { startsOn: '-0001-01-01', endsOn: '-0476-01-01' },
      [],
    );
    assert.equal(v?.code, 'CHILD_INVERTED');
  });

  it('rejects BCE child outside parent', () => {
    const v = validateSiblingPartition(
      { startsOn: '-0476-01-01', endsOn: '-0001-01-01' },
      [{ startsOn: '-0500-01-01', endsOn: '-0001-01-01' }],
    );
    assert.equal(v?.code, 'CHILD_OUTSIDE_PARENT');
  });
});
