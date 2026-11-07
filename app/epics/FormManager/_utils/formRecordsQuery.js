/**
 * The Parse query behind a form card's record list and its "collected" count.
 *
 * Each Puente form card is named after the class its records live in. A
 * custom form's answers live in FormResults, keyed by `formSpecificationsId`.
 * Both views used to get this wrong: the list asked SurveyData for
 * `formSpecification` (0 of CMM's 561 reading-program results, and every
 * organization's patients for the Vitals card), and the count asked
 * FormResults for every card (0 of WOF's 14,799 vitals).
 *
 * Scoped to every `surveyingOrganization` string the organization goes by
 * (see loadOrganizationScope); WOF's vitals say "WOF" and "HOF".
 *
 * Returns null rather than an unscoped query when there is no organization
 * scope or the form cannot be placed. In the Parse SDK `equalTo(key,
 * undefined)` means "key does not exist", which is how a card with no id came
 * to list 44,038 records from every organization.
 */
export const PUENTE_FORM_CLASSES = [
  'SurveyData',
  'HistoryEnvironmentalHealth',
  'Vitals',
  'EvaluationMedical',
];

export default function formRecordsQuery(Parse, form, organizationValues) {
  // Blank values never scope anything. loadOrganizationScope returns [''] for
  // an account with no organization, and the internal-test bucket has '' among
  // its aliases: scoping on it hands blank accounts records that are not theirs.
  const scope = Array.isArray(organizationValues)
    ? organizationValues.filter((v) => typeof v === 'string' && v.trim() !== '')
    : [];
  if (!form || scope.length === 0) {
    return null;
  }

  let query;
  if (!form.objectId && PUENTE_FORM_CLASSES.includes(form.name)) {
    query = new Parse.Query(form.name);
  } else if (form.objectId) {
    query = new Parse.Query('FormResults');
    query.equalTo('formSpecificationsId', form.objectId);
  } else {
    return null;
  }

  query.containedIn('surveyingOrganization', scope);
  query.descending('createdAt');
  return query;
}
