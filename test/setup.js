/**
 * Test Setup
 * Common setup for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test_token';
process.env.MONGODB_URI = 'mongodb://localhost:27017/bot_test';
process.env.BOT_OWNERS = '12345,67890';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  // Add cleanup logic here if needed
});
