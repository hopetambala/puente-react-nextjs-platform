/**
 * Pure logic for the responsive a11y gate's known-failures allowlist, kept free
 * of Playwright so it can be unit-tested (__tests__/e2e/a11y-gate-lib.test.js).
 *
 * The allowlist maps `"<route> @ <width>"` to the rule ids that fail there,
 * across both languages. A rule id is an axe rule (`color-contrast`,
 * `landmark-one-main`, …) or one of the sweep's own checks (CUSTOM_RULES).
 */

/** The sweep's own checks, named like axe rules so both live in one list. */
export const CUSTOM_RULES = {
  reflow: 'An element extends past the viewport (WCAG 1.4.10 Reflow).',
  'target-min-24': 'A pointer target is smaller than 24×24px without the spacing exception (WCAG 2.5.8).',
  'text-spacing': 'Text is clipped when WCAG 1.4.12 text spacing is applied.',
  'focus-not-visible': 'An element reached by Tab shows no outline (WCAG 2.4.7, 2.4.11).',
  'focus-unreachable': 'Tab does not move focus into the page (WCAG 2.1.1).',
  'skip-link': 'The first Tab stop is not a skip link to the main content (WCAG 2.4.1).',
};

export const keyOf = (route, width) => `${route} @ ${width}`;

/** Split a key back into its route and width. */
export function parseKey(key) {
  const at = key.lastIndexOf(' @ ');
  return { route: key.slice(0, at), width: Number(key.slice(at + 3)) };
}

/**
 * Compare what a run found with the allowlist.
 *
 * `found` maps key → array of rule ids seen in any locale. Only keys in
 * `visited` are judged for fixes, so a filtered run (one route, one width)
 * never reports the rest of the allowlist as fixed.
 */
export function compareToAllowlist(found, allowlist, visited = Object.keys(found)) {
  const added = [];
  const fixed = [];
  const seen = new Set(visited);
  Object.entries(found).forEach(([key, rules]) => {
    const known = allowlist[key] ?? [];
    [...new Set(rules)].filter((r) => !known.includes(r)).sort().forEach((rule) => added.push({ key, rule }));
  });
  Object.entries(allowlist).forEach(([key, known]) => {
    if (!seen.has(key)) return;
    const now = found[key] ?? [];
    known.filter((r) => !now.includes(r)).forEach((rule) => fixed.push({ key, rule }));
  });
  return { added, fixed };
}

/** Route order first, then width ascending. */
export function sortKeys(a, b) {
  const x = parseKey(a);
  const y = parseKey(b);
  return x.route === y.route ? x.width - y.width : x.route.localeCompare(y.route);
}

/** The allowlist a run would write: found rules, sorted, empty keys dropped. */
export function toAllowlist(found) {
  return Object.fromEntries(Object.keys(found).sort(sortKeys)
    .filter((k) => found[k].length)
    .map((k) => [k, [...new Set(found[k])].sort()]));
}

/** Entry counts per route, for the tracker and the PR description. */
export function countsByRoute(allowlist) {
  const out = {};
  Object.entries(allowlist).forEach(([key, rules]) => {
    const { route } = parseKey(key);
    out[route] = (out[route] ?? 0) + rules.length;
  });
  return out;
}

export const total = (allowlist) => Object.values(allowlist).reduce((n, rules) => n + rules.length, 0);
