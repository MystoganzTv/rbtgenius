/**
 * App Store identity and deep links.
 *
 * `requestReview()` from expo-store-review shows StoreKit's native sheet, but
 * iOS silently throttles it to ~3 prompts per user per year and shows nothing
 * at all in TestFlight. That is fine for an *unprompted* nudge after a good
 * result, but it is the wrong call when the user deliberately taps "Rate this
 * app" — they tap, nothing happens, and we lose the review. For that case send
 * them straight to the write-review sheet on the store page instead.
 */

export const APP_STORE_ID = '6766110248';

export const APP_STORE_PAGE_URL = `https://apps.apple.com/us/app/rbtgenius/id${APP_STORE_ID}`;

export const APP_STORE_WRITE_REVIEW_URL =
  `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;

export const APP_STORE_WRITE_REVIEW_FALLBACK_URL =
  `${APP_STORE_PAGE_URL}?action=write-review`;
