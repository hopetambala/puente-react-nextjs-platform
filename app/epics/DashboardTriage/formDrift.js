/**
 * Detect custom-form field drift — the failure that silently empties a CSV
 * column and gets the spreadsheet emailed to a funder anyway.
 *
 * The mechanism (see the puente-domain-expert skill):
 *
 *   FormSpecificationsV2.fields[]  →  { label: "Reading Program?", formikKey: "Reading Program" }
 *   FormResults.fields[]           →  { title: "Reading Program",  answer: "Yes" }
 *
 * `formikKey` is derived from `label` once, at field-creation time. Editing the
 * label later does not necessarily re-derive it, and answers already collected
 * keep the OLD key in their `title`. The definition and the historical data
 * then disagree, and the export — which pivots columns on `title` — produces a
 * column with the right header and no values.
 *
 * Direction matters: drift is an ANSWER whose title matches no current field.
 * A field with no answers is an unanswered question, not drift.
 *
 * Titles are compared raw. The Flask exporter strips Spanish accents from
 * column names, but that happens downstream — both sides are unnormalised here,
 * so normalising would invent mismatches that do not exist in Parse.
 */
export function detectFormDrift({ specs = [], results = [] } = {}) {
  const resultsBySpec = new Map();
  results.forEach((r) => {
    if (!resultsBySpec.has(r.specId)) resultsBySpec.set(r.specId, new Set());
    (r.titles || []).forEach((tt) => resultsBySpec.get(r.specId).add(tt));
  });

  const driftedFormIds = specs
    .filter((s) => {
      const answered = resultsBySpec.get(s.id);
      if (!answered || answered.size === 0) return false;

      // Accept either key: a formikKey (the normal case) or the label, since
      // some historical rows were written before the key was derived.
      const known = new Set();
      (s.fields || []).forEach((f) => {
        if (f.formikKey) known.add(f.formikKey);
        if (f.label) known.add(f.label);
      });

      return [...answered].some((tt) => !known.has(tt));
    })
    .map((s) => s.id);

  return { driftedFormIds, count: driftedFormIds.length };
}
