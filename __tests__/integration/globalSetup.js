/**
 * Jest global setup — starts an in-memory MongoDB + local Parse Server.
 * Mirrors the cloud functions used by app/modules/cloud-code/crud/index.js
 * so integration tests run against real Parse behaviour with no external deps.
 *
 * Runs once before the entire integration suite. Stores server handles in
 * global so globalTeardown.js can shut them down cleanly.
 *
 * Parse Server v9 note: parseServer.app is an Express app with routes at
 * the root level (no /parse prefix). serverURL must match accordingly.
 */

const path = require('path');
const http = require('http');
const net = require('net');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ParseServer } = require('parse-server');

const TEST_APP_ID = 'puente-test-app';
const TEST_MASTER_KEY = 'puente-test-master';
const PORT = 1338;
const TEST_SERVER_URL = `http://127.0.0.1:${PORT}`;

async function waitForPort(port, retries = 20, delay = 500) {
  for (let i = 0; i < retries; i++) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection(port, '127.0.0.1');
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`Port ${port} not available after ${retries} retries`);
}

module.exports = async function globalSetup() {
  // ── 1. Start in-memory MongoDB ──────────────────────────────────────────
  const mongod = await MongoMemoryServer.create();

  // ── 2. Create and start Parse Server ────────────────────────────────────
  // cloud is a function receiving the server-side Parse — the most reliable
  // pattern for parse-server v9 (avoids global.Parse timing issues).
  const parseServer = new ParseServer({
    appId: TEST_APP_ID,
    masterKey: TEST_MASTER_KEY,
    serverURL: TEST_SERVER_URL,
    databaseURI: mongod.getUri(),
    allowClientClassCreation: true,
    enforcePrivateUsers: false,
    cloud: require(path.join(__dirname, 'cloudCode.js')),
    silent: true,
    logLevel: 'error',
  });

  await parseServer.start();

  // v9: parseServer.app is the Express app with routes at the root level
  const httpServer = http.createServer(parseServer.app);
  await new Promise((resolve, reject) => {
    httpServer.listen(PORT, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });

  await waitForPort(PORT);

  // ── 3. Store handles for teardown ────────────────────────────────────────
  global.__PARSE_SERVER_INSTANCE__ = parseServer;
  global.__PARSE_MONGOD__ = mongod;
  global.__PARSE_SERVER__ = httpServer;

  // ── 4. Export config so test files can initialise their own Parse client ─
  process.env.INTEGRATION_APP_ID = TEST_APP_ID;
  process.env.INTEGRATION_MASTER_KEY = TEST_MASTER_KEY;
  process.env.INTEGRATION_SERVER_URL = TEST_SERVER_URL;
};
