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
    '<rootDir>/__tests__/integration/',
  ],
});
