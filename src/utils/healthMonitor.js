const Database = require('../database/db');
const { logger } = require('./helpers');

/**
 * Bot Health Monitor - مراقب صحة البوت
 */
class BotHealthMonitor {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      uptime: 0,
      lastHealthCheck: null,
      databaseStatus: false,
      botStatus: false,
      reconnectAttempts: 0,
      errorCount: 0
    };
    this.checkInterval = null;
  }

  /**
   * تحديث الإحصائيات
   */
  updateStats(newStats) {
    this.stats = { ...this.stats, ...newStats };
  }

  /**
   * حساب مدة التشغيل
   */
  calculateUptime() {
    return Math.floor((Date.now() - this.stats.startTime) / 1000);
  }

  /**
   * فحص صحة البوت
   */
  async healthCheck() {
    try {
      // فحص قاعدة البيانات
      const dbHealth = await Database.healthCheck();
      this.stats.databaseStatus = dbHealth;

      // معلومات الذاكرة
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

      const uptime = this.calculateUptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;

      this.stats.lastHealthCheck = Date.now();
      this.stats.uptime = uptime;

      const report = {
        status: dbHealth ? '✅ سليم' : '❌ مشاكل',
        uptime: `${hours}س ${minutes}د ${seconds}ث`,
        database: dbHealth ? '✅ متصل' : '❌ معطل',
        memory: `${heapUsedMB}/${heapTotalMB} MB`,
        errors: this.stats.errorCount,
        reconnectAttempts: this.stats.reconnectAttempts
      };

      if (!dbHealth) {
        logger.warn('⚠️ تحذير: مشاكل في اتصال قاعدة البيانات');
      }

      return report;
    } catch (error) {
      logger.error('خطأ في فحص الصحة:', error.message);
      return {
        status: '❌ خطأ',
        error: error.message
      };
    }
  }

  /**
   * بدء فحص الصحة الدوري
   */
  startPeriodicCheck(interval = 60000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const report = await this.healthCheck();
      // Removed excessive logging - only log on issues
    }, interval);

    logger.info(`📊 بدء فحص صحة البوت كل ${interval / 1000} ثانية`);
  }

  /**
   * إيقاف الفحص الدوري
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * الحصول على تقرير شامل
   */
  getFullReport() {
    const uptime = this.calculateUptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);

    const report = `
📊 *تقرير صحة البوت الشامل*

⏱️ *مدة التشغيل:* ${hours}س ${minutes}د ${seconds}ث
💾 *استخدام الذاكرة:* ${heapUsedMB}/${heapTotalMB} MB (RSS: ${rssUsageMB}MB)
🗄️ *حالة قاعدة البيانات:* ${this.stats.databaseStatus ? '✅ متصل' : '❌ معطل'}
⚠️ *عدد الأخطاء:* ${this.stats.errorCount}
🔄 *محاولات إعادة الاتصال:* ${this.stats.reconnectAttempts}
🕐 *آخر فحص:* ${new Date(this.stats.lastHealthCheck).toLocaleString('ar-SA')}
    `.trim();

    return report;
  }

  /**
   * تسجيل خطأ
   */
  logError() {
    this.stats.errorCount++;
  }

  /**
   * تسجيل محاولة إعادة اتصال
   */
  logReconnectAttempt() {
    this.stats.reconnectAttempts++;
  }
}

module.exports = new BotHealthMonitor();
