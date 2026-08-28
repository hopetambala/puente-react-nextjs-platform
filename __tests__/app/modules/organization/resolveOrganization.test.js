import { normalizeOrganizationName, resolveOrganization } from 'app/modules/organization';

// An Organization as the resolver sees it. `aliases` holds every organization
// string ever observed in the wild for this org — see docs/billing-and-invoicing.md §3.
const org = (shortCode, aliases) => ({ objectId: `id-${shortCode}`, shortCode, aliases });

const WOF = org('wof', ['WOF', 'World Outreach Fund']);

describe('resolveOrganization', () => {
  // The resolver takes { pointer, name } explicitly rather than reading a record,
  // because `organization` is a POINTER on record classes but a STRING on _User.
  // Sniffing the shape would silently mis-read one of them.
  it('resolves a raw organization string through an alias', () => {
    const result = resolveOrganization({ name: 'WOF' }, [WOF]);

    expect(result.status).toBe('resolved');
    expect(result.organization.shortCode).toBe('wof');
  });

  it('prefers the pointer over the name when both are present', () => {
    // After the backfill a record carries BOTH. The pointer is canonical; the
    // string is retained only as collected provenance (§3).
    const result = resolveOrganization(
      { pointer: { objectId: 'id-wof' }, name: 'Puente' },
      [WOF, org('puente', ['Puente'])],
    );

    expect(result.status).toBe('resolved');
    expect(result.organization.shortCode).toBe('wof');
  });

  it('resolves despite case and surrounding whitespace', () => {
    // THE bug from §2: a user whose org is "puente" matches no records saying
    // "Puente" and sees an empty app with no error. Under billing the same typo
    // becomes an unbillable account.
    const result = resolveOrganization({ name: '  wof ' }, [WOF]);

    expect(result.status).toBe('resolved');
    expect(result.organization.shortCode).toBe('wof');
  });

  it('raises when two organizations claim the same alias', () => {
    // A collision misroutes records AND money, and a wrong pointer looks exactly
    // like a right one. `.find()` picking the first match is precisely the
    // silent failure this must not have. See §11 assumption 7.
    const collide = () => resolveOrganization(
      { name: 'PDC' },
      [org('wof', ['PDC']), org('puente', ['pdc'])],
    );

    expect(collide).toThrow(/PDC/i);
  });

  it('accepts a Parse object pointer, which exposes .id rather than .objectId', () => {
    // A caller passing record.get('organization') hands over a Parse.Object,
    // whose id lives on `.id`. Reading only `.objectId` would silently ignore
    // the pointer and fall through to string matching — the exact silent
    // fallthrough this module exists to prevent.
    const parseObjectPointer = { id: 'id-wof', className: 'Organization' };

    const result = resolveOrganization(
      { pointer: parseObjectPointer, name: 'Puente' },
      [WOF, org('puente', ['Puente'])],
    );

    expect(result.status).toBe('resolved');
    expect(result.organization.shortCode).toBe('wof');
  });

  // ─── Guards ────────────────────────────────────────────────────────────────
  // These pin properties the implementation already has. They are regression
  // guards, not drivers — each passed on first run.

  it('returns unresolved for an unknown string, never a fallback organization', () => {
    // The single most important property. A silent fallback would attribute a
    // record — and an invoice line — to the wrong organization. Unresolved is
    // recoverable; misattributed is not.
    const result = resolveOrganization({ name: 'Some Org We Have Never Seen' }, [WOF]);

    expect(result.status).toBe('unresolved');
    expect(result.organization).toBeUndefined();
    expect(result.value).toBe('Some Org We Have Never Seen');
  });

  it('returns unresolved rather than throwing when there are no organizations', () => {
    expect(resolveOrganization({ name: 'WOF' }, []).status).toBe('unresolved');
  });

  it('does not match an organization that has no aliases', () => {
    expect(resolveOrganization({ name: 'wof' }, [org('wof', [])]).status).toBe('unresolved');
  });

  it('treats a missing name as unresolved, not as a match on empty', () => {
    // An org with a stray '' alias must not become a catch-all for every record
    // whose organization was never set.
    expect(resolveOrganization({}, [org('wof', [''])]).status).toBe('unresolved');
    expect(resolveOrganization({ name: null }, [org('wof', [''])]).status).toBe('unresolved');
  });

  it('falls back to the name when the pointer references an unknown organization', () => {
    // A pointer to a deleted org should not strand a record that still carries a
    // usable collected string.
    const result = resolveOrganization({ pointer: { objectId: 'id-gone' }, name: 'WOF' }, [WOF]);

    expect(result.status).toBe('resolved');
    expect(result.organization.shortCode).toBe('wof');
  });
});

describe('normalizeOrganizationName', () => {
  // Exported because the admin surface must detect a collision BEFORE a human
  // saves a new alias, and the §6 backfill compares on the same basis. Both
  // must normalize identically to the resolver or they disagree about matches.
  it('folds case and trims surrounding whitespace', () => {
    expect(normalizeOrganizationName('  World Outreach Fund ')).toBe('world outreach fund');
  });

  it('returns null for a non-string, so absent never collides with empty', () => {
    expect(normalizeOrganizationName(undefined)).toBeNull();
    expect(normalizeOrganizationName(null)).toBeNull();
  });
});
