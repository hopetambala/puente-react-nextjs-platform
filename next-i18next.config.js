const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'eng',
    locales: ['eng', 'ara', 'deu', 'ind', 'prt', 'zho'],
  },
  localePath: path.resolve('./public/locales'),
};
