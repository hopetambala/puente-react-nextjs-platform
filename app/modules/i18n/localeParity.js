/**
 * Locale parity checking.
 *
 * A locale that next-i18next ships must define every key the default locale
 * defines, in every namespace. There is no allowlist and no grace period: a
 * partially translated locale is worse than an absent one, because with no
 * explicit `fallbackLng` a missing key silently renders the English string.
 * The gap is invisible at runtime, so it has to be visible in CI.
 *
 * Three checks:
 *
 *   missing      — a key the default locale defines that this locale lacks.
 *   placeholders — the interpolation tokens in a value must match the source's.
 *                  A key can exist and still be broken: i18next substitutes
 *                  `{{count}}` at render time, so dropping it renders a
 *                  sentence with the number missing, and renaming it renders
 *                  the literal `{{nombre}}` to the user.
 *   unexpected   — a key only this locale defines. It is unreachable, since no
 *                  `t()` call resolves it. The retired `deu` catalog held a key
 *                  literally named `zurück` — a translated KEY name — stranding
 *                  a real translation nothing could display.
 *
 * Pure functions over already-loaded catalogs, so they can be unit tested
 * without touching the filesystem. A catalog is `{ [namespace]: { ... } }`.
 */

/**
 * next-i18next supports nested JSON (Collect's catalogs are nested; Manage's
 * are flat). Comparing only top-level keys would fail OPEN on a nested
 * catalog: a child could vanish and every check would still pass. Flattening
 * to dotted paths makes the checks correct for either shape.
 */
function flatten(value, prefix) {
  return Object.keys(value).reduce((acc, key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const child = value[key];
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return { ...acc, ...flatten(child, path) };
    }
    return { ...acc, [path]: child };
  }, {});
}

/** Order-insensitive: languages legitimately reorder clauses. */
function placeholdersIn(value) {
  return [...String(value).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

function checkLocaleParity({ defaultLocale, locales, catalogs }) {
  const missing = [];
  const placeholders = [];
  const unexpected = [];
  const source = catalogs[defaultLocale] || {};

  locales
    .filter((locale) => locale !== defaultLocale)
    .forEach((locale) => {
      const catalog = catalogs[locale] || {};

      Object.keys(source).forEach((namespace) => {
        const expectedEntries = flatten(source[namespace], '');
        const actualEntries = flatten(catalog[namespace] || {}, '');

        Object.keys(expectedEntries).forEach((key) => {
          if (!(key in actualEntries)) {
            missing.push({ locale, namespace, key });
            return;
          }
          const expected = placeholdersIn(expectedEntries[key]);
          const actual = placeholdersIn(actualEntries[key]);
          if (expected.join('|') !== actual.join('|')) {
            placeholders.push({
              locale, namespace, key, expected, actual,
            });
          }
        });
      });

      Object.keys(catalog).forEach((namespace) => {
        const expectedEntries = source[namespace] ? flatten(source[namespace], '') : {};
        Object.keys(flatten(catalog[namespace], '')).forEach((key) => {
          if (key in expectedEntries) return;
          unexpected.push({ locale, namespace, key });
        });
      });
    });

  return { missing, placeholders, unexpected };
}

function groupByLocale(violations) {
  return violations.reduce((acc, v) => {
    const entry = `${v.namespace}:${v.key}`;
    return { ...acc, [v.locale]: (acc[v.locale] || []).concat(entry) };
  }, {});
}

function listSection(lines, violations, describe) {
  const grouped = groupByLocale(violations);
  Object.keys(grouped)
    .sort()
    .forEach((locale) => {
      const entries = grouped[locale].sort();
      lines.push(`  ${describe(locale, entries.length)}`);
      entries.forEach((entry) => lines.push(`    - ${entry}`));
    });
}

/**
 * Render the gap as an actionable failure message: which locale, which
 * namespace, which key, and what to do about it.
 */
function formatParityReport({ missing = [], placeholders = [], unexpected = [] }) {
  if (missing.length === 0 && placeholders.length === 0 && unexpected.length === 0) {
    return '';
  }

  const lines = [''];

  if (missing.length > 0) {
    listSection(lines, missing, (locale, count) => `${locale} is missing ${count} key(s):`);
    lines.push('');
    lines.push('  A locale ships only when it is complete. Have a human translator supply');
    lines.push('  these strings, or remove the locale from next-i18next.config.js.');
  }

  if (placeholders.length > 0) {
    lines.push('');
    placeholders.forEach(({
      locale, namespace, key, expected, actual,
    }) => {
      lines.push(
        `  ${locale} ${namespace}:${key} — placeholders differ: `
          + `English has [${expected.join(', ')}], translation has [${actual.join(', ')}]`,
      );
    });
    lines.push('');
    lines.push('  A dropped or renamed placeholder renders the wrong text to the user,');
    lines.push('  so it fails the build even though the key exists.');
  }

  if (unexpected.length > 0) {
    lines.push('');
    listSection(
      lines,
      unexpected,
      (locale, count) => `${locale} defines ${count} key(s) English does not:`,
    );
    lines.push('');
    lines.push('  Delete these, or add the key to the default locale. A key only this');
    lines.push('  locale has is unreachable — no t() call in the app can resolve it.');
  }

  return lines.join('\n');
}

module.exports = { checkLocaleParity, formatParityReport };
