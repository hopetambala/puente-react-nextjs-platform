import { resolveOrganization } from 'app/modules/organization';

/**
 * Cap on the account read. Chosen to be far above the real population (153
 * accounts as of the 2026-08-28 audit) so it acts as a guard, not a page size.
 *
 * If it is ever REACHED the unresolved list is partial — and a partial list of
 * problems reads exactly like a short one. That is why saturation is reported
 * rather than swallowed.
 */
export const ACCOUNT_FETCH_LIMIT = 1000;

/** Cap on the organization read; they are created by hand and number in dozens. */
export const ORGANIZATION_FETCH_LIMIT = 500;

/** Parse records -> the plain shape the shared resolver expects. */
const toOrganizations = (records) => records.map((r) => ({
  objectId: r.id,
  name: r.get('name'),
  shortCode: r.get('shortCode'),
  aliases: r.get('aliases') || [],
  active: r.get('active') !== false,
}));

/**
 * Everything the organization admin screen reads, in two round-trips.
 *
 * `Parse` is injected so the query CONTRACT is testable: that both reads apply
 * `select()`, that neither is unbounded, and that saturation is reported.
 *
 * Returns `unavailable` rather than throwing, and NEVER an empty list on
 * failure: "no unresolved accounts" and "we could not check" look identical on
 * screen, and only one of them means everything is fine.
 */
export async function loadOrganizationAdmin({ Parse } = {}) {
  try {
    const orgQuery = new Parse.Query('Organization');
    orgQuery.select('name', 'shortCode', 'aliases', 'active');
    orgQuery.limit(ORGANIZATION_FETCH_LIMIT);

    const userQuery = new Parse.Query('User');
    // _User is 17 fields; this screen needs three. select() before anything else.
    userQuery.select('username', 'organization', 'createdAt');
    userQuery.limit(ACCOUNT_FETCH_LIMIT);

    // Concurrent: wall-clock is the slower read, not the sum of both.
    const [orgRecords, userRecords] = await Promise.all([orgQuery.find(), userQuery.find()]);

    const organizations = toOrganizations(orgRecords);

    const unresolved = userRecords
      .map((u) => ({
        objectId: u.id,
        username: u.get('username'),
        organization: u.get('organization'),
        createdAt: u.get('createdAt'),
      }))
      .filter((account) => {
        try {
          return resolveOrganization({ name: account.organization }, organizations)
            .status !== 'resolved';
        } catch (error) {
          // An ambiguous alias throws by design. That account is not resolvable
          // either, and it is a worse problem — never let it fall through as OK.
          return true;
        }
      });

    return {
      organizations,
      // The denominator. "3 unresolved" is unreadable without "of 792 checked",
      // and a bare count of problems is the same shape of lie as a sampled
      // total presented as exact.
      accountsChecked: userRecords.length,
      // Newest first: a worklist is worked from the top, and someone who failed
      // to register today should not sit behind a years-old account.
      unresolved: unresolved.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
      unavailable: false,
      truncated: userRecords.length === ACCOUNT_FETCH_LIMIT
        || orgRecords.length === ORGANIZATION_FETCH_LIMIT,
    };
  } catch (error) {
    return {
      organizations: [], accountsChecked: 0, unresolved: [], unavailable: true, truncated: false,
    };
  }
}
