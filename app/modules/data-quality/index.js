/**
 * Shared data-quality signal definitions.
 *
 * The single definition of what each data-quality signal means. The dashboard's
 * triage loader and the data-curation surface both read these, so a second copy
 * anywhere lets the two screens silently disagree — which is the bug this
 * module exists to prevent. Add definitions here, not next to a caller.
 */

export const SURVEY_COMPLETENESS_FIELDS = [
  'fname', 'lname', 'dob', 'sex',
  'householdId', 'communityname',
  'surveyingUser', 'telephoneNumber',
];

/**
 * Records missing AT LEAST ONE key field — the "missing key fields" queue.
 *
 * Exact, not sampled: an OR across every field, so a single blank arm is enough
 * to match. Every arm re-applies the org scope, because `Parse.Query.or` holds
 * no constraint of its own — an unscoped arm would match other orgs' records.
 */
export function missingKeyFieldsQuery({ Parse, org }) {
  const scoped = () => new Parse.Query('SurveyData').equalTo('surveyingOrganization', org);

  // Two sub-queries per field, not one: a single Parse query cannot hold both
  // doesNotExist(f) and equalTo(f, '') on the same key — the second constraint
  // would replace the first. The empty-string arm matters because
  // computeSurveyCompleteness scores '' as unfilled, so a record with
  // telephoneNumber: '' must land in this queue too.
  return Parse.Query.or(
    ...SURVEY_COMPLETENESS_FIELDS.flatMap((f) => [
      scoped().doesNotExist(f),
      scoped().equalTo(f, ''),
    ]),
  );
}

/**
 * Orphans — the "unresolved parent" queue.
 *
 * The device stamped a record with its own offline household ID and the server
 * never resolved it to a household, so the offline link exists while the
 * resolved `householdId` does not. Scoped on `surveyingOrganization` (which org
 * COLLECTED the record); `organization` lives on _User and describes an
 * account, so it would scope nothing on SurveyData.
 */
export function unresolvedParentQuery({ Parse, org }) {
  return new Parse.Query('SurveyData')
    .equalTo('surveyingOrganization', org)
    .exists('householdObjectIdOffline')
    .doesNotExist('householdId');
}

/**
 * Duplicates — the "possible duplicates" queue.
 *
 * Same household, same day. Reduced client-side over rows the caller already
 * holds, because grouping by householdId + day is an aggregation and the
 * browser SDK has no Master Key — there is no `distinct`/`aggregate` to ask the
 * server for it. Any count derived from this is therefore bounded by whatever
 * the caller fetched, and must be presented as approximate.
 *
 * Lives here rather than in the curation epic so the dashboard can reach it
 * without pulling React and CSS into its module graph.
 */
export function detectDuplicates(records) {
  const seen = {};
  const dups = new Set();
  records.forEach((r) => {
    const hid = r.get('householdId');
    if (!hid) return;
    const day = r.createdAt ? r.createdAt.toISOString().slice(0, 10) : 'unknown';
    const key = `${hid}__${day}`;
    if (seen[key]) {
      dups.add(seen[key]);
      dups.add(r.id);
    } else {
      seen[key] = r.id;
    }
  });
  return dups;
}
