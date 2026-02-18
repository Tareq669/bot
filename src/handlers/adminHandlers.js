/**
 * Admin and Owner Handlers
 * Handles all administrative commands and actions for bot owners
 */

const { logger } = require('../utils/logger');
const { ERROR_MESSAGES } = require('../config/constants');
const { Markup } = require('telegraf');

class AdminHandlers {
  /**
   * Register all admin handlers with the bot
   * @param {Telegraf} bot - Telegraf bot instance
   */
  static register(bot) {
    // Health check command
    bot.command('health', AdminHandlers.handleHealthCommand);
    bot.command('myid', AdminHandlers.handleMyIdCommand);
    bot.command('owners', AdminHandlers.handleOwnersCommand);
    bot.command('backup', AdminHandlers.handleBackupCommand);

    // Owner action handlers
    bot.action('owner:banned', AdminHandlers.handleBannedUsers);
    bot.action('owner:dbinfo', AdminHandlers.handleDatabaseInfo);
    bot.action('owner:richest', AdminHandlers.handleRichestUsers);
    bot.action('owner:rewardall', AdminHandlers.handleRewardAll);
    bot.action('owner:systems', AdminHandlers.handleSystemsStatus);
    bot.action('owner:cleanup', AdminHandlers.handleCleanup);
    bot.action('owner:cleanup:confirm', AdminHandlers.handleCleanupConfirm);

    // Backup action handlers
    bot.action('backup:full', AdminHandlers.handleFullBackup);
    bot.action('backup:users', AdminHandlers.handleUsersBackup);
    bot.action('backup:list', AdminHandlers.handleBackupList);
    bot.action('backup:stats', AdminHandlers.handleBackupStats);
    bot.action('backup:incremental', AdminHandlers.handleIncrementalBackup);

    logger.info('Admin handlers registered successfully');
  }

  /**
   * Check if user is owner
   * @param {number} userId - User ID to check
   * @returns {boolean} True if user is owner
   */
  static isOwner(userId) {
    const UIManager = require('../ui/keyboards');
    return UIManager.isOwner(userId);
  }

