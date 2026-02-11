module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Exclude main entry point
    '!**/node_modules/**',
    '!**/test/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Transform
  transform: {},

  // Module name mapper (for path aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@handlers/(.*)$': '<rootDir>/src/handlers/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1'
  }
};
