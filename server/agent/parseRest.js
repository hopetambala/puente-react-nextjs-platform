/**
 * Single choke point for every Parse REST call the agent makes.
 *
 * Security invariants enforced here:
 * 1. Only whitelisted classes can be queried.
 * 2. Every query is filtered by the caller's organization — merged LAST so
 *    no tool argument can ever override it.
 * 3. Requests authenticate with the user's own session token (ACLs apply);
 *    the master key is never used on the agent path.
 */

const ALLOWED_CLASSES = [
  'SurveyData',
  'Household',
  'Vitals',
  'FormResults',
  'FormSpecificationsV2',
];

const orgScopedQuery = async ({
  className,
  organization,
  sessionToken,
  where = {},
  count,
  limit,
  keys,
  order,
}) => {
  if (!ALLOWED_CLASSES.includes(className)) {
    throw new Error(`Class "${className}" is not allowed`);
  }

  // Organization is merged last — it always wins.
  const scopedWhere = { ...where, surveyingOrganization: organization };

  const params = new URLSearchParams();
  params.set('where', JSON.stringify(scopedWhere));
  if (count) params.set('count', '1');
  if (limit !== undefined) params.set('limit', String(limit));
  if (keys) params.set('keys', keys.join(','));
  if (order) params.set('order', order);

  const url = `${process.env.NEXT_PUBLIC_parseServerUrl}/classes/${className}?${params}`;
  const response = await fetch(url, {
    headers: {
      'X-Parse-Application-Id': process.env.NEXT_PUBLIC_parseAppId,
      'X-Parse-Session-Token': sessionToken,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || `Parse request failed (${response.status})`);
  }
  return body;
};

module.exports = { ALLOWED_CLASSES, orgScopedQuery };
