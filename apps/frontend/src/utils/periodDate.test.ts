import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { periodDateOnly } from './periodDate.js';

describe('periodDateOnly', () => {
  it('keeps bare CE dates intact', () => {
    assert.equal(periodDateOnly('0476-01-01'), '0476-01-01');
  });

  it('keeps bare BCE dates intact', () => {
    assert.equal(periodDateOnly('-0500-01-01'), '-0500-01-01');
    assert.equal(periodDateOnly('-0001-01-01'), '-0001-01-01');
  });

  it('strips a trailing time component', () => {
    assert.equal(periodDateOnly('2024-01-15T00:00:00.000Z'), '2024-01-15');
    assert.equal(periodDateOnly('-0500-01-01T00:00:00.000Z'), '-0500-01-01');
  });

  it('handles nullish values', () => {
    assert.equal(periodDateOnly(null), '');
    assert.equal(periodDateOnly(undefined), '');
  });
});
