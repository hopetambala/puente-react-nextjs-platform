/**
 * Jest global teardown — shuts down the Parse Server and MongoDB instance
 * started in globalSetup.js.
 */

module.exports = async function globalTeardown() {
  if (global.__PARSE_SERVER_INSTANCE__) {
    try {
      await global.__PARSE_SERVER_INSTANCE__.handleShutdown();
    } catch (e) {
      // ignore — shutdown errors are non-fatal in test cleanup
    }
  }
  if (global.__PARSE_SERVER__) {
    await new Promise((resolve) => {
      global.__PARSE_SERVER__.closeAllConnections?.();
      global.__PARSE_SERVER__.close(resolve);
    });
  }
  if (global.__PARSE_MONGOD__) {
    await global.__PARSE_MONGOD__.stop();
  }
};
