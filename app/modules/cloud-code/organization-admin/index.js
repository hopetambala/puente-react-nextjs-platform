import { Parse as defaultParse } from 'parse';

/**
 * Wrappers for the organization-administration Cloud functions.
 *
 * Separate from `cloud-code/crud` because these are privileged: every one is
 * gated server-side on the master key or the `puente_staff` role. Nothing here
 * enforces anything — the server does. These only carry the call.
 *
 * `Parse` is injected so the contract with Cloud Code is testable: which
 * function, which params, and what happens when it throws.
 */

/**
 * Is the signed-in user Puente-internal staff?
 *
 * Asks Cloud Code rather than querying `_Role` directly, because the
 * `puente_staff` role is created with no public read — a browser query returns
 * nothing and every staff member would read as non-staff.
 *
 * Used for nav visibility and the route guard, so it must never throw: a
 * rejected promise in a guard blanks the page. Failing closed (denying access)
 * is the safe direction — the server rejects the privileged calls anyway, so a
 * false negative costs a staff member a reload, while a false positive would
 * show a screen whose every action then fails.
 */
export async function isStaff({ Parse = defaultParse } = {}) {
  try {
    const result = await Parse.Cloud.run('isStaff', {});
    return Boolean(result && result.isStaff);
  } catch (error) {
    return false;
  }
}

/**
 * Creates an organization. Refusals are propagated verbatim: the server names
 * the offending value ("alias X already belongs to Y"), and that is the one
 * fact the operator needs in order to fix the input.
 */
export async function createOrganization(params, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('createOrganization', params);
}

/**
 * Replaces an organization's alias set. `aliases` is the complete list to keep,
 * not an addition — removing a wrong spelling has to be expressible.
 */
export async function editOrganizationAliases(params, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('editOrganizationAliases', params);
}
