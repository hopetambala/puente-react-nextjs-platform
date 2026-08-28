/**
 * Locale parity checking.
 *
 * A locale that next-i18next ships must define every key the default locale
 * defines, in every namespace. There is no allowlist and no grace period: a
 * partially translated locale is worse than an absent one, because with no
 * explicit `fallbackLng` a missing key silently renders the English string.
 * The gap is invisible at runtime, so it has to be visible in CI.
 *
 * Pure functions over already-loaded catalogs, so they can be unit tested
 * without touching the filesystem. A catalog is `{ [namespace]: { [key]: value } }`.
 */

/**
 * i18next substitutes `{{count}}` and friends at render time. A translation
 * that drops one renders a sentence with the number missing; one that renames
 * it renders the literal "{{nombre}}" to the user. Key-presence parity cannot
 * see either failure, so the sets are compared directly. Order does not
 * matter — languages reorder clauses.
 */
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
        const translations = catalog[namespace] || {};
        Object.keys(source[namespace]).forEach((key) => {
          if (!(key in translations)) {
            missing.push({ locale, namespace, key });
            return;
          }
          const expected = placeholdersIn(source[namespace][key]);
          const actual = placeholdersIn(translations[key]);
          if (expected.join('|') !== actual.join('|')) {
            placeholders.push({
              locale, namespace, key, expected, actual,
            });
          }
        });
      });

      // The mirror of `missing`: a key this locale defines that the default
      // locale does not. Usually a key English dropped and the translation
      // kept, or — as in the retired `deu` catalog — a key whose NAME was
      // translated, stranding a real translation no t() call could reach.
      Object.keys(catalog).forEach((namespace) => {
        Object.keys(catalog[namespace]).forEach((key) => {
          if (source[namespace] && key in source[namespace]) return;
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

/**
 * Render the gap as an actionable failure message: which locale, which
 * namespace, which key.
 */
function formatParityReport({ missing = [], placeholders = [], unexpected = [] }) {
  if (missing.length === 0 && placeholders.length === 0 && unexpected.length === 0) {
    return '';
  }

  const lines = [''];

  if (missing.length > 0) {
    const grouped = groupByLocale(missing);
    Object.keys(grouped)
      .sort()
      .forEach((locale) => {
        const entries = grouped[locale].sort();
        lines.push(`  ${locale} is missing ${entries.length} key(s):`);
        entries.forEach((entry) => lines.push(`    - ${entry}`));
      });
    lines.push('');
    lines.push(
      '  A locale ships only when it is complete. Have a human translator supply',
    );
    lines.push(
      '  these strings, or remove the locale from next-i18next.config.js.',
    );
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
    lines.push(
      '  A dropped or renamed placeholder renders the wrong text to the user,',
    );
    lines.push('  so it fails the build even though the key exists.');
  }

  if (unexpected.length > 0) {
    lines.push('');
    const grouped = groupByLocale(unexpected);
    Object.keys(grouped)
      .sort()
      .forEach((locale) => {
        const entries = grouped[locale].sort();
        lines.push(`  ${locale} defines ${entries.length} key(s) English does not:`);
        entries.forEach((entry) => lines.push(`    - ${entry}`));
      });
    lines.push('');
    lines.push(
      '  Delete these, or add the key to the default locale. A key only this',
    );
    lines.push(
      '  locale has is unreachable — no t() call in the app can resolve it.',
    );
  }

  return lines.join('\n');
}

module.exports = { checkLocaleParity, formatParityReport };
