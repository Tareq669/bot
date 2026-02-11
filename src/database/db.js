const mongoose = require('mongoose');
const models = require('./models');
const { logger } = require('../utils/helpers');

class Database {
  static async connect(mongoUri) {
    try {
      // محاولة الاتصال بـ MongoDB
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        connectTimeoutMS: 10000
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
