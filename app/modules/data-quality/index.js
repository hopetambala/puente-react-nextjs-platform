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
export function missingKeyFieldsQuery({ Parse, orgValues = [] }) {
  const scoped = () => new Parse.Query('SurveyData').containedIn('surveyingOrganization', orgValues);

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
export function unresolvedParentQuery({ Parse, orgValues = [] }) {
  return new Parse.Query('SurveyData')
    .containedIn('surveyingOrganization', orgValues)
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

/**
 * The Parse class a curation source reads from.
 *
 * Lives here rather than in the curation epic so the completeness scoring
 * below — and the epic's queries — resolve a source the one way. Unrecognised
 * sources fall back to SurveyData deliberately: it is the class that carries
 * its own person fields, so a row from it is still readable.
 */
export function resolveParseClass(source) {
  if (source === 'survey-data') return 'SurveyData';
  if (source === 'eval-medical') return 'EvaluationMedical';
  if (source === 'vitals') return 'Vitals';
  if (source === 'env-health') return 'HistoryEnvironmentalHealth';
  if (source.startsWith('form-results:')) return 'FormResults';
  return 'SurveyData';
}

/**
 * Whether this source's class stores only its own data and reaches the person
 * through a `client` pointer.
 *
 * Derived from resolveParseClass so the query's include() and RecordsTable's
 * person/community reads cannot drift apart — including for an unrecognised
 * source, which resolveParseClass sends to SurveyData and which therefore
 * genuinely carries its own person fields.
 */
export function sourceHasClientPointer(source) {
  return resolveParseClass(source) !== 'SurveyData';
}

/**
 * Completeness — the per-source "how much of this record was actually filled
 * in" score, and the anomaly flag derived from it.
 *
 * The clinical extension classes share none of SurveyData's identity fields —
 * they reach the person through a `client` pointer. Each is scored against the
 * readings a surveyor is expected to record, deliberately excluding metadata
 * (surveyingUser, surveyingOrganization, client, createdAt): a well-attributed
 * record with no readings is not a complete one. Which fields count as required
 * is a domain call — adjust these lists rather than adding metadata back.
 */
const SOURCE_COMPLETENESS_FIELDS = {
  'survey-data': SURVEY_COMPLETENESS_FIELDS,
  vitals: ['bloodPressure', 'pulse', 'temp', 'weight', 'height', 'respRate'],
  'eval-medical': ['AssessmentandEvaluation', 'part_of_body', 'duration', 'condition_progression', 'planOfAction'],
  'env-health': ['houseMaterial', 'waterAccess', 'bathroomAccess', 'electricityAccess', 'foodSecurity', 'latrineAccess'],
};

function completenessFieldsForSource(source) {
  return SOURCE_COMPLETENESS_FIELDS[source] || SURVEY_COMPLETENESS_FIELDS;
}

function computeCompletenessForSource(record, source) {
  const fields = completenessFieldsForSource(source);
  const filled = fields.filter((f) => {
    const v = record.get(f);
    return v !== null && v !== undefined && v !== '';
  });
  return Math.round((filled.length / fields.length) * 100);
}

export function computeSurveyCompleteness(record) {
  return computeCompletenessForSource(record, 'survey-data');
}

// Legacy export name, kept so importers written against it keep resolving.
export const computeCompleteness = computeSurveyCompleteness;

const FORM_RESULT_META_FIELDS = ['surveyingUser', 'surveyingOrganization', 'client', 'createdAt'];

export function computeFormResultsCompleteness(record, formDefinition) {
  const answered = new Set((record.get('fields') || []).map((f) => f.title));
  const expected = (formDefinition?.get('fields') || []).map((f) => f.formikKey).filter(Boolean);
  const metaScore = FORM_RESULT_META_FIELDS.filter((f) => !!(f === 'createdAt' ? (record.createdAt || record.get(f)) : record.get(f))).length / FORM_RESULT_META_FIELDS.length;
  const fieldScore = expected.length > 0
    ? expected.filter((k) => answered.has(k)).length / expected.length
    : 1;
  return {
    meta: Math.round(metaScore * 100),
    fields: Math.round(fieldScore * 100),
    overall: Math.round((metaScore * 0.3 + fieldScore * 0.7) * 100),
  };
}

/**
 * Scores one record with the metric its own source has.
 *
 * Custom forms carry their own (30% metadata + 70% answered-vs-expected); every
 * other source is scored against its class's field list. Routing every
 * completeness read through here keeps the summary bar, the anomaly flags, the
 * completeness filter and the per-row bar from disagreeing with each other.
 */
export function scoreRecord(record, source, formDefinition) {
  if (source.startsWith('form-results:')) {
    return computeFormResultsCompleteness(record, formDefinition).overall;
  }
  return computeCompletenessForSource(record, source);
}

export function flagAnomalies(records, source = 'survey-data', formDefinition = null) {
  const anomalies = new Set();
  records.forEach((r) => {
    if (scoreRecord(r, source, formDefinition) < 60) anomalies.add(r.id);
  });
  return anomalies;
}
