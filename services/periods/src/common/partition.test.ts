import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateSiblingPartition } from './partition';

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
});
