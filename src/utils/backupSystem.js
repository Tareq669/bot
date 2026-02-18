/**
 * Backup System
 * نظام النسخ الاحتياطية التلقائية والشاملة
 * Comprehensive Automatic Backup System
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const node_cron = require('node-cron');

// Import all database models
const {
  User,
  Group,
  Transaction,
  GameStats,
  Content,
  Config,
  Team,
  Event,
  Auction
} = require('../database/models');
const { logger } = require('../utils/helpers');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Constants for file size calculations
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

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
      const users = await User.find({}).lean();

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
   * عمل نسخة احتياطية من مجموعة معينة
   * Backup a specific collection
   */
  async backupCollection(collectionName, Model) {
    try {
      const data = await Model.find({});
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${collectionName}_backup_${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      logger.info(`✅ تم عمل نسخة احتياطية من ${collectionName}: ${filename}`);

      return { success: true, filename, count: data.length };
    } catch (error) {
      logger.error(`❌ خطأ في نسخ ${collectionName}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * عمل نسخة احتياطية كاملة من جميع البيانات
   * Full backup of all collections
   */
  async fullBackup(compress = false) {
    try {
      logger.info('📸 بدء النسخة الاحتياطية الكاملة...');

      // جمع البيانات من جميع المجموعات
      const [users, groups, transactions, gameStats, content, config, teams, events, auctions] = 
        await Promise.all([
          User.find({}).lean(),
          Group.find({}).lean(),
          Transaction.find({}).lean(),
          GameStats.find({}).lean(),
          Content.find({}).lean(),
          Config.find({}).lean(),
          Team.find({}).lean(),
          Event.find({}).lean(),
          Auction.find({}).lean()
        ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        metadata: {
          botVersion: '1.0.0',
          dataVersion: '2.0',
          createdAt: new Date().toISOString(),
          compressed: compress
        },
        collections: {
          users: { count: users.length, data: users },
          groups: { count: groups.length, data: groups },
          transactions: { count: transactions.length, data: transactions },
          gameStats: { count: gameStats.length, data: gameStats },
          content: { count: content.length, data: content },
          config: { count: config.length, data: config },
          teams: { count: teams.length, data: teams },
          events: { count: events.length, data: events },
          auctions: { count: auctions.length, data: auctions }
        },
        statistics: {
          totalUsers: users.length,
          totalGroups: groups.length,
          totalTransactions: transactions.length,
          totalGameStats: gameStats.length
        }
      };

      const timestamp = Date.now();
      const filename = compress 
        ? `full_backup_${timestamp}.json.gz`
        : `full_backup_${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      const jsonData = JSON.stringify(backupData, null, 2);

      if (compress) {
        // ضغط البيانات
        const compressed = await gzip(jsonData);
        fs.writeFileSync(filepath, compressed);
        logger.info(`✅ نسخة احتياطية كاملة مضغوطة: ${filename}`);
      } else {
        fs.writeFileSync(filepath, jsonData);
        logger.info(`✅ نسخة احتياطية كاملة: ${filename}`);
      }

      return {
        success: true,
        filename,
        compressed: compress,
        statistics: backupData.statistics,
        size: this.getFileSize(filepath)
      };
    } catch (error) {
      logger.error(`❌ خطأ في النسخة الاحتياطية الكاملة: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * استرجاع من نسخة احتياطية
   * Restore from backup
   */
  async restoreFromBackup(filename, options = {}) {
    try {
      const filepath = path.join(this.backupDir, filename);

      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'الملف غير موجود' };
      }

      logger.warn(`⚠️ جاري استرجاع من نسخة احتياطية: ${filename}`);

      let backupData;
      const isCompressed = filename.endsWith('.gz');

      if (isCompressed) {
        // فك ضغط البيانات
        const compressed = fs.readFileSync(filepath);
        const decompressed = await gunzip(compressed);
        backupData = JSON.parse(decompressed.toString());
      } else {
        backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      }

      // التحقق من إصدار البيانات
      if (!backupData.version && !backupData.dataVersion) {
        return { success: false, error: 'صيغة نسخة احتياطية غير مدعومة' };
      }

      // خيارات الاستعادة
      const {
        dryRun = false,  // فقط معاينة بدون تطبيق
        collections = null  // مجموعات محددة للاستعادة
      } = options;

      if (dryRun) {
        // معاينة فقط
        return {
          success: true,
          preview: true,
          message: 'معاينة النسخة الاحتياطية',
          metadata: backupData.metadata,
          statistics: backupData.statistics || {
            users: backupData.users?.length || 0,
            groups: backupData.collections?.groups?.count || 0,
            transactions: backupData.collections?.transactions?.count || 0
          }
        };
      }

      // الاستعادة الفعلية (محفوفة بالمخاطر!)
      logger.warn('⚠️ تحذير: الاستعادة الفعلية تتطلب صلاحيات خاصة وقد تؤدي لفقدان البيانات الحالية');
      
      return {
        success: true,
        message: 'تم قراءة ملف النسخة الاحتياطية بنجاح (الاستعادة الفعلية تتطلب تأكيد إضافي)',
        metadata: backupData.metadata,
        timestamp: backupData.timestamp,
        requiresConfirmation: true
      };
    } catch (error) {
      logger.error(`❌ خطأ في الاسترجاع: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * استعادة مجموعة معينة
   * Restore specific collection
   */
  async restoreCollection(collectionName, data, Model, options = {}) {
    try {
      const { clearExisting = false, mergeStrategy = 'skip' } = options;

      if (clearExisting) {
        logger.warn(`⚠️ حذف البيانات الحالية من ${collectionName}`);
        await Model.deleteMany({});
      }

      let inserted = 0;
      let skipped = 0;
      let errors = 0;

      for (const item of data) {
        try {
          if (mergeStrategy === 'skip') {
            // تخطي إذا كان موجوداً
            const exists = await Model.findOne({ _id: item._id });
            if (exists) {
              skipped++;
              continue;
            }
          } else if (mergeStrategy === 'replace') {
            // استبدال إذا كان موجوداً
            await Model.findOneAndUpdate(
              { _id: item._id },
              item,
              { upsert: true, new: true }
            );
            inserted++;
            continue;
          }

          await Model.create(item);
          inserted++;
        } catch (err) {
          errors++;
          logger.error(`خطأ في استعادة عنصر من ${collectionName}: ${err.message}`);
        }
      }

      return { success: true, inserted, skipped, errors };
    } catch (error) {
      logger.error(`❌ خطأ في استعادة ${collectionName}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * عرض قائمة النسخ الاحتياطية
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))
        .map(f => {
          const filepath = path.join(this.backupDir, f);
          const stats = fs.statSync(filepath);
          const sizeKB = (stats.size / BYTES_PER_KB).toFixed(2);
          const sizeMB = (stats.size / BYTES_PER_MB).toFixed(2);
          return {
            filename: f,
            size: stats.size > BYTES_PER_MB ? `${sizeMB} MB` : `${sizeKB} KB`,
            sizeBytes: stats.size,
            date: stats.mtime.toLocaleString('ar-SA', { 
              timeZone: 'Asia/Riyadh',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: stats.mtime.getTime(),
            type: this.getBackupType(f),
            compressed: f.endsWith('.gz')
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      return files;
    } catch (error) {
      logger.error(`خطأ في قائمة النسخ: ${error.message}`);
      return [];
    }
  }

  /**
   * الحصول على نوع النسخة الاحتياطية
   */
  getBackupType(filename) {
    if (filename.includes('full_backup')) return 'كاملة';
    if (filename.includes('users_backup')) return 'مستخدمين';
    if (filename.includes('groups_backup')) return 'مجموعات';
    if (filename.includes('transactions_backup')) return 'معاملات';
    return 'أخرى';
  }

  /**
   * الحصول على حجم الملف
   */
  getFileSize(filepath) {
    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / BYTES_PER_KB).toFixed(2);
    const sizeMB = (stats.size / BYTES_PER_MB).toFixed(2);
    return stats.size > BYTES_PER_MB ? `${sizeMB} MB` : `${sizeKB} KB`;
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
    // نسخة احتياطية كاملة يومية الساعة 2 صباحاً
    node_cron.schedule('0 2 * * *', async () => {
      logger.info('📸 بدء النسخة الاحتياطية اليومية الكاملة...');
      const result = await this.fullBackup(true); // مع الضغط
      if (result.success) {
        logger.info(`✅ نسخة احتياطية يومية ناجحة - الحجم: ${result.size}`);
      }
    });

    // نسخة احتياطية سريعة للمستخدمين كل 6 ساعات
    node_cron.schedule('0 */6 * * *', async () => {
      logger.info('📸 نسخة احتياطية سريعة للمستخدمين...');
      const result = await this.backupUsers();
      if (result.success) {
        logger.info(`✅ نسخة احتياطية سريعة (${result.count} مستخدم)`);
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

    backups.slice(0, 10).forEach((backup, index) => {
      const icon = backup.compressed ? '📦' : '📄';
      const typeIcon = backup.type === 'كاملة' ? '🔵' : '🟢';
      text += `${index + 1}. ${typeIcon} ${icon} <code>${backup.filename}</code>\n`;
      text += `   📊 ${backup.size} | ${backup.type}\n`;
      text += `   📅 ${backup.date}\n\n`;
    });

    if (backups.length > 10) {
      text += `\n... وعدد ${backups.length - 10} نسخة أخرى\n\n`;
    }

    text += `📈 المجموع: ${backups.length} نسخة احتياطية`;
    return text;
  }

  /**
   * إحصائيات النسخ الاحتياطية
   */
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0);
    const fullBackups = backups.filter(b => b.type === 'كاملة').length;
    const compressedBackups = backups.filter(b => b.compressed).length;

    return {
      backupCount: backups.length,
      fullBackups,
      compressedBackups,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: backups[backups.length - 1]?.date,
      newestBackup: backups[0]?.date
    };
  }

  /**
   * تنسيق الحجم بالبايتات
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
    return `${parseFloat((bytes / Math.pow(BYTES_PER_KB, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * عمل نسخة احتياطية تدريجية (فقط التغييرات منذ آخر نسخة)
   * Incremental backup
   */
  async incrementalBackup() {
    try {
      const backups = this.listBackups();
      const lastFullBackup = backups.find(b => b.type === 'كاملة');
      
      if (!lastFullBackup) {
        logger.info('لا توجد نسخة كاملة، سيتم عمل نسخة كاملة...');
        return await this.fullBackup(true);
      }

      const lastBackupDate = new Date(lastFullBackup.timestamp);
      
      // جمع التغييرات منذ آخر نسخة احتياطية
      const [users, groups, transactions] = await Promise.all([
        User.find({ updatedAt: { $gte: lastBackupDate } }).lean(),
        Group.find({ updatedAt: { $gte: lastBackupDate } }).lean(),
        Transaction.find({ createdAt: { $gte: lastBackupDate } }).lean()
      ]);

      const incrementalData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        type: 'incremental',
        basedOn: lastFullBackup.filename,
        changes: {
          users: { count: users.length, data: users },
          groups: { count: groups.length, data: groups },
          transactions: { count: transactions.length, data: transactions }
        }
      };

      const timestamp = Date.now();
      const filename = `incremental_backup_${timestamp}.json.gz`;
      const filepath = path.join(this.backupDir, filename);

      const compressed = await gzip(JSON.stringify(incrementalData, null, 2));
      fs.writeFileSync(filepath, compressed);

      logger.info(`✅ نسخة احتياطية تدريجية: ${filename}`);

      return {
        success: true,
        filename,
        type: 'incremental',
        changesCount: users.length + groups.length + transactions.length
      };
    } catch (error) {
      logger.error(`❌ خطأ في النسخة التدريجية: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * حذف نسخة احتياطية محددة
   */
  async deleteBackup(filename) {
    try {
      const filepath = path.join(this.backupDir, filename);
      
      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'الملف غير موجود' };
      }

      fs.unlinkSync(filepath);
      logger.info(`🗑️ تم حذف النسخة الاحتياطية: ${filename}`);

      return { success: true, message: 'تم الحذف بنجاح' };
    } catch (error) {
      logger.error(`خطأ في حذف النسخة الاحتياطية: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BackupSystem;
