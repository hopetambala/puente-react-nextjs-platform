/**
 * Sync freshness for the dashboard ribbon.
 *
 * This answers the dashboard's first question — "can I trust what I'm about to
 * read?" — before any count is shown.
 *
 * Two deliberate constraints:
 *
 * 1. It returns a STATUS KEY, never display text. The caller translates. Six
 *    locales ship (one right-to-left), so an English string produced here would
 *    be untranslatable by construction.
 * 2. `lastSyncAt` comes from `SurveyData.createdAt`, which is when Parse
 *    RECEIVED the record — not when fieldwork happened. Callers must label this
 *    "synced", never "collected". See the puente-domain-expert skill.
 */

const HOUR_MS = 3600 * 1000;

/** Under a day: today's picture is current. */
export const FRESH_MAX_HOURS = 24;
/** Under three days: worth noticing, not yet alarming. */
export const AGING_MAX_HOURS = 72;

/**
 * Typed here rather than at the call site: without this, TypeScript infers
 * `recordsLast24h` as `number` from the `= 0` default and rejects the null an
 * unreadable count sends. The default only fires on `undefined` -- a null is
 * forwarded untouched, and the ribbon renders it as a placeholder.
 *
 * @param {object} input
 * @param {boolean} [input.lastSyncAvailable] False when the last-sync read did not run.
 * @param {Date|string|null} [input.lastSyncAt] When Parse RECEIVED the newest record.
 * @param {number|null} [input.recordsLast24h] Null when the count query did not run.
 * @param {Date} [input.now]
 */
export function summarizeSyncState({
  lastSyncAvailable = true, lastSyncAt, recordsLast24h = 0, now = new Date(),
}) {
  // A failed or skipped read tells us nothing, so it must not be reported as
  // 'never' — that key asserts the organization has genuinely never synced, a
  // claim only an answered query can support. Defaults true so existing callers,
  // which do ask and do get an answer, keep their meaning.
  if (!lastSyncAvailable) {
    return {
      status: 'unknown', hoursSince: null, daysSince: null, recordsLast24h,
    };
  }

  if (!lastSyncAt) {
    return {
      status: 'never', hoursSince: null, daysSince: null, recordsLast24h,
    };
  }

  const hoursSince = Math.floor((now.getTime() - new Date(lastSyncAt).getTime()) / HOUR_MS);
  const daysSince = Math.floor(hoursSince / 24);

  let status = 'stale';
  if (hoursSince < FRESH_MAX_HOURS) status = 'fresh';
  else if (hoursSince < AGING_MAX_HOURS) status = 'aging';

  return {
    status, hoursSince, daysSince, recordsLast24h,
  };
}
