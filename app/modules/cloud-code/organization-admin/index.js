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

/**
 * What the signed-in user may administer: `{ isStaff, orgAdminOf }`.
 *
 * Cannot be derived in the browser — org admin roles carry no public read, so a
 * client-side `_Role` query returns nothing and every admin would read as
 * non-admin.
 *
 * Fails closed and never throws, for the same reason `isStaff` does: this
 * drives a route guard, and a rejected promise there blanks the page. The
 * server refuses the privileged calls regardless, so a false negative costs a
 * reload while a false positive renders a screen whose every action fails.
 */
export async function myOrganizationAccess({ Parse = defaultParse } = {}) {
  try {
    const result = await Parse.Cloud.run('myOrganizationAccess', {});
    return {
      isStaff: Boolean(result && result.isStaff),
      orgAdminOf: (result && Array.isArray(result.orgAdminOf)) ? result.orgAdminOf : [],
    };
  } catch (error) {
    return { isStaff: false, orgAdminOf: [] };
  }
}

/**
 * The members of one organization.
 *
 * Always an array. A failed read is the CALLER's to distinguish from an empty
 * organization — this only guarantees the shape, so nothing downstream has to
 * guard against undefined before mapping.
 */
export async function listOrganizationMembers(params, { Parse = defaultParse } = {}) {
  const result = await Parse.Cloud.run('listOrganizationMembers', params);
  return Array.isArray(result) ? result : [];
}

/**
 * Promotes or demotes an organization admin.
 *
 * Refusals propagate verbatim: the server explains what to do about them
 * ("appoint another admin first"), and a generic failure would hide the only
 * actionable part.
 */
export async function setOrgAdmin(params, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('setOrgAdmin', params);
}

/** Deactivates or reactivates a member. Refusals propagate verbatim. */
export async function setUserActive(params, { Parse = defaultParse } = {}) {
  return Parse.Cloud.run('setUserActive', params);
}
