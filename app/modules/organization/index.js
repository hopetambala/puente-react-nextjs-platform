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
