/**
 * The needs-attention queue — the dashboard's focal point.
 *
 * The dashboard is a dispatcher: success is a click into curation, not time
 * spent reading tiles. So this returns WORK, ordered by how much damage the
 * thing does if ignored — never by how big the number is.
 *
 * Each signal arrives as `{ count, exact }`. `exact` is load-bearing: some
 * counts are real `count()` queries and some are reduced from a capped sample,
 * because the browser Parse SDK has no Master Key and therefore no `distinct`
 * or `aggregate`. A sampled count that renders identically to an exact one is
 * the exact failure this product exists to prevent, so the distinction is
 * preserved all the way to the UI as `approximate`.
 */

/**
 * Severity ranks by consequence, not by volume:
 *
 * - `critical` — silently corrupts data that leaves the system. Form-field
 *   drift empties CSV columns without any error, and the CSV gets emailed to a
 *   funder. Catching it BEFORE an export is the whole point of the row.
 * - `high` — data is disconnected and needs manual work to recover. Orphaned
 *   records have required hand-repair in production before.
 * - `medium` — fixable in-app, in the normal course of curation.
 */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };

// A row that counted 12 records must land the user on those 12, so curation
// rows carry their own signal id as `?signal=…` for the destination to filter
// by — but only where the destination can honour it. A param the destination
// ignores drops the user on the unfiltered table while looking like it worked,
// which is worse than promising nothing. TODO(dashboard): form-drift still links
// to the surface, not the drifted form — Form Creator can't open one yet.
const SIGNALS = [
  {
    key: 'possibleFormDrift',
    id: 'form-drift',
    labelKey: 'triage_form_drift',
    severity: 'critical',
    href: '/forms/form-manager',
  },
  {
    key: 'unresolvedParent',
    id: 'unresolved-parent',
    labelKey: 'triage_unresolved_parent',
    severity: 'high',
    href: '/data/data-curation?signal=unresolved-parent',
  },
  {
    key: 'possibleDuplicates',
    id: 'possible-duplicates',
    labelKey: 'triage_possible_duplicates',
    severity: 'medium',
    // No param: `missing-key-fields` and `unresolved-parent` have exact
    // server-side predicates in app/modules/data-quality, but duplicates means
    // grouping by householdId + day — an aggregation the browser Parse SDK
    // cannot run without a Master Key (no `distinct`/`aggregate`). Both screens
    // only approximate it, currently over different windows, so curation could
    // not honour the filter. Add the param once those windows agree.
    href: '/data/data-curation',
  },
  {
    key: 'missingKeyFields',
    id: 'missing-key-fields',
    labelKey: 'triage_missing_key_fields',
    severity: 'medium',
    href: '/data/data-curation?signal=missing-key-fields',
  },
];

export function buildTriageQueue(signals = {}) {
  return SIGNALS
    // A signal that failed to load is absent, not zero — never invent a row.
    .map((s) => ({ spec: s, value: signals[s.key] }))
    .filter(({ value }) => value && value.count > 0)
    .map(({ spec, value }) => ({
      id: spec.id,
      labelKey: spec.labelKey,
      count: value.count,
      severity: spec.severity,
      approximate: value.exact !== true,
      href: spec.href,
    }))
    .sort((a, b) => (
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      || b.count - a.count
    ));
}

/**
 * Signals whose check could not run.
 *
 * `buildTriageQueue` drops both a zero count and a failed load, because neither
 * is work. But they mean opposite things to a reader: one says "checked, all
 * good", the other says "no idea". An all-clear that might be wrong is the worst
 * thing this screen can say, so the caller needs to tell them apart and must
 * withhold the all-clear when anything here is non-empty.
 *
 * Order follows SIGNALS (severity), so the most consequential missing check
 * reads first.
 */
export function findUnavailableSignals(signals = {}) {
  return SIGNALS.filter((s) => !signals[s.key]).map((s) => s.id);
}
