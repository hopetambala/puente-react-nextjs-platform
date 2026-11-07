import {
  compareToAllowlist, countsByRoute, keyOf, parseKey, sortKeys, toAllowlist, total,
} from '../../e2e/lib/a11y-gate-lib.mjs';

/**
 * The responsive a11y gate's allowlist logic. This decides whether a PR's
 * accessibility regressed, so it gets the same treatment as harness-lib: a
 * gate that can't fail, or fails on the wrong thing, is worse than none.
 */

describe('keys', () => {
  it('round-trips a route and width, including routes with spaces or @', () => {
    expect(parseKey(keyOf('/account/login', 375))).toEqual({ route: '/account/login', width: 375 });
    expect(parseKey(keyOf('/a @ b', 1440))).toEqual({ route: '/a @ b', width: 1440 });
  });

  it('sorts by route, then width numerically', () => {
    const keys = ['/b @ 320', '/a @ 1440', '/a @ 375'];
    expect(keys.sort(sortKeys)).toEqual(['/a @ 375', '/a @ 1440', '/b @ 320']);
  });
});

describe('compareToAllowlist', () => {
  const allowlist = { '/a @ 375': ['color-contrast', 'reflow'] };

  it('passes when every failure is listed', () => {
    expect(compareToAllowlist({ '/a @ 375': ['reflow', 'color-contrast'] }, allowlist))
      .toEqual({ added: [], fixed: [] });
  });

  it('reports a new rule on a known key, and any rule on an unknown key', () => {
    const { added } = compareToAllowlist({ '/a @ 375': ['reflow', 'skip-link'], '/b @ 320': ['label'] }, allowlist);
    expect(added).toEqual([{ key: '/a @ 375', rule: 'skip-link' }, { key: '/b @ 320', rule: 'label' }]);
  });

  it('reports listed rules that no longer occur as fixed', () => {
    expect(compareToAllowlist({ '/a @ 375': ['reflow'] }, allowlist).fixed)
      .toEqual([{ key: '/a @ 375', rule: 'color-contrast' }]);
    expect(compareToAllowlist({ '/a @ 375': [] }, allowlist).fixed).toHaveLength(2);
  });

  it('never reports a key it did not visit as fixed (filtered runs)', () => {
    expect(compareToAllowlist({ '/b @ 320': [] }, allowlist, ['/b @ 320']).fixed).toEqual([]);
  });

  it('counts a duplicate rule once', () => {
    expect(compareToAllowlist({ '/b @ 320': ['label', 'label'] }, {}).added).toHaveLength(1);
  });
});

describe('toAllowlist / counts', () => {
  const found = { '/b @ 320': ['z', 'a', 'a'], '/a @ 1440': ['x'], '/a @ 375': [] };

  it('drops clean keys, de-duplicates and sorts', () => {
    expect(toAllowlist(found)).toEqual({ '/a @ 1440': ['x'], '/b @ 320': ['a', 'z'] });
    expect(Object.keys(toAllowlist(found))).toEqual(['/a @ 1440', '/b @ 320']);
  });

  it('totals entries overall and per route', () => {
    const list = toAllowlist(found);
    expect(total(list)).toBe(3);
    expect(countsByRoute(list)).toEqual({ '/a': 1, '/b': 2 });
  });
});
