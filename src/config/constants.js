/**
 * Application Constants and Configuration
 * Centralized location for all constant values used across the bot
 */

/**
 * Bot Configuration
 */
const BOT_CONFIG = {
  // API Configuration
  API: {
    TIMEOUT: 60000,
    KEEP_ALIVE: true,
    KEEP_ALIVE_MS: 30000,
    ROOT: 'https://api.telegram.org'
  },

  // Polling Configuration
  POLLING: {
    TIMEOUT: 30,
    LIMIT: 100,
    ALLOWED_UPDATES: ['message', 'callback_query', 'inline_query']
  },

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 5000,
    BACKOFF_MULTIPLIER: 2
  }
};

/**
 * Economy System Constants
 */
const ECONOMY = {
  // Currency
  CURRENCY_NAME: 'عملة',
  CURRENCY_SYMBOL: '💰',

  // Daily Rewards
  DAILY_REWARD: {
    MIN: 100,
    MAX: 500,
    COOLDOWN: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  },

  // Starting Balance
  STARTING_BALANCE: 1000,

  // Transfer Limits
  TRANSFER: {
    MIN_AMOUNT: 10,
    MAX_AMOUNT: 1000000,
    FEE_PERCENTAGE: 0 // No fee by default
  },

  // Shop Items
  SHOP_CATEGORIES: {
    PREMIUM: 'premium',
    ITEMS: 'items',
    UPGRADES: 'upgrades'
  }
};

/**
 * Leveling System Constants
 */
const LEVELING = {
  // XP Configuration
  XP_PER_MESSAGE: 10,
  XP_PER_COMMAND: 5,
  XP_PER_GAME: 20,

  // Level Calculation
  BASE_XP: 100,
  XP_MULTIPLIER: 1.5,

  // Rewards
  COINS_PER_LEVEL: 50,

  // Cooldown between XP gains (to prevent spam)
  XP_COOLDOWN: 60000 // 1 minute
};

/**
 * Game System Constants
 */
const GAMES = {
  // Game Types
  TYPES: {
    MATH: 'math',
    WORD: 'word',
    RIDDLE: 'riddle',
    QURAN: 'quran',
    MEMORY: 'memory'
  },

  // Rewards
  REWARDS: {
    WIN: {
      COINS: 50,
      XP: 30
    },
    LOSE: {
      COINS: 10,
      XP: 5
    }
  },

  // Time Limits (in seconds)
  TIME_LIMITS: {
    MATH: 30,
    WORD: 45,
    RIDDLE: 60,
    QURAN: 45,
    MEMORY: 60
  },

  // Difficulty Levels
  DIFFICULTY: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
  }
};

/**
 * Content System Constants
 */
const CONTENT = {
  // Quran
  QURAN: {
    TOTAL_SURAHS: 114,
    TOTAL_PAGES: 604,
    TOTAL_JUZZ: 30
  },

  // Adhkar Categories
  ADHKAR_CATEGORIES: {
    MORNING: 'morning',
    EVENING: 'evening',
    SLEEP: 'sleep',
    PRAYER: 'prayer',
    GENERAL: 'general'
  },

  // Cache Duration (in milliseconds)
  CACHE_DURATION: 60 * 60 * 1000 // 1 hour
};

/**
 * Moderation System Constants
 */
const MODERATION = {
  // Permissions
  PERMISSIONS: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    USER: 'user'
  },

  // Actions
  ACTIONS: {
    BAN: 'ban',
    KICK: 'kick',
    MUTE: 'mute',
    WARN: 'warn'
  },

  // Limits
  MAX_WARNINGS: 3,
  MUTE_DURATION: 3600000, // 1 hour in milliseconds

  // Flood Protection
  FLOOD: {
    MAX_MESSAGES: 5,
    TIME_WINDOW: 10000 // 10 seconds
  }
};

/**
 * User Roles and Permissions
 */