  /**
   * Handle health check command
   */
  static async handleHealthCommand(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      const healthMonitor = require('../utils/healthMonitor');
      const report = healthMonitor.getFullReport();
      await ctx.reply(report, { parse_mode: 'Markdown' });

      logger.logCommand('health', ctx.from.id, true);
    } catch (error) {
      logger.error('Health command error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle myid command
   */
  static async handleMyIdCommand(ctx) {
    try {
      const isOwner = AdminHandlers.isOwner(ctx.from.id);

      await ctx.reply(
        '🆔 <b>معلومات حسابك</b>\n\n' +
        `👤 الاسم: ${ctx.from.first_name || 'غير متوفر'}\n` +
        `🔢 Telegram ID: <code>${ctx.from.id}</code>\n` +
        `👨‍💼 اليوزر: ${ctx.from.username ? `@${  ctx.from.username}` : 'غير متوفر'}\n` +
        `${isOwner ? '👑 <b>أنت مالك البوت</b>' : ''}`,
        { parse_mode: 'HTML' }
      );

      logger.logCommand('myid', ctx.from.id, true);
    } catch (error) {
      logger.error('MyID command error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle owners command
   */
  static async handleOwnersCommand(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);

      await ctx.reply(
        '👑 <b>مالكي البوت</b>\n\n' +
        `IDs: <code>${ownerIds.join(', ')}</code>\n\n` +
        '📝 لإضافة مالك جديد:\n' +
        '1. اطلب منه إرسال /myid للبوت\n' +
        '2. أضف ID الخاص به في ملف .env\n' +
        '3. BOT_OWNERS=ID1,ID2,ID3\n' +
        '4. أعد تشغيل البوت',
        { parse_mode: 'HTML' }
      );

      logger.logCommand('owners', ctx.from.id, true);
    } catch (error) {
      logger.error('Owners command error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle backup command - Enhanced with multiple options
   */
  static async handleBackupCommand(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
      }

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();

      // عرض قائمة خيارات النسخ الاحتياطي
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📦 نسخ كامل', 'backup:full'),
          Markup.button.callback('👥 نسخ المستخدمين', 'backup:users')
        ],
        [
          Markup.button.callback('📋 قائمة النسخ', 'backup:list'),
          Markup.button.callback('📊 الإحصائيات', 'backup:stats')
        ],
        [
          Markup.button.callback('♻️ نسخ تدريجي', 'backup:incremental')
        ]
      ]);

      await ctx.reply(
        '💾 <b>نظام النسخ الاحتياطي</b>\n\n' +
        'اختر نوع النسخة الاحتياطية:\n\n' +
        '📦 <b>نسخ كامل:</b> جميع البيانات (مضغوط)\n' +
        '👥 <b>نسخ المستخدمين:</b> بيانات المستخدمين فقط\n' +
        '♻️ <b>نسخ تدريجي:</b> التغييرات منذ آخر نسخة\n' +
        '📋 <b>قائمة النسخ:</b> عرض النسخ المتاحة\n' +
        '📊 <b>الإحصائيات:</b> معلومات عن النسخ الاحتياطية',
        { 
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        }
      );

      logger.logCommand('backup', ctx.from.id, true);
    } catch (error) {
      logger.error('Backup command error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle full backup action
   */
  static async handleFullBackup(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      await ctx.answerCbQuery('⏳ جاري إنشاء نسخة احتياطية كاملة...');

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();
      const result = await backup.fullBackup(true); // with compression

      if (result.success) {
        const message = 
          '✅ <b>نسخة احتياطية كاملة ناجحة!</b>\n\n' +
          `📦 الملف: <code>${result.filename}</code>\n` +
          `📊 الحجم: ${result.size}\n` +
          `🗜️ مضغوط: نعم\n\n` +
          '<b>الإحصائيات:</b>\n' +
          `👤 المستخدمين: ${result.statistics.totalUsers}\n` +
          `🏢 المجموعات: ${result.statistics.totalGroups}\n` +
          `💰 المعاملات: ${result.statistics.totalTransactions}\n` +
          `🎮 إحصائيات الألعاب: ${result.statistics.totalGameStats}`;

        await ctx.reply(message, { parse_mode: 'HTML' });
        logger.success('Full backup completed', result.statistics);
      } else {
        await ctx.reply(`❌ فشل النسخ الاحتياطي: ${result.error}`);
        logger.error('Full backup failed', result.error);
      }
    } catch (error) {
      logger.error('Full backup action error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle users backup action
   */
  static async handleUsersBackup(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      await ctx.answerCbQuery('⏳ جاري نسخ بيانات المستخدمين...');

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();
      const result = await backup.backupUsers();

      if (result.success) {
        await ctx.reply(
          `✅ تم النسخ الاحتياطي للمستخدمين!\n\n` +
          `📦 ${result.filename}\n` +
          `👥 ${result.count} مستخدم`
        );
        logger.success('Users backup completed', { count: result.count });
      } else {
        await ctx.reply('❌ فشل النسخ الاحتياطي');
        logger.error('Users backup failed');
      }
    } catch (error) {
      logger.error('Users backup action error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle backup list action
   */
  static async handleBackupList(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      await ctx.answerCbQuery();

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();
      const message = backup.formatBackupsList();

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Backup list action error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle backup stats action
   */
  static async handleBackupStats(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      await ctx.answerCbQuery();

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();
      const stats = backup.getBackupStats();

      const message =
        '📊 <b>إحصائيات النسخ الاحتياطية</b>\n\n' +
        `📈 عدد النسخ: ${stats.backupCount}\n` +
        `🔵 نسخ كاملة: ${stats.fullBackups}\n` +
        `🗜️ نسخ مضغوطة: ${stats.compressedBackups}\n` +
        `💾 الحجم الإجمالي: ${stats.totalSize}\n\n` +
        `📅 أحدث نسخة: ${stats.newestBackup || 'لا يوجد'}\n` +
        `📅 أقدم نسخة: ${stats.oldestBackup || 'لا يوجد'}`;

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Backup stats action error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle incremental backup action
   */
  static async handleIncrementalBackup(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      await ctx.answerCbQuery('⏳ جاري إنشاء نسخة احتياطية تدريجية...');

      const BackupSystem = require('../utils/backupSystem');
      const backup = new BackupSystem();
      const result = await backup.incrementalBackup();

      if (result.success) {
        await ctx.reply(
          `✅ نسخة احتياطية تدريجية ناجحة!\n\n` +
          `📦 ${result.filename}\n` +
          `📝 عدد التغييرات: ${result.changesCount}`
        );
        logger.success('Incremental backup completed', { changes: result.changesCount });
      } else {
        await ctx.reply(`❌ فشل النسخ التدريجي: ${result.error}`);
        logger.error('Incremental backup failed', result.error);
      }
    } catch (error) {
      logger.error('Incremental backup action error:', error);
      ctx.reply(ERROR_MESSAGES.GENERIC);
    }
  }

  /**
   * Handle banned users list
   */
  static async handleBannedUsers(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const { User } = require('../database/models');
      const banned = await User.find({ banned: true }).limit(20);

      let message = `🚫 <b>المستخدمون المحظورون (${banned.length})</b>\n\n`;

      if (banned.length === 0) {
        message += 'لا يوجد مستخدمون محظورون حالياً';
      } else {
        banned.forEach((u, i) => {
          message += `${i + 1}. ${u.firstName}\n`;
          message += `   ID: <code>${u.userId}</code>\n`;
          message += `   السبب: ${u.bannedReason || 'غير محدد'}\n\n`;
        });
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'owner:panel')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }

      logger.logInteraction(ctx.from.id, 'view_banned_users');
    } catch (error) {
      logger.error('Banned users handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle database info
   */
  static async handleDatabaseInfo(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const mongoose = require('mongoose');
      const dbStats = await mongoose.connection.db.stats();

      const message = '🗄️ <b>معلومات قاعدة البيانات</b>\n\n' +
        '📊 <b>الإحصائيات:</b>\n' +
        `• الاسم: ${mongoose.connection.db.databaseName}\n` +
        `• الحجم: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB\n` +
        `• حجم التخزين: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB\n` +
        `• عدد المستندات: ${dbStats.objects}\n` +
        `• المجموعات: ${dbStats.collections}\n` +
        `• الفهارس: ${dbStats.indexes}\n\n` +
        '📡 <b>الاتصال:</b>\n' +
        `• الحالة: ${mongoose.connection.readyState === 1 ? '✅ متصل' : '❌ غير متصل'}\n` +
        `• Host: ${mongoose.connection.host}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'owner:dbinfo')],
        [Markup.button.callback('⬅️ رجوع', 'owner:database')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }

      logger.logInteraction(ctx.from.id, 'view_database_info');
    } catch (error) {
      logger.error('Database info handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle richest users
   */
  static async handleRichestUsers(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const { User } = require('../database/models');
      const richest = await User.find().sort({ coins: -1 }).limit(10);

      let message = '💰 <b>أغنى 10 مستخدمين</b>\n\n';
      richest.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        message += `${medal} ${u.firstName}\n`;
        message += `   💰 ${u.coins.toLocaleString()} عملة\n`;
        message += `   ID: <code>${u.userId}</code>\n\n`;
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'owner:economy')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }

      logger.logInteraction(ctx.from.id, 'view_richest_users');
    } catch (error) {
      logger.error('Richest users handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle reward all users
   */
  static async handleRewardAll(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      ctx.session = ctx.session || {};
      ctx.session.ownerAwait = { type: 'rewardall' };

      await ctx.answerCbQuery('✅ جاهز');
      await ctx.reply(
        '🎁 <b>مكافأة جماعية</b>\n\n' +
        'اكتب المبلغ الذي تريد إعطاءه لجميع المستخدمين:\n\n' +
        '❌ اكتب /cancel للإلغاء',
        { parse_mode: 'HTML' }
      );

      logger.logInteraction(ctx.from.id, 'reward_all_initiated');
    } catch (error) {
      logger.error('Reward all handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle systems status
   */
  static async handleSystemsStatus(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const mongoose = require('mongoose');
      const uptime = process.uptime();
      const memory = process.memoryUsage();

      const message = '⚡ <b>حالة الأنظمة</b>\n\n' +
        '🤖 <b>البوت:</b>\n' +
        '• الحالة: ✅ يعمل\n' +
        `• وقت التشغيل: ${Math.floor(uptime / 60)} دقيقة\n` +
        `• PID: ${process.pid}\n\n` +
        '💾 <b>الذاكرة:</b>\n' +
        `• المستخدمة: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
        `• المجموع: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
        `• RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB\n\n` +
        '🗄️ <b>قاعدة البيانات:</b>\n' +
        `• الحالة: ${mongoose.connection.readyState === 1 ? '✅ متصل' : '❌ غير متصل'}\n\n` +
        '📊 <b>Node.js:</b>\n' +
        `• الإصدار: ${process.version}\n` +
        `• المنصة: ${process.platform}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'owner:systems')],
        [Markup.button.callback('⬅️ رجوع', 'owner:panel')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }

      logger.logInteraction(ctx.from.id, 'view_systems_status');
    } catch (error) {
      logger.error('Systems status handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle cleanup inactive users
   */
  static async handleCleanup(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const { User } = require('../database/models');
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveCount = await User.countDocuments({
        lastActiveDay: { $lt: ninetyDaysAgo }
      });

      const message = '🗑️ <b>تنظيف البيانات</b>\n\n' +
        `المستخدمون الغير نشطين (أكثر من 90 يوم): ${inactiveCount}\n\n` +
        '⚠️ هل تريد حذفهم؟\n\n' +
        '⚠️ هذا الإجراء لا يمكن التراجع عنه!';

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ نعم، احذف', 'owner:cleanup:confirm'),
          Markup.button.callback('❌ إلغاء', 'owner:panel')
        ]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      }

      logger.logInteraction(ctx.from.id, 'cleanup_initiated', { inactiveCount });
    } catch (error) {
      logger.error('Cleanup handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle cleanup confirmation
   */
  static async handleCleanupConfirm(ctx) {
    try {
      if (!AdminHandlers.isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ غير مصرح');
      }

      const { User } = require('../database/models');
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await User.deleteMany({
        lastActiveDay: { $lt: ninetyDaysAgo }
      });

      await ctx.answerCbQuery(`✅ تم حذف ${result.deletedCount} مستخدم`);
      await ctx.editMessageText(
        '✅ <b>تمت عملية التنظيف</b>\n\n' +
        `عدد المستخدمين المحذوفين: ${result.deletedCount}`,
        { parse_mode: 'HTML' }
      );

      logger.success('Cleanup completed', { deletedCount: result.deletedCount });
      logger.logInteraction(ctx.from.id, 'cleanup_completed', { deletedCount: result.deletedCount });
    } catch (error) {
      logger.error('Cleanup confirm handler error:', error);
      ctx.answerCbQuery('❌ حدث خطأ');
    }
  }
}

module.exports = AdminHandlers;
