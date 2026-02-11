/**
 * Rate Limiting System
 * النظام الذي يحمي البوت من الإساءة
 */

const { logger } = require('../utils/helpers');

class RateLimiter {
  constructor() {
    this.userRequests = new Map();
    this.blockedUsers = new Map();

    // الحدود الافتراضية
    this.limits = {
      messages: { max: 10, window: 60 }, // 10 رسائل في 60 ثانية
      commands: { max: 20, window: 60 }, // 20 أمر في 60 ثانية
      gamePlay: { max: 5, window: 300 }, // 5 ألعاب في 5 دقائق
      stickers: { max: 50, window: 3600 }, // 50 ستيكر في ساعة
      apiCalls: { max: 100, window: 3600 } // 100 استدعاء API في ساعة
    };
  }

  /**
   * التحقق من حد الرسائل
   */
  checkMessageLimit(userId) {
    return this.checkLimit(userId, 'messages');
  }

  /**
   * التحقق من حد الأوامر
   */
  checkCommandLimit(userId) {
    return this.checkLimit(userId, 'commands');
  }

  /**
   * التحقق من حد ألعاب
   */
  checkGamePlayLimit(userId) {
    return this.checkLimit(userId, 'gamePlay');
  }

  /**
   * دالة فحص الحد العام
   */
  checkLimit(userId, limitType) {
    // التحقق من الحظر
    if (this.isUserBlocked(userId)) {
      const blockInfo = this.blockedUsers.get(userId);
      const timeLeft = Math.ceil((blockInfo.unblockTime - Date.now()) / 1000);
      return {
        allowed: false,
        message: `🚫 تم حظرك مؤقتاً لمدة ${timeLeft} ثانية`,
        timeLeft
      };
    }

    const now = Date.now();
    const key = `${userId}:${limitType}`;
    const limit = this.limits[limitType];

    if (!this.userRequests.has(key)) {
      this.userRequests.set(key, []);
    }

    const requests = this.userRequests.get(key);

    // إزالة الطلبات القديمة (خارج الإطار الزمني)
    const validRequests = requests.filter(
      time => now - time < limit.window * 1000
    );
    this.userRequests.set(key, validRequests);

    // التحقق من تجاوز الحد
    if (validRequests.length >= limit.max) {
      logger.warn(`⚠️ المستخدم ${userId} تجاوز حد ${limitType}`);

      // حظر المستخدم مؤقتاً (5 دقائق)
      this.blockUser(userId, 300);

      return {
        allowed: false,
        message: '⏳ لقد تجاوزت الحد المسموح\nحاول بعد 5 دقائق',
        blocked: true
      };
    }

    // إضافة طلب جديد
    validRequests.push(now);
    this.userRequests.set(key, validRequests);

    return {
      allowed: true,
      remaining: limit.max - validRequests.length,
      message: null
    };
  }

  /**
   * حظر مستخدم مؤقتاً
   */
  blockUser(userId, duration = 300) {
    const unblockTime = Date.now() + duration * 1000;
    this.blockedUsers.set(userId, { unblockTime });
    logger.warn(`🚫 تم حظر المستخدم ${userId} لمدة ${duration} ثانية`);

    // إزالة الحظر تلقائياً
    setTimeout(() => {
      this.blockedUsers.delete(userId);
      logger.info(`✅ تم فك حظر المستخدم ${userId}`);
    }, duration * 1000);
  }

  /**
   * التحقق من حظر المستخدم
   */
  isUserBlocked(userId) {
    if (!this.blockedUsers.has(userId)) return false;

    const blockInfo = this.blockedUsers.get(userId);
    if (Date.now() > blockInfo.unblockTime) {
      this.blockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * إزالة الحظر يدوياً
   */
  unblockUser(userId) {
    this.blockedUsers.delete(userId);
    logger.info(`✅ تم فك حظر ${userId} يدوياً`);
  }

  /**
   * تخصيص الحدود
   */
  setLimit(limitType, max, window) {
    if (this.limits[limitType]) {
      this.limits[limitType] = { max, window };
      logger.info(`⚙️ تم تعديل حد ${limitType}: ${max} في ${window} ثانية`);
    }
  }

  /**
   * مسح بيانات المستخدم
   */
  clearUserData(userId) {
    for (const key of this.userRequests.keys()) {
      if (key.startsWith(userId)) {
        this.userRequests.delete(key);
      }
    }
  }

  /**
   * إحصائيات الحدود
   */
  getStats() {
    const totalTrackedUsers = new Set(
      Array.from(this.userRequests.keys()).map(k => k.split(':')[0])
    ).size;

    return {
      trackedUsers: totalTrackedUsers,
      blockedUsers: this.blockedUsers.size,
      limits: this.limits
    };
  }

  /**
   * الحصول على معلومات مستخدم محدد
   */
  getUserInfo(userId) {
    const userLimits = {};

    for (const [key, requests] of this.userRequests.entries()) {
      if (key.startsWith(userId)) {
        const limitType = key.split(':')[1];
        const now = Date.now();
        const limit = this.limits[limitType];

        const validRequests = requests.filter(
          time => now - time < limit.window * 1000
        );

        userLimits[limitType] = {
          used: validRequests.length,
          max: limit.max,
          remaining: limit.max - validRequests.length
        };
      }
    }

    return {
      userId,
      blocked: this.isUserBlocked(userId),
      limits: userLimits
    };
  }

  /**
   * تنسيق الإحصائيات للعرض
   */
  formatStats() {
    const stats = this.getStats();
    return `
🛡️ <b>نظام حماية الحدود</b>

👥 مستخدمون مراقبون: ${stats.trackedUsers}
🚫 مستخدمون محظورون: ${stats.blockedUsers}

⚙️ <b>الحدود الحالية:</b>
📨 الرسائل: ${stats.limits.messages.max} في ${stats.limits.messages.window}s
🎮 الألعاب: ${stats.limits.gamePlay.max} في ${stats.limits.gamePlay.window}s
⚡ الأوامر: ${stats.limits.commands.max} في ${stats.limits.commands.window}s
`.trim();
  }
}

module.exports = RateLimiter;
