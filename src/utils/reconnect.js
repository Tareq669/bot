const { logger } = require('./helpers');

/**
 * Reconnect Manager - يدير إعادة الاتصال التلقائية
 */
class ReconnectManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 50;
    this.initialDelay = options.initialDelay || 3000; // 3 ثواني
    this.maxDelay = options.maxDelay || 300000; // 5 دقائق
    this.backoffMultiplier = options.backoffMultiplier || 1.5;
    this.retryCount = 0;
    this.currentDelay = this.initialDelay;
    this.isConnected = false;
    this.reconnectInterval = null;
    this.healthCheckInterval = null;
  }

  /**
   * حساب التأخير مع exponential backoff
   */
  calculateDelay() {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffMultiplier, this.retryCount),
      this.maxDelay
    );
    // أضف عشوائية لتجنب thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * محاولة الاتصال مع إعادة المحاولة
   */
  async connect(connectFn) {
    try {
      logger.info('🔄 محاولة الاتصال...');
      await connectFn();
      this.isConnected = true;
      this.retryCount = 0;
      this.currentDelay = this.initialDelay;
      logger.info('✅ تم الاتصال بنجاح!');
      return true;
    } catch (error) {
      logger.error('❌ فشل الاتصال:', error.message);
      return this.handleConnectionFailure();
    }
  }

  /**
   * التعامل مع فشل الاتصال
   */
  async handleConnectionFailure() {
    if (this.retryCount >= this.maxRetries) {
      logger.error('❌ تم تجاوز الحد الأقصى من المحاولات!');
      return false;
    }

    this.retryCount++;
    this.currentDelay = this.calculateDelay();

    const retryAfterSeconds = Math.round(this.currentDelay / 1000);
    logger.warn(
      `⏳ محاولة رقم ${this.retryCount}/${this.maxRetries} بعد ${retryAfterSeconds} ثانية...`
    );

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, this.currentDelay);
    });
  }

  /**
   * بدء نظام إعادة الاتصال التلقائي
   */
  startAutoReconnect(connectFn, onReconnected) {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(async () => {
      if (!this.isConnected) {
        const success = await this.connect(connectFn);
        if (success && onReconnected) {
          onReconnected();
        }
      }
    }, 5000); // فحص كل 5 ثواني
  }

  /**
   * بدء فحص صحة الاتصال
   */
  startHealthCheck(healthCheckFn, onDisconnected) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await healthCheckFn();
        if (!isHealthy && this.isConnected) {
          logger.warn('⚠️ فقدان الاتصال المكتشف!');
          this.isConnected = false;
          if (onDisconnected) {
            onDisconnected();
          }
        }
      } catch (error) {
        logger.error('❌ خطأ في فحص الصحة:', error.message);
        this.isConnected = false;
        if (onDisconnected) {
          onDisconnected();
        }
      }
    }, 30000); // فحص كل 30 ثانية
  }

  /**
   * إيقاف إعادة الاتصال
   */
  stop() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * الحصول على حالة الاتصال
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      retryCount: this.retryCount,
      currentDelay: this.currentDelay,
      maxRetries: this.maxRetries
    };
  }

  /**
   * إعادة تعيين العداد
   */
  reset() {
    this.retryCount = 0;
    this.currentDelay = this.initialDelay;
  }
}

module.exports = ReconnectManager;
