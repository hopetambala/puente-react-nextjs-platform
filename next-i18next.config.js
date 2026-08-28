const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'eng',
    // A locale is listed here only when its catalog is COMPLETE. The parity
    // test in __tests__/locales/translations.test.js enforces that, with no
    // allowlist: adding a locale before a human has translated every key
    // fails CI. ara/deu/ind/prt/zho were retired 2026-08-28 — they were
    // Next.js template leftovers with no Dominican Republic relevance, 47
    // keys stale since June, and silently rendering English to anyone who
    // reached them.
    locales: ['eng'],
  },
  localePath: path.resolve('./public/locales'),
};
