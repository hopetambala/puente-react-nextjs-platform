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

export function summarizeSyncState({ lastSyncAt, recordsLast24h = 0, now = new Date() }) {
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
