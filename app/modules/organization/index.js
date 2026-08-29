/**
 * Resolving an organization reference to a canonical `Organization`.
 *
 * See docs/billing-and-invoicing.md §3.
 */

/**
 * Folds an organization string to its comparison form: accent-, case- and
 * whitespace-insensitive. Non-strings become `null`, so an absent organization
 * can never collide with an empty-string alias.
 *
 * Accents are folded because organization names here are frequently Spanish and
 * are typed both ways. The 2026-08-28 production audit found 524 records under
 * 'Asociacion para el impacto de desarrollo comunitario' and 31 under
 * 'Asociación…' — one character splitting 555 records across what would
 * otherwise be two organizations.
 *
 * It also keeps us consistent with the export pipeline, which already strips
 * accents before writing CSV headers (`replace_spanish_characters` in
 * puente-flask-rest-aggregator: á→a, é→e, í→i, ó→o, ú→u, ñ→n, ü→u). A resolver
 * that did not fold them would disagree with the exporter about which records
 * belong to whom.
 *
 * NFD decomposition plus `\p{M}` covers those and every other diacritic,
 * rather than a hand-maintained character map that silently misses whatever was
 * not listed. `\p{M}` rather than the U+0300–U+036F range because that block is
 * only one of several — a mark from Combining Diacritical Marks Extended
 * (U+1AB0+) survived the range check and still blocked a match.
 *
 * Exported because three callers must agree on what "the same organization
 * name" means: this resolver, the admin surface checking a new alias for a
 * collision before saving, and the §6 backfill. If any of them normalized
 * differently they would disagree about which records belong to whom.
 */
