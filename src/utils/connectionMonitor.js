const { logger } = require('./helpers');

/**
 * Connection Monitor - يراقب اتصال الإنترنت
 */
class ConnectionMonitor {
  constructor() {
    this.isOnline = true;
    this.lastCheckTime = Date.now();
    this.checkInterval = null;
  }

  /**
   * فحص الاتصال بالإنترنت
   */
  async checkConnection() {
    try {
      // محاولة الاتصال بخادم Telegram (سريع وموثوق)
      const start = Date.now();
      const response = await this.fetch('https://api.telegram.org/botTest/getMe', {
        timeout: 5000,
        method: 'GET'
      });

      const duration = Date.now() - start;

      if (!response || response.status !== 404) {
        // نتوقع 404 لأن البوت تجريبي
        // لكن المهم أننا تمكنا من الاتصال بـ Telegram API
        return true;
      }

      return true;
    } catch (error) {
      logger.warn(`⚠️ فحص الاتصال فشل: ${error.message}`);
      return false;
    }
  }

  /**
   * محاكاة fetch مع timeout
   */
  async fetch(url, options = {}) {
    const timeout = options.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await require('https').get(url, {
        headers: { 'User-Agent': 'TelegramBot/1.0' },
        timeout: timeout
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * بدء المراقبة المستمرة للاتصال
   */
  startMonitoring(onStatusChange) {
    this.checkInterval = setInterval(async () => {
      const wasOnline = this.isOnline;
      this.isOnline = await this.checkConnection();
      this.lastCheckTime = Date.now();

      if (wasOnline !== this.isOnline) {
        if (this.isOnline) {
          logger.info('🟢 الاتصال بالإنترنت استعاد!');
        } else {
          logger.warn('🔴 فقدان اتصال الإنترنت!');
        }

        if (onStatusChange) {
          onStatusChange(this.isOnline);
        }
      }
    }, 10000); // فحص كل 10 ثواني
  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * الحصول على حالة الاتصال
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      lastCheckTime: this.lastCheckTime,
      timeSinceLastCheck: Date.now() - this.lastCheckTime
    };
  }
}

module.exports = new ConnectionMonitor();
