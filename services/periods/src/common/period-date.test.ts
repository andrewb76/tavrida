import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fromDbDate,
  normalizePeriodDate,
  periodDateTransformer,
  toDbDate,
} from './period-date';

describe('normalizePeriodDate', () => {
  it('accepts bare CE and BCE dates', () => {
    assert.equal(normalizePeriodDate('0476-01-01'), '0476-01-01');
    assert.equal(normalizePeriodDate('-0500-01-01'), '-0500-01-01');
    assert.equal(normalizePeriodDate('-0001-01-01'), '-0001-01-01');
  });

  it('strips a trailing time component', () => {
    assert.equal(normalizePeriodDate('2024-01-15T00:00:00Z'), '2024-01-15');
    assert.equal(normalizePeriodDate('-0500-01-01T00:00:00Z'), '-0500-01-01');
    assert.equal(normalizePeriodDate('0476-01-01 12:00:00'), '0476-01-01');
  });

  it('rejects malformed values', () => {
    assert.equal(normalizePeriodDate(''), null);
    assert.equal(normalizePeriodDate('-0500-01-0'), null);
    assert.equal(normalizePeriodDate('0500-01-01 BC'), null);
    assert.equal(normalizePeriodDate('2024-1-15'), null);
    assert.equal(normalizePeriodDate('0476-01-010'), null);
  });
});

describe('toDbDate / fromDbDate', () => {
  it('round-trips CE dates unchanged', () => {
    assert.equal(toDbDate('0476-01-01'), '0476-01-01');
    assert.equal(fromDbDate('0476-01-01'), '0476-01-01');
  });

  it('maps BCE dates to the PostgreSQL "BC" suffix', () => {
    assert.equal(toDbDate('-0500-01-01'), '0500-01-01 BC');
    assert.equal(toDbDate('-0001-01-01'), '0001-01-01 BC');
  });

  it('round-trips every value in the Crimea seed', () => {
    const samples = ['-0900-01-01', '-0001-01-01', '0001-01-01', '1475-01-01', '2026-12-31'];
    for (const value of samples) {
      assert.equal(fromDbDate(toDbDate(value)), value);
    }
  });
});

describe('periodDateTransformer', () => {
  it('passes null/undefined through', () => {
    assert.equal(periodDateTransformer.to(null), null);
    assert.equal(periodDateTransformer.from(null), null);
    assert.equal(periodDateTransformer.to(undefined), undefined);
    assert.equal(periodDateTransformer.from(undefined), undefined);
  });

  it('converts both directions', () => {
    assert.equal(periodDateTransformer.to('-0500-01-01'), '0500-01-01 BC');
    assert.equal(periodDateTransformer.from('0500-01-01 BC'), '-0500-01-01');
  });
});