export function normalizeOrganizationName(value) {
  if (typeof value !== 'string') return null;
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * Resolves an organization reference to a canonical `Organization`.
 *
 * Takes `{ pointer, name }` explicitly rather than reading a record, because
 * `organization` is a POINTER on record classes but a STRING on `_User` —
 * sniffing the shape would silently mis-read one of them.
 *
 * The pointer is canonical when present. The name is the organization string as
 * collected in the field, matched case-insensitively through `aliases` — which
 * is the fix for the live bug in §2, where a user whose organization is
 * "puente" matches no records saying "Puente" and sees an empty app with no
 * error.
 *
 * Returns `{ status: 'resolved', organization }` or `{ status: 'unresolved',
 * value }`. Never falls back to a "closest" organization: an unresolved record
 * is recoverable, a misattributed one is not.
 *
 * @throws {Error} when two organizations claim the same alias. Callers on a
 *   write path must catch this: a collision is an ops problem and must never
 *   reject work collected in the field.
 */
export function resolveOrganization({ pointer, name } = {}, organizations = []) {
  // A raw Parse pointer carries `objectId`; a hydrated Parse.Object carries
  // `id`. Reading only one silently ignores the other and falls through to
  // string matching, which is the silent mis-resolution this module exists to
  // prevent — so accept both.
  const pointerId = pointer && (pointer.objectId || pointer.id);
  if (pointerId) {
    const byPointer = organizations.find((o) => o.objectId === pointerId);
    if (byPointer) return { status: 'resolved', organization: byPointer };
  }

  const wanted = normalizeOrganizationName(name);
  const matches = wanted === null ? [] : organizations.filter(
    (o) => (o.aliases || []).some((alias) => normalizeOrganizationName(alias) === wanted),
  );

  // Two organizations claiming one alias misroutes records AND money, and a
  // wrong pointer is indistinguishable from a right one. Refuse rather than
  // pick. See docs/billing-and-invoicing.md §13 assumption 7.
  if (matches.length > 1) {
    const claimants = matches.map((o) => o.shortCode).join(', ');
    throw new Error(
      `Ambiguous organization alias "${name}": claimed by ${claimants}. `
      + 'Aliases must be unique across organizations.',
    );
  }

  if (matches.length === 1) return { status: 'resolved', organization: matches[0] };

  return { status: 'unresolved', value: name ?? null };
}

/**
 * Organizations that must never be offered in a user-facing picker.
 *
 * `internal-test` is the intended home for the junk values the 2026-08-28 alias
 * audit found (`testORG`, `Xyz`, Faker company names), so they resolve and never
 * bill. It is bookkeeping, not somewhere a real person signs up.
 *
 * NOTE: that Organization has not been created yet. This filter is inert until
 * it is.
 */
const NON_SELECTABLE_SHORT_CODES = new Set(['internal-test']);

/**
 * Maps `Organization` records to the shape the picker expects, sorted by name.
 *
 * Sorting uses the same folding as `normalizeOrganizationName` so that
 * "Asociación" files under A rather than after Z — these names are frequently
 * Spanish, and a picker that buries the accented ones is a picker people scroll
 * past.
 *
 * Inactive organizations are omitted: a retired partner must not be offerable
 * to a new account.
 */
export function toOrganizationOptions(records = []) {
  return (records || [])
    .filter((r) => r.get('active') !== false)
    .filter((r) => !NON_SELECTABLE_SHORT_CODES.has(r.get('shortCode')))
    .map((r) => ({ id: r.id, label: r.get('name'), shortCode: r.get('shortCode') }))
    .sort((a, b) => normalizeOrganizationName(a.label)
      .localeCompare(normalizeOrganizationName(b.label)));
}

/**
 * Upper bound on the organization fetch. Organizations are created by hand, so
 * this is a guard against an unbounded query rather than a page size.
 *
 * How many exist in production: as of 2026-08-28, ZERO. `createOrganization` is
 * deployed but has no caller in any repo, and the alias audit was explicitly
 * read-only. This picker therefore CANNOT SHIP until the records exist — an
 * empty list is a successful load, so registration would simply be impossible
 * with no error to explain it. See the merge gate in docs/billing-and-invoicing.md. If it is ever reached the picker is showing an incomplete list, so
 * the caller is told the load is unreliable rather than left to assume it is
 * complete.
 */
export const ORGANIZATION_FETCH_LIMIT = 500;

/**
 * Loads the organizations offerable at registration.
 *
 * Returns `{ options, unavailable }`. The flag matters more than it looks: an
 * empty dropdown because nothing loaded and an empty dropdown because no
 * organizations exist are indistinguishable to the person looking at it, and the
 * first must never present as the second. Same rule the dashboard applies to a
 * check that could not run.
 *
 * Runs before anyone is signed in, so it relies on the public read ACL the
 * Organization records carry.
 */
export async function loadOrganizations(Parse) {
  try {
    const query = new Parse.Query('Organization');
    query.select('name', 'shortCode', 'active');
    query.limit(ORGANIZATION_FETCH_LIMIT);
    const records = await query.find();

    return {
      options: toOrganizationOptions(records),
      unavailable: false,
      truncated: records.length === ORGANIZATION_FETCH_LIMIT,
    };
  } catch (error) {
    return { options: [], unavailable: true, truncated: false };
  }
}

/**
 * react-select hands react-hook-form the whole selected OPTION OBJECT
 * (`{ label, value }`), not a bare value. Everything downstream wants the
 * canonical name STRING:
 *
 *   - cloudcode's `signup` does `user.set('organization', String(organization))`,
 *     so an object is stored as the literal "[object Object]";
 *   - Collect renders `_User.organization` straight into JSX and matches records
 *     with an exact `equalTo` against `surveyingOrganization`;
 *   - `_User.organization` is declared `String` in both repos' schema.json.
 *
 * The option's `label` is the Organization's canonical `name` (see
 * toOrganizationOptions), which is the value records carry — so it is what makes
 * an account match its organization's existing data.
 *
 * The objectId is still on the option as `value`, for whenever _User gains a
 * real pointer. Storing the name today is not a decision against that.
 */
export function selectedOrganizationName(selection) {
  if (selection && typeof selection.label === 'string') return selection.label;
  return selection;
}
