const path = require('path');
const withImages = require('next-images');
const { i18n } = require('./next-i18next.config');

module.exports = withImages({
  i18n,
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  async redirects() {
    return [];
  },
});
