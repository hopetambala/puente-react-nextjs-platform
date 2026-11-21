import { toOrganizationOptions } from 'app/modules/organization';

// A Parse record as the picker sees it.
const rec = (id, name, shortCode, active = true) => ({
  id,
  get: (k) => ({ name, shortCode, active }[k]),
});

describe('toOrganizationOptions', () => {
  it('maps records to the shape the picker expects', () => {
    const options = toOrganizationOptions([rec('id1', 'World Outreach Fund', 'wof')]);

    expect(options).toEqual([{ id: 'id1', label: 'World Outreach Fund', shortCode: 'wof' }]);
  });

  it('sorts by name so the list is scannable, not insertion-ordered', () => {
    const options = toOrganizationOptions([
      rec('c', 'Solea Water', 'solea'),
      rec('a', 'Cevicos', 'cevicos'),
      rec('b', 'Puente', 'puente'),
    ]);

    expect(options.map((o) => o.label)).toEqual(['Cevicos', 'Puente', 'Solea Water']);
  });

  it('sorts case- and accent-insensitively, since names are Spanish', () => {
    const options = toOrganizationOptions([
      rec('b', 'Ayuda', 'ayuda'),
      rec('a', 'Asociación para el impacto', 'asoc'),
    ]);

    expect(options.map((o) => o.label)).toEqual(['Asociación para el impacto', 'Ayuda']);
  });

  it('omits inactive organizations', () => {
    // An organization that has been retired must not be offerable to a new user.
    const options = toOrganizationOptions([
      rec('a', 'Live Org', 'live'),
      rec('b', 'Retired Org', 'retired', false),
    ]);

    expect(options.map((o) => o.label)).toEqual(['Live Org']);
  });

  it('omits the internal test organization from a user-facing picker', () => {
    // `internal-test` exists so ~830 junk records resolve and never bill. It is
    // not something a real person should be able to sign up under.
    const options = toOrganizationOptions([
      rec('a', 'Puente', 'puente'),
      rec('b', 'Internal / test', 'internal-test'),
    ]);

    expect(options.map((o) => o.shortCode)).toEqual(['puente']);
  });

  it('returns an empty list rather than throwing when nothing loaded', () => {
    expect(toOrganizationOptions([])).toEqual([]);
    expect(toOrganizationOptions(undefined)).toEqual([]);
  });
});

// The registration picker showed an entry called "[object Object]" at the top,
// in production and test (documented in the onboarding guide). Signup once
// stored String(option object) as an organization; the register page no longer
// does, but a record named that way, or with a non-string name, must not be
// offered as an organization someone can join.
describe('toOrganizationOptions: corrupt names', () => {
  const named = (id, name) => ({ id, get: (k) => ({ name, shortCode: id, active: true }[k]) });

  it('drops a record literally named "[object Object]"', () => {
    const options = toOrganizationOptions([named('bad', '[object Object]'), named('ok', 'Puente')]);
    expect(options.map((o) => o.label)).toEqual(['Puente']);
  });

  it('drops a record whose name is not a non-empty string', () => {
    const options = toOrganizationOptions([
      named('obj', { label: 'Puente' }), named('blank', '  '), named('ok', 'Puente'),
    ]);
    expect(options.map((o) => o.label)).toEqual(['Puente']);
  });
});

