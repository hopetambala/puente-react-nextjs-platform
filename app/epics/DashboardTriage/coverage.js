/**
 * Community coverage for the dashboard's right rail.
 *
 * This replaces an org-wide record total, which answered nobody's question. The
 * program manager's actual decision is *where do I send a team next* — so the
 * unit is the community, and the finding is SILENCE. Quietest sorts first.
 *
 * Takes plain `{ community, syncedAt }` objects rather than Parse records so it
 * stays pure and testable without mocking the SDK; the caller maps.
 *
 * `syncedAt` is `createdAt` — when Parse RECEIVED the record. A community shown
 * as "quiet 18 days" may have been surveyed more recently by a phone that has
 * not synced. That is still the useful signal (nobody has *heard* from there),
 * but it must be labelled as sync, never as fieldwork.
 */

const DAY_MS = 24 * 3600 * 1000;

/**
 * Days without a sync before a community reads as "quiet".
 *
 * Two weeks, chosen so a normal survey cadence plus a slow sync does not trip
 * it. This is a display threshold, not a data fact — tune it with a coordinator,
 * not by intuition.
 */
export const QUIET_DAYS = 14;

export function summarizeCoverage({ records = [], now = new Date(), sampleSize = 0 }) {
  const groups = new Map();
  let skippedNoCommunity = 0;

  records.forEach((r) => {
    const name = (r.community || '').trim();
    if (!name) {
      skippedNoCommunity += 1;
      return;
    }
    const syncedAt = r.syncedAt ? new Date(r.syncedAt) : null;
    const existing = groups.get(name);
    if (existing) {
      existing.records += 1;
      if (syncedAt && (!existing.lastSyncedAt || syncedAt > existing.lastSyncedAt)) {
        existing.lastSyncedAt = syncedAt;
      }
    } else {
      groups.set(name, { name, records: 1, lastSyncedAt: syncedAt });
    }
  });

  const communities = [...groups.values()]
    .map((c) => ({
      ...c,
      daysQuiet: c.lastSyncedAt
        ? Math.floor((now.getTime() - c.lastSyncedAt.getTime()) / DAY_MS)
        : null,
    }))
    // Quietest first. A community nobody has heard from is the actionable row;
    // the busiest one needs no decision.
    .sort((a, b) => (b.daysQuiet ?? Infinity) - (a.daysQuiet ?? Infinity));

  return {
    communities,
    skippedNoCommunity,
    // Only claim approximation when the sample actually saturated. Flagging
    // every result as approximate teaches people to ignore the flag.
    approximate: sampleSize > 0 && records.length >= sampleSize,
    counted: records.length,
  };
}

/**
 * Coarsen a silence duration to a scale where the number carries meaning.
 *
 * Visual QA caught the reason this exists: real data rendered "quiet 2072d",
 * which is ~5.7 years expressed to the day. Day-precision at that scale is
 * false precision — it implies a measurement nobody made and buries the actual
 * finding (this community has been silent for years).
 *
 * Returns { key, count } for the caller to translate; never a formatted string.
 */
export function formatQuietDuration(days) {
  if (days === null || days === undefined) return null;
  if (days === 0) return { key: 'coverage_quiet_today', count: 0 };
  if (days < 60) return { key: 'coverage_quiet_days', count: days };
  if (days < 730) return { key: 'coverage_quiet_months', count: Math.floor(days / 30) };
  return { key: 'coverage_quiet_years', count: Math.floor(days / 365) };
}
