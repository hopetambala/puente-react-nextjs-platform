import { sourceHasClientPointer } from 'app/modules/data-quality';

/**
 * The SurveyData fields the curation search box looks in. Names and community
 * are what a coordinator types; householdId lets them paste an ID.
 */
export const SEARCH_FIELDS = ['fname', 'lname', 'communityname', 'householdId'];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function peopleMatching(Parse, text) {
  const pattern = escapeRegex(text);
  return Parse.Query.or(
    ...SEARCH_FIELDS.map((field) => new Parse.Query('SurveyData').matches(field, pattern, 'i')),
  );
}

/**
 * Narrow a curation query to records matching the search box.
 *
 * Runs in the query, not over the fetched page, so a match on page 7 is found
 * and the total agrees with the rows. SurveyData is matched on its own fields.
 * The other classes hold no person fields and reach the person through
 * `client`, so they match through that pointer; the person query is scoped to
 * the organization because Parse caps an inner query's matches.
 *
 * May return a NEW query (Parse.Query.and), so callers must keep using the
 * return value, and add include/order/limit after calling this.
 */
export function applySearch(q, {
  Parse, source, search, orgValues,
}) {
  const text = (search || '').trim();
  if (!text) return q;

  if (sourceHasClientPointer(source)) {
    const people = Parse.Query.and(
      new Parse.Query('SurveyData').containedIn('surveyingOrganization', orgValues),
      peopleMatching(Parse, text),
    );
    q.matchesQuery('client', people);
    return q;
  }

  return Parse.Query.and(q, peopleMatching(Parse, text));
}

export default applySearch;
