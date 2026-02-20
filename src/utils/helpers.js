const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },
  error: (message, error) => {
    if (typeof error === 'undefined') {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
      return;
    }
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }
};

const validators = {
  isValidUserId: (userId) => {
    return typeof userId === 'number' && userId > 0;
  },
  isValidGroupId: (groupId) => {
    return typeof groupId === 'string' || typeof groupId === 'number';
  },
  isValidAmount: (amount) => {
    return typeof amount === 'number' && amount > 0;
  }
};

const helpers = {
  getRandomElement: (array) => {
    return array[Math.floor(Math.random() * array.length)];
  },
  formatArabicText: (text) => {
    // RTL formatting for Arabic text
    return `\u202e${text}\u202c`;
  },
  calculateLevel: (xp) => {
    return Math.floor(xp / 1000) + 1;
  },
  calculateXPForNextLevel: (currentLevel) => {
    return (currentLevel + 1) * 1000;
  }
};

// Resilient Telegram send wrapper with simple retry and backoff
async function safeSend(bot, chatId, text, options = {}) {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      // prefer using bot.telegram.sendMessage
      const res = await bot.telegram.sendMessage(chatId, text, options);
      return res;
    } catch (err) {
      lastError = err;
      // If Telegram rate limit, sleep for indicated seconds if present
      const retryAfter = (err && err.response && err.response.parameters && err.response.parameters.retry_after) || null;
      const waitMs = retryAfter ? (Number(retryAfter) * 1000) : (1000 * Math.pow(2, attempt));
      logger.warn(`sendMessage attempt ${attempt} failed. Retrying in ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  // final throw
  logger.error('safeSend failed after retries', lastError);
  throw lastError;
}

module.exports = {
  logger,
  validators,
  helpers,
  safeSend
};
