import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  defaultPrefs,
  type CookieCategoryPrefs,
  type CookieConsentRecord,
} from '@/config/cookie-consent';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

function readStored(): CookieConsentRecord | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (!parsed?.version || !parsed.categories || parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }
    return {
      version: parsed.version,
      decidedAt: parsed.decidedAt,
      categories: {
        necessary: true,
        analytics: Boolean(parsed.categories.analytics),
        marketing: Boolean(parsed.categories.marketing),
      },
    };
  } catch {
    return null;
  }
}

function writeStored(record: CookieConsentRecord) {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

export const useCookieConsentStore = defineStore('cookieConsent', () => {
  const record = ref<CookieConsentRecord | null>(null);
  const preferencesOpen = ref(false);
  const openCustomizeFirst = ref(false);

  const hasDecision = computed(() => Boolean(record.value));
  const showBanner = computed(() => !record.value || preferencesOpen.value);
  const analyticsAllowed = computed(() => Boolean(record.value?.categories.analytics));
  const marketingAllowed = computed(() => Boolean(record.value?.categories.marketing));

  function init() {
    record.value = readStored();
  }

  function save(categories: CookieCategoryPrefs) {
    const next: CookieConsentRecord = {
      version: COOKIE_CONSENT_VERSION,
      decidedAt: new Date().toISOString(),
      categories: {
        necessary: true,
        analytics: Boolean(categories.analytics),
        marketing: Boolean(categories.marketing),
      },
    };
    writeStored(next);
    record.value = next;
    preferencesOpen.value = false;
    openCustomizeFirst.value = false;
  }

  function acceptAll() {
    save(defaultPrefs(true));
  }

  function rejectOptional() {
    save(defaultPrefs(false));
  }

  function openPreferences(options?: { customize?: boolean }) {
    openCustomizeFirst.value = Boolean(options?.customize ?? true);
    preferencesOpen.value = true;
  }

  function closePreferences() {
    if (record.value) {
      preferencesOpen.value = false;
      openCustomizeFirst.value = false;
    }
  }

  function consumeOpenCustomizeFirst(): boolean {
    const value = openCustomizeFirst.value;
    openCustomizeFirst.value = false;
    return value;
  }

  return {
    record,
    preferencesOpen,
    openCustomizeFirst,
    hasDecision,
    showBanner,
    analyticsAllowed,
    marketingAllowed,
    init,
    save,
    acceptAll,
    rejectOptional,
    openPreferences,
    closePreferences,
    consumeOpenCustomizeFirst,
  };
});
