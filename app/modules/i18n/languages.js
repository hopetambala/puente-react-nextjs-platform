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
  const match = LANGUAGES.find((language) => language.locale === locale);
  return match ? match.bcp47 : DEFAULT_BCP47;
}

module.exports = { LANGUAGES, toBcp47 };
