/**
 * Logger Unit Tests
 */

const { Logger } = require('../../src/utils/logger');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
  let logger;
  let testLogsDir;

  beforeEach(() => {
    // Create a test logger with a separate logs directory
    testLogsDir = path.join(__dirname, '../../logs/test');
    logger = new Logger();
  });

  afterEach(() => {
    // Clean up test logs
    if (fs.existsSync(testLogsDir)) {
      const files = fs.readdirSync(testLogsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testLogsDir, file));
      });
      fs.rmdirSync(testLogsDir);
    }
  });

  describe('formatMessage', () => {
    it('should format message with timestamp and level', () => {
      const message = logger.formatMessage('INFO', 'Test message');
      expect(message).toContain('[INFO]');
      expect(message).toContain('Test message');
    });

    it('should include error stack trace', () => {
      const error = new Error('Test error');
      const message = logger.formatMessage('ERROR', 'Error occurred', error);
      expect(message).toContain('Test error');
      expect(message).toContain('Error:');
    });

    it('should stringify objects', () => {
      const data = { key: 'value', number: 42 };
      const message = logger.formatMessage('INFO', 'Data log', data);
      expect(message).toContain('"key"');
      expect(message).toContain('"value"');
    });
  });

  describe('log methods', () => {
    it('should log info messages', () => {
      expect(() => logger.info('Info message')).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should log success messages', () => {
      expect(() => logger.success('Success message')).not.toThrow();
    });
  });

  describe('logInteraction', () => {
    it('should log user interactions', () => {
      expect(() => {
        logger.logInteraction(12345, 'button_click', { button: 'start' });
      }).not.toThrow();
    });
  });

  describe('logCommand', () => {
    it('should log successful commands', () => {
      expect(() => {
        logger.logCommand('start', 12345, true);
      }).not.toThrow();
    });

    it('should log failed commands', () => {
      expect(() => {
        logger.logCommand('start', 12345, false);
      }).not.toThrow();
    });
  });

  describe('logApiCall', () => {
    it('should log API calls', () => {
      expect(() => {
        logger.logApiCall('telegram', 'POST', true, 150);
      }).not.toThrow();
    });
  });

  describe('logDatabase', () => {
    it('should log database operations', () => {
      expect(() => {
        logger.logDatabase('find', 'User', true);
      }).not.toThrow();
    });

    it('should log failed database operations', () => {
      const error = new Error('DB error');
      expect(() => {
        logger.logDatabase('create', 'User', false, error);
      }).not.toThrow();
    });
  });

  describe('getLogFileName', () => {
    it('should return log file name with current date', () => {
      const fileName = logger.getLogFileName();
      const date = new Date().toISOString().split('T')[0];
      expect(fileName).toContain(date);
      expect(fileName).toContain('.log');
    });
  });
});
