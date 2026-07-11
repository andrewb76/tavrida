import type { AuctionCatalogFilters, CatalogSort, CatalogStatus } from '@/services/auctions';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const VALID_STATUS = new Set<CatalogStatus>([
  'ACTIVE',
  'ENDING_SOON',
  'SCHEDULED',
  'ENDED',
  'ALL',
]);
const VALID_SORT = new Set<CatalogSort>([
  'ENDING_SOON',
  'NEWEST',
  'PRICE_ASC',
  'PRICE_DESC',
  'RELEVANCE',
  'PROMOTED',
]);

function readString(query: Record<string, unknown>, key: string): string | undefined {
  const raw = query[key];
  return typeof raw === 'string' && raw ? raw : undefined;
}

function readNumber(query: Record<string, unknown>, key: string): number | undefined {
  const raw = readString(query, key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function readBool(query: Record<string, unknown>, key: string): boolean | undefined {
  const raw = readString(query, key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export function useAuctionCatalogFilters() {
  const route = useRoute();
  const router = useRouter();
  const searchDraft = ref('');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const filters = computed((): AuctionCatalogFilters => {
    const q = route.query;
    const statusRaw = readString(q, 'status');
    const sortRaw = readString(q, 'sort');
    const qValue = readString(q, 'q');

    const status = statusRaw && VALID_STATUS.has(statusRaw as CatalogStatus)
      ? (statusRaw as CatalogStatus)
      : 'ACTIVE';

    let sort: CatalogSort = 'ENDING_SOON';
    if (sortRaw && VALID_SORT.has(sortRaw as CatalogSort)) {
      sort = sortRaw as CatalogSort;
    } else if (qValue && qValue.length >= 2) {
      sort = 'RELEVANCE';
    }

    return {
      q: qValue,
      categoryId: readString(q, 'categoryId'),
      status,
      sort,
      minPrice: readNumber(q, 'minPrice'),
      maxPrice: readNumber(q, 'maxPrice'),
      type: readString(q, 'type') as 'ENGLISH' | 'DUTCH' | undefined,
      hasExpertAppraisal: readBool(q, 'hasExpertAppraisal'),
      cursor: readString(q, 'cursor'),
      limit: readNumber(q, 'limit') ?? 20,
    };
  });

  const hasActiveFilters = computed(() => {
    const f = filters.value;
    return Boolean(
      f.q ||
        f.categoryId ||
        f.status !== 'ACTIVE' ||
        f.sort !== 'ENDING_SOON' ||
        f.minPrice != null ||
        f.maxPrice != null ||
        f.type ||
        f.hasExpertAppraisal,
    );
  });

  watch(
    () => filters.value.q ?? '',
    (value) => {
      searchDraft.value = value;
    },
    { immediate: true },
  );

  function replaceQuery(next: Record<string, string | undefined>, resetCursor = true) {
    const merged: Record<string, string> = {};
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') merged[key] = value;
    }
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === '') delete merged[key];
      else merged[key] = value;
    }
    if (resetCursor) delete merged.cursor;
    router.replace({ path: '/auctions', query: merged });
  }

  function setStatus(status: CatalogStatus) {
    replaceQuery({ status });
  }

  function setCategoryId(categoryId: string | undefined) {
    replaceQuery({ categoryId });
  }

  function setSort(sort: CatalogSort) {
    replaceQuery({ sort });
  }

  function setSearchInput(value: string) {
    searchDraft.value = value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const trimmed = value.trim();
      replaceQuery({ q: trimmed.length >= 2 ? trimmed : undefined });
    }, 300);
  }

  function flushSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    const trimmed = searchDraft.value.trim();
    replaceQuery({ q: trimmed.length >= 2 ? trimmed : undefined });
  }

  function resetFilters() {
    router.replace({ path: '/auctions', query: { status: 'ACTIVE', sort: 'ENDING_SOON' } });
  }

  function setProFilters(input: {
    minPrice?: number;
    maxPrice?: number;
    type?: 'ENGLISH' | 'DUTCH' | '';
    hasExpertAppraisal?: boolean;
  }) {
    replaceQuery({
      minPrice: input.minPrice != null ? String(input.minPrice) : undefined,
      maxPrice: input.maxPrice != null ? String(input.maxPrice) : undefined,
      type: input.type || undefined,
      hasExpertAppraisal: input.hasExpertAppraisal ? 'true' : undefined,
    });
  }

  return {
    filters,
    searchDraft,
    hasActiveFilters,
    setStatus,
    setCategoryId,
    setSort,
    setSearchInput,
    flushSearch,
    resetFilters,
    setProFilters,
  };
}
