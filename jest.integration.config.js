/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.integration.test.js'],
  globalSetup: './__tests__/integration/globalSetup.js',
  globalTeardown: './__tests__/integration/globalTeardown.js',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
};
