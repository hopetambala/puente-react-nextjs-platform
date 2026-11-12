/**
 * Dates and money in the interface's language, not the browser's.
 *
 * Design review X18: four tables called toLocaleDateString() and billing used
 * Intl.NumberFormat(undefined), so a Spanish interface on an English browser
 * showed US month/day dates. Pass the interface's routing locale (eng/spa/hat,
 * `i18n.language` or `router.locale`); it is mapped to BCP 47 the same way
 * <html lang> is.
 */
import { toBcp47 } from './languages';

const EMPTY = '—';

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// When the runtime has no data for a language, the conventions its readers
// already use: Haiti formats dates and numbers as in French (day first), which
// is closer than English for Creole readers.
const FALLBACKS = { ht: 'fr-HT' };

const bcp47 = (locale) => {
  const tag = toBcp47(locale);
  try {
    if (Intl.DateTimeFormat.supportedLocalesOf([tag]).length) return tag;
    if (FALLBACKS[tag] && Intl.DateTimeFormat.supportedLocalesOf([FALLBACKS[tag]]).length) return FALLBACKS[tag];
  } catch {
    // An invalid tag: fall through to English.
  }
  return 'en';
};

/** A calendar date ("9/11/2026" in Spanish, "11/9/2026" in English). */
export function formatDate(value, locale) {
  const d = toDate(value);
  return d ? d.toLocaleDateString(bcp47(locale)) : EMPTY;
}

/** A date with its time. */
export function formatDateTime(value, locale) {
  const d = toDate(value);
  return d ? d.toLocaleString(bcp47(locale)) : EMPTY;
}

/** Stripe integer minor units as money in `currency` (default USD). */
export function formatMoney(minorUnits, currency, locale) {
  return new Intl.NumberFormat(bcp47(locale), {
    style: 'currency', currency: (currency || 'usd').toUpperCase(),
  }).format((minorUnits || 0) / 100);
}

