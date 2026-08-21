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

// TODO(dashboard): these link to the surface, not a pre-filtered view — the
// pages don't read filter params yet. Adding `?filter=…` now would be a
// promise the destination doesn't keep. Wire the params, then narrow these.
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
    href: '/data/data-curation',
  },
  {
    key: 'possibleDuplicates',
    id: 'possible-duplicates',
    labelKey: 'triage_possible_duplicates',
    severity: 'medium',
    href: '/data/data-curation',
  },
  {
    key: 'missingKeyFields',
    id: 'missing-key-fields',
    labelKey: 'triage_missing_key_fields',
    severity: 'medium',
    href: '/data/data-curation',
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
