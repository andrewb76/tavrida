import { useCookieConsentStore } from '@/stores/cookieConsent';
import { storeToRefs } from 'pinia';

/**
 * Gate for optional analytics / marketing scripts.
 * Call only after cookie consent init; never load third-party tags without allow.
 */
export function useAnalyticsGate() {
  const consent = useCookieConsentStore();
  const { analyticsAllowed, marketingAllowed, hasDecision } = storeToRefs(consent);

  function loadAnalyticsIfAllowed(loader: () => void) {
    if (analyticsAllowed.value) loader();
  }

  function loadMarketingIfAllowed(loader: () => void) {
    if (marketingAllowed.value) loader();
  }

  return {
    hasDecision,
    analyticsAllowed,
    marketingAllowed,
    loadAnalyticsIfAllowed,
    loadMarketingIfAllowed,
  };
}
