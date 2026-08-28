const path = require('path');
const withImages = require('next-images');
const { i18n } = require('./next-i18next.config');

module.exports = withImages({
  i18n,
  // `next lint` defaults to pages/, components/, lib/, src/ — none of which is
  // where this app keeps its code. Without `app` listed, the CI lint job passed
  // while never looking at app/epics, app/modules, app/services or the design
  // system. It reported green over a dead `else if` in the Form Creator.
  eslint: { dirs: ['pages', 'app'] },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  async redirects() {
    return [];
  },
});
