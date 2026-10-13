'use client';

/**
 * useConsent — client-side consent management (T041)
 *
 * Manages a single named consent key in localStorage.
 * Used by ConsentGate / LocationMap for Google Maps embed (§25 TTDSG / DSGVO Art. 6 I a).
 *
 * Rules:
 * - Consent is per-key and stored in localStorage ONLY — no server-side state.
 * - Both `grant()` and `revoke()` are synchronous and immediately update React state.
 * - If localStorage is unavailable (SSR / private-browsing restriction) the hook
 *   degrades gracefully: consent defaults to false and grant/revoke are no-ops.
 * - The hook initialises with `false` during SSR (no window), then hydrates from
 *   localStorage on mount, preventing a hydration mismatch.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'consent:';
const CONSENT_CHANGE_EVENT = 'salon:consent-change';
type ConsentChange = { key: string; granted: boolean };

function notifyConsentChange(key: string, granted: boolean): void {
  window.dispatchEvent(new CustomEvent<ConsentChange>(CONSENT_CHANGE_EVENT, { detail: { key, granted } }));
}

export type ConsentState = {
  /** Whether the user has actively granted consent for this key. */
  granted: boolean;
  /** Grant consent and persist to localStorage. */
  grant: () => void;
  /** Revoke consent and remove from localStorage. */
  revoke: () => void;
};

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function readStorage(key: string): boolean {
  try {
    return localStorage.getItem(storageKey(key)) === 'true';
  } catch {
    return false;
  }
}

/**
 * @param key  Consent key identifier, e.g. "maps"
 */
export function useConsent(key: string): ConsentState {
  // Always starts false on server; hydrates on client mount.
  const [granted, setGranted] = useState(false);

  // Hydrate from localStorage once on mount (client only).
  useEffect(() => {
    setGranted(readStorage(key));
    const handleConsentChange = (event: Event) => {
      const change = (event as CustomEvent<ConsentChange>).detail;
      if (change.key === key) setGranted(change.granted);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey(key) || event.key === null) setGranted(readStorage(key));
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [key]);

  const grant = useCallback(() => {
    try {
      localStorage.setItem(storageKey(key), 'true');
    } catch {
      // localStorage unavailable — state still updates in memory.
    }
    setGranted(true);
    notifyConsentChange(key, true);
  }, [key]);

  const revoke = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(key));
    } catch {
      // localStorage unavailable — state still updates in memory.
    }
    setGranted(false);
    notifyConsentChange(key, false);
  }, [key]);

  return { granted, grant, revoke };
}
