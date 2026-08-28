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

function checkLocaleParity({ defaultLocale, locales, catalogs }) {
  const missing = [];
  const source = catalogs[defaultLocale] || {};

  locales
    .filter((locale) => locale !== defaultLocale)
    .forEach((locale) => {
      const catalog = catalogs[locale] || {};
      Object.keys(source).forEach((namespace) => {
        const translations = catalog[namespace] || {};
        Object.keys(source[namespace]).forEach((key) => {
          if (key in translations) return;
          missing.push({ locale, namespace, key });
        });
      });
    });

  return { missing };
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
function formatParityReport({ missing }) {
  if (missing.length === 0) return '';

  const grouped = groupByLocale(missing);
  const lines = [''];

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

  return lines.join('\n');
}

module.exports = { checkLocaleParity, formatParityReport };
