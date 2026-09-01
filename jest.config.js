const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@testing-library/react$':
      '<rootDir>/__test-utils__/testing-library-react-shim.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    // Agent worktrees are full checkouts of this repo living inside it, so
    // Jest collected their __tests__ as well as ours — 40 extra suites and 201
    // failures from stale copies running against current source. `.claude/` is
    // gitignored, so CI never saw them and stayed green while every local run
    // looked broken. Ignoring the directory keeps local runs honest and means
    // a new worktree cannot re-introduce the noise.
    '<rootDir>/.claude/',
    '<rootDir>/__tests__/integration/',
    '\\.integration\\.test\\.js$',
  ],
  // Same directory, second mechanism: without this, the duplicate package.json
  // and modules inside each worktree collide with ours in module resolution.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
});