const ROLES = {
  OWNER: {
    level: 3,
    name: 'مالك',
    emoji: '👑'
  },
  ADMIN: {
    level: 2,
    name: 'مشرف',
    emoji: '⚡'
  },
  MODERATOR: {
    level: 1,
    name: 'مراقب',
    emoji: '🛡️'
  },
  USER: {
    level: 0,
    name: 'مستخدم',
    emoji: '👤'
  }
};

/**
 * Error Messages (Arabic)
 */
const ERROR_MESSAGES = {
  GENERIC: '❌ حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
  NO_PERMISSION: '❌ ليس لديك صلاحية لتنفيذ هذا الأمر',
  INVALID_INPUT: '❌ مدخل غير صحيح، يرجى التحقق والمحاولة مرة أخرى',
  USER_NOT_FOUND: '❌ المستخدم غير موجود',
  INSUFFICIENT_FUNDS: '❌ رصيدك غير كافٍ',
  COOLDOWN: '⏳ يرجى الانتظار قليلاً قبل المحاولة مرة أخرى',
  DATABASE_ERROR: '❌ خطأ في قاعدة البيانات',
  API_ERROR: '❌ خطأ في الاتصال بالخدمة',
  BANNED: '🚫 تم حظرك من استخدام البوت',
  MAINTENANCE: '🔧 البوت تحت الصيانة، يرجى المحاولة لاحقاً'
};

/**
 * Success Messages (Arabic)
 */
const SUCCESS_MESSAGES = {
  GENERIC: '✅ تمت العملية بنجاح',
  SAVED: '✅ تم الحفظ بنجاح',
  UPDATED: '✅ تم التحديث بنجاح',
  DELETED: '✅ تم الحذف بنجاح',
  SENT: '✅ تم الإرسال بنجاح',
  CLAIMED: '✅ تم الاستلام بنجاح',
  COMPLETED: '✅ تمت المهمة بنجاح'
};

/**
 * Cache Keys
 */
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:${userId}:profile`,
  USER_STATS: (userId) => `user:${userId}:stats`,
  LEADERBOARD: 'leaderboard',
  QURAN_SURAH: (surahId) => `quran:surah:${surahId}`,
  ADHKAR: (category) => `adhkar:${category}`,
  GAME_SESSION: (gameId) => `game:${gameId}`,
  GROUP_SETTINGS: (groupId) => `group:${groupId}:settings`
};

/**
 * Time Constants (in milliseconds)
 */
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

/**
 * Regex Patterns
 */
const PATTERNS = {
  USERNAME: /^@?[a-zA-Z0-9_]{5,32}$/,
  NUMBER: /^\d+$/,
  ARABIC: /[\u0600-\u06FF]/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

/**
 * Emojis
 */
const EMOJIS = {
  // Common
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',

  // Categories
  QURAN: '📖',
  ADHKAR: '📿',
  GAMES: '🎮',
  ECONOMY: '💰',
  PROFILE: '👤',
  LEADERBOARD: '🏆',
  SETTINGS: '⚙️',
  HELP: '❓',

  // Actions
  BACK: '⬅️',
  NEXT: '➡️',
  REFRESH: '🔄',
  CLOSE: '❌',
  CONFIRM: '✔️',
  CANCEL: '✖️'
};

/**
 * Database Collection Names
 */
const COLLECTIONS = {
  USERS: 'users',
  GROUPS: 'groups',
  TRANSACTIONS: 'transactions',
  GAME_STATS: 'gamestats',
  CONTENT: 'content',
  CONFIG: 'config',
  LOGS: 'logs'
};

/**
 * API Endpoints
 */
const API_ENDPOINTS = {
  QURAN: 'https://api.alquran.cloud/v1',
  PRAYER_TIMES: 'https://api.aladhan.com/v1'
};

/**
 * Feature Flags
 */
const FEATURES = {
  AI_SYSTEM: true,
  GAMES: true,
  ECONOMY: true,
  QURAN: true,
  ADHKAR: true,
  MODERATION: true,
  ANALYTICS: true,
  BACKUP: true,
  MULTI_LANGUAGE: false // Not fully implemented yet
};

module.exports = {
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
};
