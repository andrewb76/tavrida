import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compareRows,
  filterAndSortRows,
  matchesCatalogStatus,
  normalizeCatalogSort,
  type AuctionListRow,
} from './auction-list.logic';

function row(partial: Partial<AuctionListRow> & Pick<AuctionListRow, 'id' | 'title'>): AuctionListRow {
  const now = new Date('2026-07-12T12:00:00Z');
  return {
    description: '',
    currentPrice: 1000,
    currency: 'RUB',
    status: 'ACTIVE',
    type: 'ENGLISH',
    startsAt: new Date('2026-07-10T10:00:00Z'),
    endsAt: new Date('2026-07-14T10:00:00Z'),
    promotedUntil: null,
    categoryId: null,
    bidCount: 0,
    hasExpertAppraisal: false,
    images: [],
    createdAt: now,
    ...partial,
  };
}

const NOW = new Date('2026-07-12T12:00:00Z');

describe('auction-list.logic', () => {
  it('normalizeCatalogSort defaults to RELEVANCE when q is set', () => {
    assert.equal(normalizeCatalogSort(undefined, 'монета'), 'RELEVANCE');
    assert.equal(normalizeCatalogSort(undefined, undefined), 'ENDING_SOON');
  });

  it('matchesCatalogStatus ACTIVE requires live window', () => {
    const live = row({
      id: '1',
      title: 'Live lot',
      endsAt: new Date('2026-07-13T12:00:00Z'),
    });
    const ended = row({
      id: '2',
      title: 'Ended',
      status: 'ENDED',
      endsAt: new Date('2026-07-11T12:00:00Z'),
    });
    assert.equal(matchesCatalogStatus(live, 'ACTIVE', NOW), true);
    assert.equal(matchesCatalogStatus(ended, 'ACTIVE', NOW), false);
  });

  it('matchesCatalogStatus ENDING_SOON within 24h', () => {
    const soon = row({
      id: '1',
      title: 'Soon',
      endsAt: new Date('2026-07-12T20:00:00Z'),
    });
    const later = row({
      id: '2',
      title: 'Later',
      endsAt: new Date('2026-07-15T12:00:00Z'),
    });
    assert.equal(matchesCatalogStatus(soon, 'ENDING_SOON', NOW), true);
    assert.equal(matchesCatalogStatus(later, 'ENDING_SOON', NOW), false);
  });

  it('filterAndSortRows promotes boosted lots first', () => {
    const plain = row({ id: 'a', title: 'Plain', endsAt: new Date('2026-07-13T10:00:00Z') });
    const promoted = row({
      id: 'b',
      title: 'Promoted',
      endsAt: new Date('2026-07-14T10:00:00Z'),
      promotedUntil: new Date('2026-07-20T10:00:00Z'),
    });
    const sorted = filterAndSortRows([plain, promoted], {
      status: 'ACTIVE',
      sort: 'ENDING_SOON',
      now: NOW,
    });
    assert.equal(sorted[0]?.id, 'b');
  });

  it('filterAndSortRows filters by q in TITLE mode', () => {
    const rows = [
      row({ id: '1', title: 'Монета 1787', description: 'нет совпадения' }),
      row({ id: '2', title: 'Кольцо', description: 'монета в описании' }),
    ];
    const filtered = filterAndSortRows(rows, {
      q: 'монета',
      searchMode: 'TITLE',
      status: 'ALL',
      now: NOW,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, '1');
  });

  it('compareRows RELEVANCE prefers title hits', () => {
    const titleHit = row({ id: '1', title: 'Монета золотая', description: '' });
    const bodyHit = row({ id: '2', title: 'Лот', description: 'монета в тексте' });
    assert.ok(compareRows(bodyHit, titleHit, 'RELEVANCE', NOW, 'монета') > 0);
  });
});
