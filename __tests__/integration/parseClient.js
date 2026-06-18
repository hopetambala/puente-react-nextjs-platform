/**
 * Shared Parse client initialisation for integration tests.
 * Import this at the top of every integration test file.
 *
 * Parse Server v9 note: serverURL has no /parse path suffix because
 * parseServer.app routes are registered at the root level.
 */

const Parse = require('parse/node');

function initParse() {
  Parse.initialize(
    process.env.INTEGRATION_APP_ID,
    undefined,
    process.env.INTEGRATION_MASTER_KEY,
  );
  Parse.serverURL = process.env.INTEGRATION_SERVER_URL;
  return Parse;
}

module.exports = { initParse, Parse };
