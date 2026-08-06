const path = require('path');
const withImages = require('next-images');
const { i18n } = require('./next-i18next.config');

module.exports = withImages({
  i18n,
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  // 'ai' and '@ai-sdk/openai' are ESM-only packages loaded from the CommonJS
  // server module server/agent/agent.js via dynamic import. 'loose' lets
  // webpack resolve ESM externals from CJS contexts (Next's documented fix).
  experimental: {
    esmExternals: 'loose',
  },
  async redirects() {
    return [];
  },
});
