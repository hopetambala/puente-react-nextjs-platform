/**
 * The three languages Puente supports, in one place.
 *
 * This table is consumed by the LanguageSwitcher (which needs `endonym`) and
 * by pages/_document.js (which needs `bcp47` for `<Html lang>`). They used to
 * disagree: _document hardcoded lang="en", so every Spanish and Creole page
 * announced itself to screen readers as English.
 *
 * `locale` — Manage's ISO 639-2/T routing code, matching next-i18next.config.js.
 *            Collect uses en/es/hk for the same three languages.
 * `bcp47`  — what the HTML `lang` attribute requires: the SHORTEST available
 *            ISO 639 code. "spa"/"hat" are invalid there because "es"/"ht"
 *            exist, and assistive technology given an invalid tag will not
 *            select the right pronunciation.
 * `endonym` — the language written in ITSELF, never translated. Someone who
 *            cannot read the current UI language must still recognise their
 *            own.
 *
 * Deliberately does NOT import next-i18next.config.js: that file requires
 * Node's `path`, which would land in the browser bundle. A test asserts the
 * two agree instead.
 */
const LANGUAGES = [
  { locale: 'eng', bcp47: 'en', endonym: 'English' },
  { locale: 'spa', bcp47: 'es', endonym: 'Español' },
  { locale: 'hat', bcp47: 'ht', endonym: 'Kreyòl Ayisyen' },
];

const DEFAULT_BCP47 = 'en';

/**
 * Map a routing locale to its HTML `lang` value. Falls back to the default
 * language rather than emitting an empty or bogus tag: _document renders
 * before a locale is resolved on some error paths, and `lang="undefined"` is
 * worse for a screen reader than a wrong-but-valid tag.
 */
function toBcp47(locale) {
  const byRoutingId = LANGUAGES.find((language) => language.locale === locale);
  if (byRoutingId) return byRoutingId.bcp47;
  // Idempotent: an already-correct tag maps to itself, so re-syncing a page
  // that the server rendered correctly cannot clobber it back to the default.
  const byTag = LANGUAGES.find((language) => language.bcp47 === locale);
  if (byTag) return byTag.bcp47;
  return DEFAULT_BCP47;
}

/**
 * Remove a leading locale segment from a URL path.
 *
 * Routing checks in the app (notably the auth guard's public-path list in
 * pages/_app.js) are written WITHOUT locale prefixes. On initial load that
 * works, because Next strips the locale from `router.asPath`. But
 * `routeChangeComplete` hands over the full URL, so after a language switch
 * `/spa/account/login` fails a list that only contains `/account/login`, and
 * the guard blanks a public page.
 *
 * Matching is segment-exact on purpose: `/spades/x` must not become `/des/x`.
 */
function stripLocalePrefix(path) {
  const withoutQuery = String(path).split('?')[0];
  const segments = withoutQuery.split('/');
  const isLocale = LANGUAGES.some((language) => language.locale === segments[1]);
  if (!isLocale) return withoutQuery;

  const rest = `/${segments.slice(2).join('/')}`;
  if (rest === '/') return '/';
  return rest.replace(/\/$/, '') || '/';
}

/**
 * Re-assert <html lang> as a BCP 47 tag.
 *
 * _document gets this right on the server, but Next overwrites
 * documentElement.lang with the RAW routing locale on a client-side locale
 * change, so a page served as lang="es" silently becomes lang="spa" the
 * moment someone uses the language switcher without a reload.
 */
function syncDocumentLanguage(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = toBcp47(locale);
}

module.exports = {
  LANGUAGES, stripLocalePrefix, syncDocumentLanguage, toBcp47,
};
