import { detectDuplicates, SURVEY_COMPLETENESS_FIELDS } from 'app/epics/DataCurationManager';

import { detectFormDrift } from './formDrift';

/**
 * Query orchestration for the dashboard.
 *
 * `Parse` is injected so the query CONTRACT is testable without mocking a
 * module: that every read is org-scoped, that the wide sample uses `select()`,
 * that one sample serves two consumers, and that `distinct()` is never reached
 * for (the browser SDK has no Master Key).
 *
 * ── Known cost, stated plainly ──────────────────────────────────────────────
 * This fires 6 reads. That is over the one-round-trip budget for a page load,
 * and it is the deliberate stopgap the design spec allows: the alternative is
 * sampling the queue counts, which would put approximate numbers on the one
 * screen whose entire job is telling you what to trust.
 *
 * They run in `Promise.all`, so wall-clock is the slowest read rather than the
 * sum — but it is still 6 requests on a bad connection.
 *
 * TODO(dashboard): replace with a single `dashboardTriage` Cloud Code function
 * in puente-node-cloudcode. Server-side the master key is legitimate, so the
 * sampled signals below become exact `distinct`/aggregate queries and the whole
 * payload arrives in one round-trip. The 30 existing functions (basicQuery,
 * genericQuery, countService) are the idiom to follow.
 *
 * TODO(layering): this imports two pure helpers from the DataCurationManager
 * epic, which drags React and CSS into the module graph. They belong in a
 * shared module. Importing beats duplicating — a second copy of
 * SURVEY_COMPLETENESS_FIELDS would let the dashboard and curation silently
 * disagree about what "missing key fields" means.
 */

/** Cap for the wide sample. Saturating it means the derived figures are partial. */
export const SAMPLE_SIZE = 1000;

const DAY_MS = 24 * 3600 * 1000;
const FORM_SPEC_LIMIT = 20;

// Resolve to null rather than rejecting: one failed signal must not blank the
// whole dashboard, and buildTriageQueue treats null as "absent, not zero".
const soft = (p) => p.then((v) => v, () => null);

export async function loadDashboardTriage({ Parse, org, now = new Date() }) {
  const since24h = new Date(now.getTime() - DAY_MS);

  const scoped = (cls) => new Parse.Query(cls).equalTo('surveyingOrganization', org);

  // 1 — most recent arrival, for the ribbon.
  const lastSyncQ = scoped('SurveyData');
  lastSyncQ.select('createdAt');
  lastSyncQ.descending('createdAt');
  lastSyncQ.limit(1);

  // 2 — volume in the last day. A real count, not a sample.
  const recent24hQ = scoped('SurveyData');
  recent24hQ.greaterThanOrEqualTo('createdAt', since24h);

  // 3 — records missing at least one key field. Exact, via an OR of
  // doesNotExist over the same field list curation scores against.
  const missingQ = Parse.Query.or(
    ...SURVEY_COMPLETENESS_FIELDS.map((f) => scoped('SurveyData').doesNotExist(f)),
  );

  // 4 — orphans: the offline parent link was minted on the device but never
  // resolved to a household server-side.
  const orphanQ = scoped('SurveyData');
  orphanQ.exists('householdObjectIdOffline');
  orphanQ.doesNotExist('householdId');

  // 5 — ONE wide sample, two consumers (duplicates + coverage). select() keeps
  // this to 3 fields instead of SurveyData's ~65.
  const sampleQ = scoped('SurveyData');
  sampleQ.select('communityname', 'householdId', 'createdAt', 'surveyingUser');
  sampleQ.descending('createdAt');
  sampleQ.limit(SAMPLE_SIZE);

  // 6 — active form definitions, for the drift check.
  const specsQ = new Parse.Query('FormSpecificationsV2');
  specsQ.equalTo('organizations', org);
  // `active` is the STRING 'true' on this class, not a boolean.
  specsQ.equalTo('active', 'true');
  specsQ.limit(FORM_SPEC_LIMIT);

  // 7 — recent submissions, for the drift check.
  const resultsQ = scoped('FormResults');
  resultsQ.select('fields', 'formSpecificationsId');
  resultsQ.descending('createdAt');
  resultsQ.limit(SAMPLE_SIZE);

  const [lastSyncRows, recordsLast24h, missingCount, orphanCount, sample, specs, results] =
    await Promise.all([
      soft(lastSyncQ.find()),
      soft(recent24hQ.count()),
      soft(missingQ.count()),
      soft(orphanQ.count()),
      soft(sampleQ.find()),
      soft(specsQ.find()),
      soft(resultsQ.find()),
    ]);

  const rows = sample || [];

  const drift = detectFormDrift({
    specs: (specs || []).map((s) => ({ id: s.id, fields: s.get('fields') || [] })),
    results: (results || []).map((r) => ({
      specId: r.get('formSpecificationsId'),
      titles: (r.get('fields') || []).map((f) => f.title),
    })),
  });

  // Derived from the SAME sample — the old dashboard spent a dedicated query on
  // this. It is a lower bound on ACCOUNTS that synced, not people who collected:
  // surveyingUser records whoever was signed in at sync time, and field phones
  // are shared. Hence `exact: false` and the "accounts" wording downstream.
  const accountsSynced = {
    count: new Set(rows.map((r) => r.get('surveyingUser')).filter(Boolean)).size,
    exact: false,
  };

  return {
    accountsSynced,
    sync: {
      lastSyncAt: lastSyncRows && lastSyncRows[0] ? lastSyncRows[0].createdAt : null,
      recordsLast24h: recordsLast24h ?? 0,
    },
    signals: {
      missingKeyFields: missingCount === null ? null : { count: missingCount, exact: true },
      unresolvedParent: orphanCount === null ? null : { count: orphanCount, exact: true },
      // Sampled: duplicate detection needs the rows themselves, and the browser
      // SDK cannot aggregate. Never presented as exact.
      possibleDuplicates: sample === null
        ? null
        : { count: detectDuplicates(rows).size, exact: false },
      possibleFormDrift: (specs === null || results === null)
        ? null
        : { count: drift.count, exact: false },
    },
    coverage: {
      records: rows.map((r) => ({
        community: r.get('communityname'),
        syncedAt: r.createdAt,
      })),
      sampleSize: SAMPLE_SIZE,
    },
  };
}
