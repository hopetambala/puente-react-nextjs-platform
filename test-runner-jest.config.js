const { getJestConfig } = require('@storybook/test-runner');

// The default Jest configuration comes from @storybook/test-runner
const testRunnerConfig = getJestConfig();

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...testRunnerConfig,
  // The runner finds its root by walking up to a `.git` DIRECTORY. In a git
  // worktree `.git` is a file, so it walked on to ~/.yarn and crawled the whole
  // home directory (other repos' mocks and snapshots included). Pin it here.
  rootDir: __dirname,
  // Same reason as jest.config.js: agent worktrees under .claude/ are full
  // copies of this repo, stories included.
  testPathIgnorePatterns: [...(testRunnerConfig.testPathIgnorePatterns ?? []), '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
};
