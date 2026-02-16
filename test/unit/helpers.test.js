/**
 * Helpers Unit Tests
 */

const { logger, validators, helpers, safeSend } = require('../../src/utils/helpers');

describe('Helpers', () => {
  describe('logger', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation()
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log info messages with timestamp', () => {
      logger.info('Test info message');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log.mock.calls[0][0]).toContain('[INFO]');
      expect(consoleSpy.log.mock.calls[0][0]).toContain('Test info message');
    });

    it('should log error messages with timestamp and error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error.mock.calls[0][0]).toContain('[ERROR]');
      expect(consoleSpy.error.mock.calls[0][0]).toContain('Error occurred');
      expect(consoleSpy.error.mock.calls[0][1]).toBe(error);
    });

    it('should log warning messages with timestamp', () => {
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn.mock.calls[0][0]).toContain('[WARN]');
      expect(consoleSpy.warn.mock.calls[0][0]).toContain('Warning message');
    });
  });

  describe('validators', () => {
    describe('isValidUserId', () => {
      it('should return true for valid positive numbers', () => {
        expect(validators.isValidUserId(12345)).toBe(true);
        expect(validators.isValidUserId(1)).toBe(true);
        expect(validators.isValidUserId(999999999)).toBe(true);
      });

      it('should return false for zero', () => {
        expect(validators.isValidUserId(0)).toBe(false);
      });

      it('should return false for negative numbers', () => {
        expect(validators.isValidUserId(-1)).toBe(false);
        expect(validators.isValidUserId(-12345)).toBe(false);
      });

      it('should return false for non-number types', () => {
        expect(validators.isValidUserId('12345')).toBe(false);
        expect(validators.isValidUserId(null)).toBe(false);
        expect(validators.isValidUserId(undefined)).toBe(false);
        expect(validators.isValidUserId({})).toBe(false);
        expect(validators.isValidUserId([])).toBe(false);
      });
    });

    describe('isValidGroupId', () => {
      it('should return true for strings', () => {
        expect(validators.isValidGroupId('group123')).toBe(true);
        expect(validators.isValidGroupId('-100123456789')).toBe(true);
        expect(validators.isValidGroupId('')).toBe(true);
      });

      it('should return true for numbers', () => {
        expect(validators.isValidGroupId(12345)).toBe(true);
        expect(validators.isValidGroupId(-100123456789)).toBe(true);
        expect(validators.isValidGroupId(0)).toBe(true);
      });

      it('should return false for non-string and non-number types', () => {
        expect(validators.isValidGroupId(null)).toBe(false);
        expect(validators.isValidGroupId(undefined)).toBe(false);
        expect(validators.isValidGroupId({})).toBe(false);
        expect(validators.isValidGroupId([])).toBe(false);
      });
    });

    describe('isValidAmount', () => {
      it('should return true for positive numbers', () => {
        expect(validators.isValidAmount(1)).toBe(true);
        expect(validators.isValidAmount(100)).toBe(true);
        expect(validators.isValidAmount(0.5)).toBe(true);
        expect(validators.isValidAmount(999999)).toBe(true);
      });

      it('should return false for zero', () => {
        expect(validators.isValidAmount(0)).toBe(false);
      });

      it('should return false for negative numbers', () => {
        expect(validators.isValidAmount(-1)).toBe(false);
        expect(validators.isValidAmount(-100)).toBe(false);
      });

      it('should return false for non-number types', () => {
        expect(validators.isValidAmount('100')).toBe(false);
        expect(validators.isValidAmount(null)).toBe(false);
        expect(validators.isValidAmount(undefined)).toBe(false);
        expect(validators.isValidAmount({})).toBe(false);
      });
    });
  });

  describe('helpers', () => {
    describe('getRandomElement', () => {
      it('should return an element from the array', () => {
        const array = ['a', 'b', 'c', 'd', 'e'];
        const result = helpers.getRandomElement(array);
        expect(array).toContain(result);
      });

      it('should return the only element for single-element arrays', () => {
        const array = ['only'];
        expect(helpers.getRandomElement(array)).toBe('only');
      });

      it('should work with different types', () => {
        const numberArray = [1, 2, 3];
        const objectArray = [{ id: 1 }, { id: 2 }];
        
        expect(numberArray).toContain(helpers.getRandomElement(numberArray));
        expect(objectArray).toContain(helpers.getRandomElement(objectArray));
      });

      it('should return undefined for empty arrays', () => {
        expect(helpers.getRandomElement([])).toBeUndefined();
      });
    });

    describe('formatArabicText', () => {
      it('should wrap text with RTL control characters', () => {
        const text = 'مرحبا';
        const result = helpers.formatArabicText(text);
        expect(result).toBe('\u202eمرحبا\u202c');
      });

      it('should handle empty strings', () => {
        const result = helpers.formatArabicText('');
        expect(result).toBe('\u202e\u202c');
      });

      it('should handle mixed text', () => {
        const text = 'Hello مرحبا';
        const result = helpers.formatArabicText(text);
        expect(result).toContain(text);
        expect(result.startsWith('\u202e')).toBe(true);
        expect(result.endsWith('\u202c')).toBe(true);
      });
    });

    describe('calculateLevel', () => {
      it('should return level 1 for 0 XP', () => {
        expect(helpers.calculateLevel(0)).toBe(1);
      });

      it('should return level 1 for XP less than 1000', () => {
        expect(helpers.calculateLevel(500)).toBe(1);
        expect(helpers.calculateLevel(999)).toBe(1);
      });

      it('should return level 2 for XP between 1000-1999', () => {
        expect(helpers.calculateLevel(1000)).toBe(2);
        expect(helpers.calculateLevel(1500)).toBe(2);
        expect(helpers.calculateLevel(1999)).toBe(2);
      });

      it('should correctly calculate higher levels', () => {
        expect(helpers.calculateLevel(2000)).toBe(3);
        expect(helpers.calculateLevel(5000)).toBe(6);
        expect(helpers.calculateLevel(10000)).toBe(11);
      });
    });

    describe('calculateXPForNextLevel', () => {
      it('should return 2000 for level 1', () => {
        expect(helpers.calculateXPForNextLevel(1)).toBe(2000);
      });

      it('should return correct XP for various levels', () => {
        expect(helpers.calculateXPForNextLevel(2)).toBe(3000);
        expect(helpers.calculateXPForNextLevel(5)).toBe(6000);
        expect(helpers.calculateXPForNextLevel(10)).toBe(11000);
      });

      it('should return 1000 for level 0', () => {
        expect(helpers.calculateXPForNextLevel(0)).toBe(1000);
      });
    });
  });

  describe('safeSend', () => {
    let mockBot;
    let consoleSpy;

    beforeEach(() => {
      jest.useFakeTimers();
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation()
      };
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should successfully send a message on first attempt', async () => {
      mockBot = {
        telegram: {
          sendMessage: jest.fn().mockResolvedValue({ message_id: 123 })
        }
      };

      const result = await safeSend(mockBot, 12345, 'Hello');
      
      expect(result).toEqual({ message_id: 123 });
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Hello', {});
    });

    it('should pass options to sendMessage', async () => {
      mockBot = {
        telegram: {
          sendMessage: jest.fn().mockResolvedValue({ message_id: 456 })
        }
      };

      const options = { parse_mode: 'HTML' };
      await safeSend(mockBot, 12345, 'Hello', options);
      
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Hello', options);
    });

    it('should retry on failure and succeed', async () => {
      mockBot = {
        telegram: {
          sendMessage: jest.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValue({ message_id: 789 })
        }
      };

      const sendPromise = safeSend(mockBot, 12345, 'Hello');
      
      // First attempt fails, wait for retry
      await jest.advanceTimersByTimeAsync(2000);
      
      const result = await sendPromise;
      
      expect(result).toEqual({ message_id: 789 });
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      mockBot = {
        telegram: {
          sendMessage: jest.fn().mockRejectedValue(new Error('Persistent error'))
        }
      };

      // Attach catch handler immediately to prevent unhandled rejection warnings
      let caughtError;
      const sendPromise = safeSend(mockBot, 12345, 'Hello').catch(err => {
        caughtError = err;
      });
      
      // Advance through all retries - need to run pending timers until promise settles
      await jest.runAllTimersAsync();
      await sendPromise;
      
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('Persistent error');
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should respect Telegram retry_after parameter', async () => {
      const rateLimitError = new Error('Too Many Requests');
      rateLimitError.response = {
        parameters: {
          retry_after: 5
        }
      };
      
      mockBot = {
        telegram: {
          sendMessage: jest.fn()
            .mockRejectedValueOnce(rateLimitError)
            .mockResolvedValue({ message_id: 101 })
        }
      };

      const sendPromise = safeSend(mockBot, 12345, 'Hello');
      
      // Should wait for 5 seconds (retry_after)
      await jest.advanceTimersByTimeAsync(5000);
      
      const result = await sendPromise;
      
      expect(result).toEqual({ message_id: 101 });
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});
