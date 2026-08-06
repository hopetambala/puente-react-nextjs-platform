import eng from 'public/locales/eng/common.json';

// The redesigned navigation keys must be translated in every non-English locale.
// If they fall through to the English string, switching language silently shows
// English nav labels — the bug Copilot flagged on PR #71.
const LOCALES = {
  ara: require('public/locales/ara/common.json'),
  deu: require('public/locales/deu/common.json'),
  ind: require('public/locales/ind/common.json'),
  prt: require('public/locales/prt/common.json'),
  zho: require('public/locales/zho/common.json'),
};

const NAV_KEYS = [
  'nav_form_manager',
  'nav_form_creator',
  'nav_data',
  'nav_marketplace',
  'nav_settings',
  'nav_logout',
];

describe('Locale translations — redesigned navigation', () => {
  Object.entries(LOCALES).forEach(([code, locale]) => {
    describe(code, () => {
      NAV_KEYS.forEach((key) => {
        it(`translates ${key} (not the English fallthrough)`, () => {
          expect(locale[key]).toBeTruthy();
          expect(locale[key]).not.toBe(eng[key]);
        });
      });
    });
  });
});

// Data assistant drawer strings must exist in every locale so the UI never
// renders a raw i18n key. (Translated values; English fallback acceptable.)
const ASSISTANT_KEYS = [
  'assistant_title',
  'assistant_beta',
  'assistant_open',
  'assistant_close',
  'assistant_placeholder',
  'assistant_send',
  'assistant_empty',
  'assistant_error',
  'assistant_tool_searching',
  'assistant_thinking',
];

describe('Locale translations — data assistant', () => {
  Object.entries({ eng, ...LOCALES }).forEach(([code, locale]) => {
    describe(code, () => {
      ASSISTANT_KEYS.forEach((key) => {
        it(`defines ${key}`, () => {
          expect(locale[key]).toBeTruthy();
        });
      });
    });
  });
});
