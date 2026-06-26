/**
 * Typed loaders for static repo content (gallery manifest, reviews snapshot).
 *
 * SC-005 / FR-016 — Consent Guard:
 *   loadGallery() filters out any entry where consentProofId is empty/missing.
 *   A published entry without proof must NEVER reach the UI.
 *   The validate-gallery.mjs CI script enforces the same rule at build time.
 *
 * G3 — Reviews:
 *   loadReviews() returns the curated snapshot verbatim.
 *   No live aggregate rating is computed or displayed.
 *   No Google widget or script is loaded.
 */
import type { GalleryItem, ReviewsSnapshot } from './types';
import manifestRaw from '@/content/galerie/manifest.json';
import reviewsRaw from '@/content/reviews.json';

/**
 * Load gallery items that have documented consent (consentProofId non-empty).
 * Items without a consentProofId are silently excluded — they must not appear
 * on the public gallery page (SC-005, FR-016, data-model.md Guard D4).
 */
export function loadGallery(): GalleryItem[] {
  const items = manifestRaw as GalleryItem[];
  return items.filter(
    (item) =>
      typeof item.consentProofId === 'string' &&
      item.consentProofId.trim().length > 0
  );
}

/**
 * Load the curated reviews snapshot (G3 guard).
 * Returns first-party text only — no live rating aggregation.
 */
export function loadReviews(): ReviewsSnapshot {
  return reviewsRaw as ReviewsSnapshot;
}

