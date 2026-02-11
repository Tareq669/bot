/**
 * Backup System
 * نظام النسخ الاحتياطية التلقائية
 */

const fs = require('fs');
const path = require('path');
const User = require('../database/models/User');
const { logger } = require('../utils/helpers');
const node_cron = require('node-cron');

class BackupSystem {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  /**
   * التأكد من وجود مجلد النسخ الاحتياطية
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('📁 تم إنشاء مجلد النسخ الاحتياطية');
    }
  }

  /**
   * عمل نسخة احتياطية من بيانات المستخدمين
   */
  async backupUsers() {
    try {
      const users = await User.find({}, {
        _id: 1,
        username: 1,
        firstName: 1,
        coins: 1,
        xp: 1,
        level: 1,
        stats: 1,
        createdAt: 1,
        lastActive: 1
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `users_backup_${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(users, null, 2));
      logger.info(`✅ تم عمل نسخة احتياطية من المستخدمين: ${filename}`);

      return { success: true, filename, count: users.length };
    } catch (error) {
      logger.error(`❌ خطأ في النسخة الاحتياطية: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * عمل نسخة احتياطية كاملة
   */
  async fullBackup() {
    try {
      const users = await User.find();

      const backupData = {
        timestamp: new Date().toISOString(),
        dataVersion: '1.0',
        userCount: users.length,
        users: users
      };

      const backupName = `full_backup_${Date.now()}.json`;
      const backupPath = path.join(this.backupDir, backupName);

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      logger.info(`✅ نسخة احتياطية كاملة: ${backupName}`);

      return { success: true, filename: backupName };
    } catch (error) {
      logger.error(`❌ خطأ في النسخة الاحتياطية الكاملة: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * استرجاع من نسخة احتياطية
   */
  async restoreFromBackup(filename) {
    try {
      const filepath = path.join(this.backupDir, filename);

      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'الملف غير موجود' };
      }

      const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

      // تحذير: هذه عملية حساسة جداً!
      logger.warn(`⚠️ جاري استرجاع من نسخة احتياطية: ${filename}`);

      return {
        success: true,
        message: 'تم قراءة ملف النسخة الاحتياطية بنجاح',
        userCount: backupData.users?.length || 0,
        timestamp: backupData.timestamp
      };
    } catch (error) {
      logger.error(`❌ خطأ في الاسترجاع: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * عرض قائمة النسخ الاحتياطية
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filepath = path.join(this.backupDir, f);
          const stats = fs.statSync(filepath);
          return {
            filename: f,
            size: `${(stats.size / 1024).toFixed(2)  } KB`,
            date: stats.mtime.toLocaleString('ar')
          };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return files;
    } catch (error) {
      logger.error(`خطأ في قائمة النسخ: ${error.message}`);
      return [];
    }
  }

  /**
   * حذف نسخة احتياطية قديمة
   */
  deleteOldBackups(daysOld = 30) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      let deletedCount = 0;

      files.forEach(file => {
        const filepath = path.join(this.backupDir, file);
        const stats = fs.statSync(filepath);
        const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > daysOld) {
          fs.unlinkSync(filepath);
          deletedCount++;
          logger.info(`🗑️ تم حذف نسخة احتياطية قديمة: ${file}`);
        }
      });

      return { success: true, deleted: deletedCount };
    } catch (error) {
      logger.error(`خطأ في حذف النسخ القديمة: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * جدولة النسخ الاحتياطية
   */
  scheduleAutomaticBackups() {
    // نسخة احتياطية يومية الساعة 2 صباحاً
    node_cron.schedule('0 2 * * *', async () => {
      logger.info('📸 بدء النسخة الاحتياطية اليومية...');
      const result = await this.backupUsers();
      if (result.success) {
        logger.info(`✅ نسخة احتياطية يومية ناجحة (${result.count} مستخدم)`);
      }
    });

    // حذف النسخ الاحتياطية القديمة (أسبوعياً)
    node_cron.schedule('0 3 * * 0', () => {
      logger.info('🧹 تنظيف النسخ الاحتياطية القديمة...');
      this.deleteOldBackups(30);
    });

    logger.info('✅ تم جدولة النسخ الاحتياطية التلقائية');
  }

  /**
   * تنسيق قائمة النسخ للعرض
   */
  formatBackupsList() {
    const backups = this.listBackups();

    if (backups.length === 0) {
      return '📭 لا توجد نسخ احتياطية حتى الآن';
    }

    let text = '📋 <b>النسخ الاحتياطية المتاحة</b>\n\n';

    backups.forEach((backup, index) => {
      text += `${index + 1}. <code>${backup.filename}</code>\n`;
      text += `   📦 ${backup.size}\n`;
      text += `   📅 ${backup.date}\n\n`;
    });

    text += `المجموع: ${backups.length} نسخة احتياطية`;
    return text;
  }

  /**
   * إحصائيات النسخ الاحتياطية
   */
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, b) => {
      const sizeNum = parseFloat(b.size);
      return sum + sizeNum;
    }, 0);

    return {
      backupCount: backups.length,
      totalSize: `${totalSize.toFixed(2)  } KB`,
      oldestBackup: backups[backups.length - 1]?.date,
      newestBackup: backups[0]?.date
    };
  }
}

module.exports = BackupSystem;
