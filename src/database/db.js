const mongoose = require('mongoose');
const models = require('./models');
const { logger } = require('../utils/helpers');

class Database {
  static async connect(mongoUri) {
    try {
      const normalizedUri = String(mongoUri || '').trim().replace(/^["']|["']$/g, '');
      const isRailway = Boolean(
        process.env.RAILWAY_ENVIRONMENT
        || process.env.RAILWAY_PROJECT_ID
        || process.env.RAILWAY_SERVICE_ID
      );

      // محاولة الاتصال بـ MongoDB
      await mongoose.connect(normalizedUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // 5s كانت قصيرة على بيئات السحابة وتسبب timeouts كاذبة
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 30000),
        socketTimeoutMS: 45000,
        retryWrites: true,
        connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15000),
        family: isRailway ? 4 : undefined
      });

      logger.info('✅ تم الاتصال بقاعدة البيانات بنجاح');

      // معالج قطع الاتصال
      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ انقطع الاتصال بقاعدة البيانات');
      });

      // معالج الأخطاء
      mongoose.connection.on('error', (error) => {
        logger.error('❌ خطأ في قاعدة البيانات:', error.message);
      });

      // محاولة إعادة الاتصال
      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 تم إعادة الاتصال بقاعدة البيانات');
      });

      return true;
    } catch (error) {
      logger.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('✅ تم قطع الاتصال بقاعدة البيانات');
    } catch (error) {
      logger.error('❌ خطأ في قطع الاتصال:', error.message);
      throw error;
    }
  }

  static getModels() {
    return models;
  }

  /**
   * فحص صحة الاتصال بقاعدة البيانات
   */
  static async healthCheck() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return false;
      }

      // جرب عملية بسيطة
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('❌ فحص صحة قاعدة البيانات فشل:', error.message);
      return false;
    }
  }
}

module.exports = Database;
