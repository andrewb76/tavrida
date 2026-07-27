import { useSessionStore } from '@/stores/session';

export type TavridaE2EBridge = {
  signInDev: () => void;
  signOutDev: () => void;
};

/** Playwright-only helpers. Loaded when `VITE_E2E=1`. */
export function installE2EBridge(): void {
  const session = useSessionStore();
  const bridge: TavridaE2EBridge = {
    signInDev: () => session.signInDev(),
    signOutDev: () => session.signOutDev(),
  };
  (window as Window & { __tavridaE2E?: TavridaE2EBridge }).__tavridaE2E = bridge;
}
