/**
 * Constants Unit Tests
 */

const {
  BOT_CONFIG,
  ECONOMY,
  LEVELING,
  GAMES,
  CONTENT,
  MODERATION,
  ROLES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  TIME,
  PATTERNS,
  EMOJIS,
  COLLECTIONS,
  API_ENDPOINTS,
  FEATURES
} = require('../../src/config/constants');

describe('Constants', () => {
  describe('BOT_CONFIG', () => {
    it('should have API configuration', () => {
      expect(BOT_CONFIG.API).toBeDefined();
      expect(BOT_CONFIG.API.TIMEOUT).toBe(60000);
      expect(BOT_CONFIG.API.ROOT).toBe('https://api.telegram.org');
    });

    it('should have polling configuration', () => {
      expect(BOT_CONFIG.POLLING).toBeDefined();
      expect(BOT_CONFIG.POLLING.TIMEOUT).toBe(30);
      expect(BOT_CONFIG.POLLING.LIMIT).toBe(100);
    });
  });

  describe('ECONOMY', () => {
    it('should have currency settings', () => {
      expect(ECONOMY.CURRENCY_NAME).toBe('عملة');
      expect(ECONOMY.CURRENCY_SYMBOL).toBe('💰');
    });

    it('should have daily reward settings', () => {
      expect(ECONOMY.DAILY_REWARD.MIN).toBe(100);
      expect(ECONOMY.DAILY_REWARD.MAX).toBe(500);
      expect(ECONOMY.DAILY_REWARD.COOLDOWN).toBe(24 * 60 * 60 * 1000);
    });

    it('should have transfer limits', () => {
      expect(ECONOMY.TRANSFER.MIN_AMOUNT).toBe(10);
      expect(ECONOMY.TRANSFER.MAX_AMOUNT).toBe(1000000);
    });
  });

  describe('LEVELING', () => {
    it('should have XP configuration', () => {
      expect(LEVELING.XP_PER_MESSAGE).toBe(10);
      expect(LEVELING.XP_PER_COMMAND).toBe(5);
      expect(LEVELING.XP_PER_GAME).toBe(20);
    });

    it('should have level calculation settings', () => {
      expect(LEVELING.BASE_XP).toBe(100);
      expect(LEVELING.XP_MULTIPLIER).toBe(1.5);
    });
  });

  describe('GAMES', () => {
    it('should have game types', () => {
      expect(GAMES.TYPES.MATH).toBe('math');
      expect(GAMES.TYPES.QURAN).toBe('quran');
    });

    it('should have reward settings', () => {
      expect(GAMES.REWARDS.WIN.COINS).toBe(50);
      expect(GAMES.REWARDS.LOSE.COINS).toBe(10);
    });

    it('should have time limits', () => {
      expect(GAMES.TIME_LIMITS.MATH).toBe(30);
      expect(GAMES.TIME_LIMITS.QURAN).toBe(45);
    });
  });

  describe('CONTENT', () => {
    it('should have Quran information', () => {
      expect(CONTENT.QURAN.TOTAL_SURAHS).toBe(114);
      expect(CONTENT.QURAN.TOTAL_PAGES).toBe(604);
      expect(CONTENT.QURAN.TOTAL_JUZZ).toBe(30);
    });

    it('should have Adhkar categories', () => {
      expect(CONTENT.ADHKAR_CATEGORIES.MORNING).toBe('morning');
      expect(CONTENT.ADHKAR_CATEGORIES.EVENING).toBe('evening');
    });
  });

  describe('MODERATION', () => {
    it('should have permissions levels', () => {
      expect(MODERATION.PERMISSIONS.OWNER).toBe('owner');
      expect(MODERATION.PERMISSIONS.ADMIN).toBe('admin');
    });

    it('should have moderation actions', () => {
      expect(MODERATION.ACTIONS.BAN).toBe('ban');
      expect(MODERATION.ACTIONS.KICK).toBe('kick');
    });

    it('should have flood protection settings', () => {
      expect(MODERATION.FLOOD.MAX_MESSAGES).toBe(5);
      expect(MODERATION.FLOOD.TIME_WINDOW).toBe(10000);
    });
  });

  describe('ROLES', () => {
    it('should have role hierarchy', () => {
      expect(ROLES.OWNER.level).toBe(3);
      expect(ROLES.ADMIN.level).toBe(2);
      expect(ROLES.MODERATOR.level).toBe(1);
      expect(ROLES.USER.level).toBe(0);
    });

    it('should have Arabic role names', () => {
      expect(ROLES.OWNER.name).toBe('مالك');
      expect(ROLES.ADMIN.name).toBe('مشرف');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have error messages in Arabic', () => {
      expect(ERROR_MESSAGES.GENERIC).toContain('❌');
      expect(ERROR_MESSAGES.NO_PERMISSION).toContain('صلاحية');
      expect(ERROR_MESSAGES.INSUFFICIENT_FUNDS).toContain('رصيد');
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should have success messages in Arabic', () => {
      expect(SUCCESS_MESSAGES.GENERIC).toContain('✅');
      expect(SUCCESS_MESSAGES.SAVED).toContain('حفظ');
    });
  });

  describe('CACHE_KEYS', () => {
    it('should generate cache keys', () => {
      const userId = 12345;
      expect(CACHE_KEYS.USER_PROFILE(userId)).toBe(`user:${userId}:profile`);
      expect(CACHE_KEYS.USER_STATS(userId)).toBe(`user:${userId}:stats`);
    });

    it('should have static cache keys', () => {
      expect(CACHE_KEYS.LEADERBOARD).toBe('leaderboard');
    });
  });

  describe('TIME', () => {
    it('should have time constants', () => {
      expect(TIME.SECOND).toBe(1000);
      expect(TIME.MINUTE).toBe(60 * 1000);
      expect(TIME.HOUR).toBe(60 * 60 * 1000);
      expect(TIME.DAY).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('PATTERNS', () => {
    it('should validate username pattern', () => {
      expect(PATTERNS.USERNAME.test('@username')).toBe(true);
      expect(PATTERNS.USERNAME.test('username')).toBe(true);
      expect(PATTERNS.USERNAME.test('usr')).toBe(false); // too short
    });

    it('should validate number pattern', () => {
      expect(PATTERNS.NUMBER.test('123')).toBe(true);
      expect(PATTERNS.NUMBER.test('abc')).toBe(false);
    });

    it('should validate email pattern', () => {
      expect(PATTERNS.EMAIL.test('test@example.com')).toBe(true);
      expect(PATTERNS.EMAIL.test('invalid')).toBe(false);
    });
  });

  describe('EMOJIS', () => {
    it('should have common emojis', () => {
      expect(EMOJIS.SUCCESS).toBe('✅');
      expect(EMOJIS.ERROR).toBe('❌');
      expect(EMOJIS.WARNING).toBe('⚠️');
    });

    it('should have category emojis', () => {
      expect(EMOJIS.QURAN).toBe('📖');
      expect(EMOJIS.GAMES).toBe('🎮');
      expect(EMOJIS.ECONOMY).toBe('💰');
    });
  });

  describe('COLLECTIONS', () => {
    it('should have database collection names', () => {
      expect(COLLECTIONS.USERS).toBe('users');
      expect(COLLECTIONS.GROUPS).toBe('groups');
      expect(COLLECTIONS.TRANSACTIONS).toBe('transactions');
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have API endpoints', () => {
      expect(API_ENDPOINTS.QURAN).toContain('alquran.cloud');
      expect(API_ENDPOINTS.PRAYER_TIMES).toContain('aladhan.com');
    });
  });

  describe('FEATURES', () => {
    it('should have feature flags', () => {
      expect(FEATURES.AI_SYSTEM).toBe(true);
      expect(FEATURES.GAMES).toBe(true);
      expect(FEATURES.ECONOMY).toBe(true);
    });
  });
});
