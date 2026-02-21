const isRailwayEnvironment = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_GIT_REPO_NAME
);

// Load .env only for local development (Railway provides env vars natively).
if (!isRailwayEnvironment) {
  require('dotenv').config();
}

const { Telegraf, session, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const Database = require('./database/db');
const CommandHandler = require('./commands/commandHandler');
const MenuHandler = require('./commands/menuHandler');
const GameHandler = require('./commands/gameHandler');
const QuranicGamesHandler = require('./commands/quranicGamesHandler');
const EconomyHandler = require('./commands/economyHandler');
const ContentHandler = require('./commands/contentHandler');
const ProfileHandler = require('./commands/profileHandler');
const { logger } = require('./utils/helpers');
const ReconnectManager = require('./utils/reconnect');
const connectionMonitor = require('./utils/connectionMonitor');
const healthMonitor = require('./utils/healthMonitor');
const Formatter = require('./utils/formatter');

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().replace(/^["']|["']$/g, '');
};

const isMissingRequiredEnv = (value) => {
  if (typeof value !== 'string') {
    return true;
  }
  const normalized = normalizeEnvValue(value);
  const invalidLiterals = new Set([
    '',
    'undefined',
    'null',
    'your_huggingface_token_here',
    'your_telegram_bot_token_here'
  ]);
  return invalidLiterals.has(normalized.toLowerCase());
};

const requiredEnvVars = ['BOT_TOKEN', 'HF_TOKEN'];
const missingEnvVars = requiredEnvVars.filter((envName) => {
  const value = process.env[envName];
  return isMissingRequiredEnv(value);
});

if (missingEnvVars.length > 0) {
  logger.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  logger.error('💡 Set them in Railway Variables (production) or .env (local development).');
  process.exit(1);
}

process.env.BOT_TOKEN = normalizeEnvValue(process.env.BOT_TOKEN);
process.env.HF_TOKEN = normalizeEnvValue(process.env.HF_TOKEN);

const imageHandler = require('./handlers/imageHandler');

// Configure HTTPS Agent for Telegram API
const httpsAgent = new https.Agent({
  timeout: 60000,
  keepAlive: true,
  keepAliveMsecs: 30000
});

// Initialize bot with proper config
const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    agent: httpsAgent,
    apiRoot: 'https://api.telegram.org'
  },
  polling: {
    timeout: 30,
    limit: 100,
    allowedUpdates: ['message', 'callback_query', 'inline_query']
  }
});

// Initialize session middleware
bot.use(session());


// --- SET BOT COMMANDS MENU ---
bot.telegram
  .setMyCommands([
    { command: 'start', description: '🏠 الرئيسية' },
    { command: 'khatma', description: '🕌 الختمة' },
    { command: 'adhkar', description: '📿 الأذكار' },
    { command: 'quran', description: '📖 القرآن' },
    { command: 'games', description: '🎮 الألعاب' },
    { command: 'qgames', description: '🎯 الألعاب القرآنية' },
    { command: 'economy', description: '💰 الاقتصاد' },
    { command: 'shop', description: '🛍️ المتجر' },
    { command: 'transfer', description: '📤 تحويل أموال' },
    { command: 'profile', description: '👤 حسابي' },
    { command: 'leaderboard', description: '🏆 المتصدرين' },
    { command: 'notifications', description: '🔔 الإشعارات' },
    { command: 'image', description: '🎨 توليد صورة' },
    { command: 'help', description: '❓ المساعدة' }
  ])
  .catch((err) => {
    logger.error('خطأ في تعيين قائمة الأوامر:', err);
  });

// Error handling for bot
bot.catch((err, ctx) => {
  // تجاهل أخطاء Timeout المتوقعة
  if (err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH') {
    logger.warn(`⚠️ خطأ اتصال مؤقت: ${err.code}`);
    return;
  }

  logger.error('❌ خطأ في البوت:', err);
  healthMonitor.logError();

  // حاول الرد على المستخدم
  try {
    if (ctx && ctx.reply && err.code !== 409) {
      ctx.reply('❌ حدث خطأ غير متوقع، جاري محاولة الإصلاح...').catch((e) => {
        logger.error('فشل الرد على الخطأ:', e.message);
      });
    }
  } catch (e) {
    logger.error('فشل في معالجة الخطأ:', e.message);
  }
});

// --- STARTUP COMMANDS ---
bot.start((ctx) => CommandHandler.handleStart(ctx));
bot.help((ctx) => CommandHandler.handleHelp(ctx));

// --- COMMAND HANDLERS ---
bot.command('profile', (ctx) => CommandHandler.handleProfile(ctx));
bot.command('balance', (ctx) => CommandHandler.handleBalance(ctx));
bot.command('leaderboard', (ctx) => CommandHandler.handleLeaderboard(ctx));
bot.command('daily', (ctx) => CommandHandler.handleDailyReward(ctx));
bot.command('features', (ctx) => CommandHandler.handleFeaturesMenu(ctx));
bot.command('goals', (ctx) => CommandHandler.handleGoals(ctx));
bot.command('charity', (ctx) => CommandHandler.handleCharity(ctx));
bot.command('memorization', (ctx) => CommandHandler.handleMemorization(ctx));
bot.command('dua', (ctx) => CommandHandler.handleDua(ctx));
bot.command('referral', (ctx) => CommandHandler.handleReferral(ctx));
bot.command('events', (ctx) => CommandHandler.handleEvents(ctx));
bot.command('library', (ctx) => CommandHandler.handleLibrary(ctx));
bot.command('teams', (ctx) => CommandHandler.handleTeams(ctx));

// --- QUICK MENU COMMANDS ---
bot.command('khatma', (ctx) => MenuHandler.handleKhatmaMenu(ctx));
bot.command('adhkar', (ctx) => MenuHandler.handleAdhkarMenu(ctx));
bot.command('quran', (ctx) => MenuHandler.handleQuranMenu(ctx));
bot.command('quotes', (ctx) => MenuHandler.handleQuotesMenu(ctx));
bot.command('poetry', (ctx) => MenuHandler.handlePoetryMenu(ctx));
bot.command('games', (ctx) => MenuHandler.handleGamesMenu(ctx));
bot.command('economy', (ctx) => MenuHandler.handleEconomyMenu(ctx));
bot.command('stats', (ctx) => CommandHandler.handleStats(ctx));
bot.command('rewards', (ctx) => CommandHandler.handleRewards(ctx));

// --- IMAGE GENERATION COMMAND ---
bot.command('image', (ctx) => imageHandler.handleImageCommand(ctx));

// --- NEW FEATURES COMMANDS ---
// Shop System
bot.command('shop', async (ctx) => {
  try {
    const ShopSystem = require('./features/shopSystem');
    const menu = ShopSystem.formatShopMenu();
    ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Shop error:', error);
    ctx.reply('❌ خدمة المتجر غير متاحة');
  }
});

// Payment & Transfer
bot.command('transfer', async (ctx) => {
  try {
    const msg = ctx.message.text.split(' ');

    if (msg.length < 3) {
      return ctx.reply('استخدم: /transfer @username amount\nمثال: /transfer @user 100');
    }

    ctx.reply('🔄 جاري معالجة التحويل...');
  } catch (error) {
    ctx.reply('❌ حدث خطأ في التحويل');
  }
});


// Notifications Management
bot.command('notifications', async (ctx) => {
  try {
    const msg4 = `🔔 <b>إدارة الإشعارات</b>\n\n${ctx.message.from.first_name}\n\nاستخدم الخيارات التالية:\n✅ تفعيل\n❌ تعطيل\n\n/notif on|off`;
    ctx.reply(msg4, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('❌ خدمة الإشعارات غير متاحة');
  }
});

bot.command('notif', async (ctx) => {
  try {
    const parts = ctx.message.text.trim().split(/\s+/);
    const action = (parts[1] || '').toLowerCase();
    const { User } = require('./database/models');

    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

    user.notifications = user.notifications || { enabled: true };

    if (action === 'on') {
      user.notifications.enabled = true;
      await user.save();
      return ctx.reply('✅ تم تفعيل الإشعارات');
    }

    if (action === 'off') {
      user.notifications.enabled = false;
      await user.save();
      return ctx.reply('❌ تم تعطيل الإشعارات');
    }

    return ctx.reply('استخدم: /notif on|off');
  } catch (error) {
    ctx.reply('❌ حدث خطأ في تحديث الإشعارات');
  }
});

// Backup System
bot.command('backup', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);

  if (!ownerIds.includes(ctx.from.id)) {
    return ctx.reply('❌ ليس لديك صلاحية');
  }

  try {
    const BackupSystem = require('./utils/backupSystem');
    const backup = new BackupSystem();
    const result = await backup.backupUsers();

    if (result.success) {
      ctx.reply(`✅ تم النسخ الاحتياطية!\n📦 ${result.filename}\n👥 ${result.count} مستخدم`);
    } else {
      ctx.reply('❌ فشل النسخ الاحتياطية');
    }
  } catch (error) {
    ctx.reply('❌ خطأ في النسخ الاحتياطية');
  }
});

// Quranic Games
bot.command('qgames', async (ctx) => {
  try {
    const QuranicGames = require('./games/quranicGames');
    const menu = QuranicGames.formatGamesList();
    ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('❌ خدمة الألعاب غير متاحة');
  }
});

// --- ADMIN COMMANDS ---
bot.command('health', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);

  if (ownerIds.includes(ctx.from.id)) {
    const report = healthMonitor.getFullReport();
    await ctx.reply(report, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ ليس لديك صلاحية لهذا الأمر');
  }
});

bot.command('myid', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  const isOwner = ownerIds.includes(ctx.from.id);

  await ctx.reply(
    '🆔 <b>معلومات حسابك</b>\n\n' +
      `👤 الاسم: ${  ctx.from.first_name || 'غير متوفر'  }\n` +
      `🔢 Telegram ID: <code>${  ctx.from.id  }</code>\n` +
      `👨‍💼 اليوزر: ${  ctx.from.username ? `@${  ctx.from.username}` : 'غير متوفر'  }\n${
        isOwner ? '👑 <b>أنت مالك البوت</b>' : ''}`,
    { parse_mode: 'HTML' }
  );
});

bot.command('owners', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);

  if (!ownerIds.includes(ctx.from.id)) {
    return ctx.reply('❌ ليس لديك صلاحية لهذا الأمر');
  }

  await ctx.reply(
    '👑 <b>مالكي البوت</b>\n\n' +
      `IDs: <code>${  ownerIds.join(', ')  }</code>\n\n` +
      '📝 لإضافة مالك جديد:\n' +
      '1. اطلب منه إرسال /myid للبوت\n' +
      '2. أضف ID الخاص به في ملف .env\n' +
      '3. BOT_OWNERS=ID1,ID2,ID3\n' +
      '4. أعد تشغيل البوت',
    { parse_mode: 'HTML' }
  );
});

bot.command('givecoins', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);

  if (!ownerIds.includes(ctx.from.id)) {
    return ctx.reply('❌ ليس لديك صلاحية لهذا الأمر');
  }

  return CommandHandler.handleOwnerGiveCoins(ctx);
});

// --- OWNER ONLY COMMANDS ---
bot.command('owner', (ctx) => CommandHandler.handleOwnerPanel(ctx));
bot.command('panel', (ctx) => CommandHandler.handleOwnerPanel(ctx));

// --- OWNER ACTIONS ---
bot.action('owner:panel', (ctx) => CommandHandler.handleOwnerPanel(ctx));
bot.action('owner:stats', (ctx) => CommandHandler.handleOwnerStats(ctx));
bot.action('owner:users', (ctx) => CommandHandler.handleOwnerUsers(ctx));
bot.action('owner:broadcast', (ctx) => CommandHandler.handleOwnerBroadcast(ctx));
bot.action('owner:economy', (ctx) => CommandHandler.handleOwnerEconomy(ctx));
bot.action('owner:database', (ctx) => CommandHandler.handleOwnerDatabase(ctx));
bot.action('owner:logs', (ctx) => CommandHandler.handleOwnerLogs(ctx));
bot.action('owner:viewall', (ctx) => CommandHandler.handleOwnerViewAllUsers(ctx));
bot.action('owner:givecoins', (ctx) => CommandHandler.handleOwnerGiveCoins(ctx));

// Owner - Banned Users List
bot.action('owner:banned', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const { User } = require('./database/models');
    const banned = await User.find({ banned: true }).limit(20);

    let message = `🚫 <b>المستخدمون المحظورون (${banned.length})</b>\n\n`;

    if (banned.length === 0) {
      message += 'لا يوجد مستخدمون محظورون حالياً';
    } else {
      banned.forEach((u, i) => {
        message += `${i + 1}. ${u.firstName}\n`;
        message += `   ID: <code>${u.userId}</code>\n`;
        message += `   السبب: ${u.banReason || 'غير محدد'}\n\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:panel')]]);

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
  } catch (error) {
    console.error('Owner banned error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Database Info
bot.action('owner:dbinfo', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const mongoose = require('mongoose');
    const dbStats = await mongoose.connection.db.stats();

    const message =
      '🗄️ <b>معلومات قاعدة البيانات</b>\n\n' +
      '📊 <b>الإحصائيات:</b>\n' +
      `• الاسم: ${  mongoose.connection.db.databaseName  }\n` +
      `• الحجم: ${  (dbStats.dataSize / 1024 / 1024).toFixed(2)  } MB\n` +
      `• حجم التخزين: ${  (dbStats.storageSize / 1024 / 1024).toFixed(2)  } MB\n` +
      `• عدد المستندات: ${  dbStats.objects  }\n` +
      `• المجموعات: ${  dbStats.collections  }\n` +
      `• الفهارس: ${  dbStats.indexes  }\n\n` +
      '📡 <b>الاتصال:</b>\n' +
      `• الحالة: ${  mongoose.connection.readyState === 1 ? '✅ متصل' : '❌ غير متصل'  }\n` +
      `• Host: ${  mongoose.connection.host}`;
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
  } catch (error) {
    console.error('Owner dbinfo error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Richest Users
bot.action('owner:richest', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const { User } = require('./database/models');
    const richest = await User.find().sort({ coins: -1 }).limit(10);

    let message = '💰 <b>أغنى 10 مستخدمين</b>\n\n';
    richest.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      message += `${medal} ${u.firstName}\n`;
      message += `   💰 ${u.coins.toLocaleString()} عملة\n`;
      message += `   ID: <code>${u.userId}</code>\n\n`;
    });
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:economy')]]);

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
  } catch (error) {
    console.error('Owner richest error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Reward All Users
bot.action('owner:rewardall', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
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
  } catch (error) {
    console.error('Owner rewardall error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Systems Status
bot.action('owner:systems', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const mongoose = require('mongoose');
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const message =
      '⚡ <b>حالة الأنظمة</b>\n\n' +
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
  } catch (error) {
    console.error('Owner systems error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Cleanup inactive users
bot.action('owner:cleanup', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const { User } = require('./database/models');
    // Users inactive for more than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactiveCount = await User.countDocuments({
      lastActiveDay: { $lt: ninetyDaysAgo }
    });

    const message =
      '🗑️ <b>تنظيف البيانات</b>\n\n' +
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
  } catch (error) {
    console.error('Owner cleanup error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:cleanup:confirm', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const { User } = require('./database/models');
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await User.deleteMany({
      lastActiveDay: { $lt: ninetyDaysAgo }
    });

    await ctx.answerCbQuery(`✅ تم حذف ${result.deletedCount} مستخدم`);
    await ctx.editMessageText(
      '✅ <b>تمت عملية التنظيف</b>\n\n' + `عدد المستخدمين المحذوفين: ${result.deletedCount}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Owner cleanup confirm error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// --- MENU CALLBACKS ---
bot.action('menu:main', (ctx) => MenuHandler.handleMainMenu(ctx));
bot.action('menu:khatma', (ctx) => MenuHandler.handleKhatmaMenu(ctx));
bot.action('menu:adhkar', (ctx) => MenuHandler.handleAdhkarMenu(ctx));
bot.action('menu:quran', (ctx) => MenuHandler.handleQuranMenu(ctx));
bot.action('menu:quotes', (ctx) => MenuHandler.handleQuotesMenu(ctx));
bot.action('menu:poetry', (ctx) => MenuHandler.handlePoetryMenu(ctx));
bot.action('menu:games', (ctx) => MenuHandler.handleGamesMenu(ctx));
bot.action('menu:economy', (ctx) => MenuHandler.handleEconomyMenu(ctx));
bot.action('menu:profile', (ctx) => MenuHandler.handleProfileMenu(ctx));
bot.action('menu:features', (ctx) => CommandHandler.handleFeaturesMenu(ctx));
bot.action('menu:library', (ctx) => CommandHandler.handleLibrary(ctx));
bot.action('menu:leaderboard', (ctx) => MenuHandler.handleLeaderboardMenu(ctx));
bot.action('menu:settings', (ctx) => MenuHandler.handleSettingsMenu(ctx));
bot.action('menu:shop', (ctx) => MenuHandler.handleShopMenu(ctx));
bot.action('menu:transfers', (ctx) => MenuHandler.handleTransfersMenu(ctx));
bot.action('menu:smartnotifications', (ctx) => MenuHandler.handleSmartNotificationsMenu(ctx));
bot.action('menu:backups', (ctx) => MenuHandler.handleBackupsMenu(ctx));
bot.action('menu:cache', (ctx) => MenuHandler.handleCacheMenu(ctx));
bot.action('menu:protection', (ctx) => MenuHandler.handleProtectionMenu(ctx));

// Image generation callback
bot.action('image:generate', (ctx) => imageHandler.handleImageCallback(ctx));

bot.action('settings:notifications', (ctx) => MenuHandler.handleNotificationsSettings(ctx));
bot.action('settings:toggleNotify', (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  NotificationsHandler.handleNotificationsMenu(ctx);
});

// معالجات الإشعارات
bot.action('notify:menu', async (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  await NotificationsHandler.handleNotificationsMenu(ctx);
});

// تبديل الإشعار العام
bot.action('notify:toggle:all', async (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  await NotificationsHandler.handleToggleNotification(ctx, 'all');
});

// تبديل الإشعارات الفردية
bot.action(/^notify:toggle:(.+)$/, async (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  const type = ctx.match[1];
  await NotificationsHandler.handleToggleNotification(ctx, type);
});

// عرض سجل الإشعارات
bot.action('notify:logs', async (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  await NotificationsHandler.handleNotificationLogs(ctx);
});

// حذف سجل الإشعارات
bot.action('notify:clear', async (ctx) => {
  const NotificationsHandler = require('./commands/notificationsHandler');
  await NotificationsHandler.handleClearLogs(ctx);
});

bot.action('menu:newfeatures', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.newFeaturesMenuKeyboard();
  await ctx.editMessageText(
    '✨ <b>المميزات الجديدة في البوت</b>\n\n' +
      '🎮 <b>الألعاب القرآنية</b> - ألعاب تفاعلية قرآنية ممتعة\n' +
      '🛍️ <b>المتجر المتقدم</b> - أوسمة وجوائز وأدوات\n' +
      '💸 <b>النظام المالي</b> - تحويلات وتبرعات\n' +
      '🔔 <b>الإشعارات الذكية</b> - تنبيهات شخصية مخصصة\n' +
      '📁 <b>النسخ الاحتياطية</b> - حفظ البيانات تلقائياً\n' +
      '⚡ <b>نظام التخزين المؤقت</b> - أداء أسرع\n' +
      '🛡️ <b>حماية من الإساءة</b> - أمان معزز',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});
bot.action('menu:premiumfeatures', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.premiumFeaturesKeyboard();
  await ctx.editMessageText('💎 <b>الميزات المميزة</b>\n\n' + 'قريباً: ميزات احترافية حصرية', {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
});

// --- NEW QGAMES ACTIONS ---
bot.action('new:qgames', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.quranicGamesKeyboard();
  await ctx.editMessageText(
    '🎮 <b>الألعاب القرآنية</b>\n\n' +
      '1️⃣ <b>تخمين الآية</b> - خمّن الآية من الآيات الأربعة\n' +
      '2️⃣ <b>إكمال الآية</b> - أكمل الآية الناقصة\n' +
      '3️⃣ <b>اكتشف الفرق</b> - جد الفرق بين آيتين\n' +
      '4️⃣ <b>ثلاثيات قرآنية</b> - أجب على أسئلة قرآنية\n' +
      '5️⃣ <b>عد السور</b> - عد السور المذكورة\n\n' +
      '💰 كل لعبة توفر <b>10-20 عملة</b> عند النجاح!',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

// --- NEW SHOP ACTIONS ---
bot.action('new:shop', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.shopMenuKeyboard();
  await ctx.editMessageText(
    '🛍️ <b>متجر البوت المتقدم</b>\n\n' +
      '👑 <b>الأوسمة</b> - أوسمة عادية VIP وأسطورية\n' +
      '⚡ <b>المعززات</b> - معززات لعبتك بـ 2x و3x\n' +
      '🎁 <b>الجوائز</b> - جوائز حصرية\n' +
      '🎮 <b>أدوات الألعاب</b> - كنوز وأدوات خاصة\n\n' +
      '💰 <b>الرصيد:</b> استخدم <code>/balance</code>',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('shop:all', async (ctx) => {
  const shopSystem = require('./features/shopSystem');
  const items = shopSystem.getAllShopItems();
  let message = '🛍️ <b>كل العناصر المتاحة</b>\n\n';
  items.forEach((item) => {
    message += `${item.emoji} <b>${item.name}</b>\n💰 ${item.price} عملة\n${item.description}\n\n`;
  });
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'new:shop')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

// --- NEW TRANSFER ACTIONS ---
bot.action('new:transfer', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.transferMenuKeyboard();
  await ctx.editMessageText(
    '💸 <b>نظام التحويلات والتبرعات</b>\n\n' +
      '💸 <b>تحويل عملات</b> - حول عملاتك لأصدقائك\n' +
      '⭐ <b>تحويل نقاط</b> - شارك نقاطك\n' +
      '💝 <b>تبرع خيري</b> - تُرجع لمسكين\n' +
      '📊 <b>السجل</b> - شاهد تحويلاتك\n\n' +
      '✅ آمن وموثوق 100%',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('transfer:coins', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.ecoAwait = { type: 'transfer' };
  await ctx.reply(
    '💸 <b>تحويل عملات</b>\n\n' +
      'أدخل معرّف المستخدم الذي تريد التحويل له:\n\n' +
      '<code>@username</code> أو <code>معرّفه الرقمي</code>',
    { parse_mode: 'HTML' }
  );
});

bot.action('transfer:charity', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.ecoAwait = { type: 'donate' };
  await ctx.reply('💝 <b>تبرع خيري</b>\n\nأدخل المبلغ والجهة (اختياري):\nمثال: 100 مساعدة محتاج', {
    parse_mode: 'HTML'
  });
});

// --- NEW NOTIFICATIONS ACTIONS ---
bot.action('new:notifications', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.notificationsMenuKeyboard();
  await ctx.editMessageText(
    '🔔 <b>الإشعارات الذكية</b>\n\n' +
      '🕌 <b>إشعارات الأذكار</b> - تنبيهات يومية\n' +
      '⏰ <b>إشعارات الصلaة</b> - مواقيت الصلاة\n' +
      '🎮 <b>إشعارات الألعاب</b> - تذكر بالألعاب\n' +
      '💰 <b>إشعارات المكافآت</b> - عروض خاصة\n' +
      '🔔 <b>إشعارات الأحداث</b> - أحداث جديدة\n\n' +
      '⚙️ اختر الإشعارات التي تريدها',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

// تبديل الإشعارات (القديم)
bot.action(/notify:(adhkar|prayer|games|rewards|events|auction|stats)/, async (ctx) => {
  const type = ctx.match[1];
  const { User } = require('./database/models');

  let message = '';
  if (type !== 'stats') {
    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      await ctx.answerCbQuery('❌');
      return ctx.reply('❌ لم يتم العثور على ملفك');
    }

    user.notifications = user.notifications || { enabled: true };

    const fieldMap = {
      adhkar: 'adhkarReminder',
      prayer: 'prayerReminder',
      games: 'gameUpdates',
      rewards: 'rewardUpdates',
      events: 'eventReminder',
      auction: 'auctionUpdates'
    };

    const field = fieldMap[type];
    user.notifications[field] = !user.notifications[field];
    await user.save();

    const state = user.notifications[field] ? '✅ تم التفعيل' : '❌ تم التعطيل';
    const titleMap = {
      adhkar: '🕌 إشعارات الأذكار',
      prayer: '⏰ إشعارات الصلاة',
      games: '🎮 إشعارات الألعاب',
      rewards: '💰 إشعارات المكافآت',
      events: '🔔 إشعارات الأحداث',
      auction: '🏷️ إشعارات المزاد'
    };

    message = `${titleMap[type]}\n${state}`;
    await ctx.reply(message, { parse_mode: 'HTML' });
    return ctx.answerCbQuery('✅ تم');
  }

  switch (type) {
    case 'adhkar':
      message = '🕌 إشعارات الأذكار مفعلة\n✅ ستتلقى تنبيهات يومية بالأذكار';
      break;
    case 'prayer':
      message = '⏰ إشعارات الصلاة\n✅ ستتلقى مواقيت الصلاة';
      break;
    case 'games':
      message = '🎮 إشعارات الألعاب\n✅ سيتم تنبيهك بالألعاب الجديدة';
      break;
    case 'rewards':
      message = '💰 إشعارات المكافآت\n✅ ستتلقى عروض حصرية';
      break;
    case 'events':
      message = '🔔 إشعارات الأحداث\n✅ ستتلقى تنبيهات الأحداث';
      break;
    case 'stats': {
      const userStats = await require('./database/db').User.findById(ctx.from.id);
      message =
        '📊 <b>إحصائياتك</b>\n\n' +
        `💰 عملات: ${userStats.coins}\n` +
        `⭐ نقاط: ${userStats.xp}\n` +
        `🎮 الألعاب المكملة: ${userStats.gamesPlayed}\n` +
        `📖 القرآن المقروء: ${userStats.quranPages} صفحة`;
      break;
    }
  }

  await ctx.reply(message, { parse_mode: 'HTML' });
  ctx.answerCbQuery('✅ تم');
});


// --- NEW BACKUP ACTIONS ---
bot.action('new:backup', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.backupMenuKeyboard();
  await ctx.editMessageText(
    '📁 <b>نظام النسخ الاحتياطية</b>\n\n' +
      '💾 <b>النسخ التلقائية</b> - يومياً تلقائياً\n' +
      '📋 <b>قائمة النسخ</b> - كل النسخ المحفوظة\n' +
      '🔄 <b>استعادة</b> - عودة لنسخة قديمة\n' +
      '🗑️ <b>حذف</b> - حذف نسخة معينة\n\n' +
      '✅ بيانات آمنة محمية تماماً',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('backup:create', async (ctx) => {
  await ctx.answerCbQuery('⏳ جاري إنشاء نسخة احتياطية...');
  const backupSystem = require('./utils/backupSystem');
  const result = await backupSystem.createBackup('manual');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('backup:list', async (ctx) => {
  const backupSystem = require('./utils/backupSystem');
  const backups = await backupSystem.listBackups();
  let message = '📋 <b>قائمة النسخ الاحتياطية</b>\n\n';
  backups.forEach((b, i) => {
    message += `${i + 1}. ${b.date}\n📊 ${b.size}\n\n`;
  });
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'new:backup')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

// --- NEW CACHE ACTIONS ---
bot.action('new:cache', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.cacheSystemKeyboard();
  await ctx.editMessageText(
    '⚡ <b>نظام التخزين المؤقت</b>\n\n' +
      '📊 <b>إحصائيات</b> - معلومات الذاكرة\n' +
      '🧹 <b>مسح</b> - تفريغ الذاكرة\n' +
      '⚡ <b>الأداء</b> - حالة الأداء\n\n' +
      '⚙️ يحسّن سرعة البوت معاً',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('cache:stats', async (ctx) => {
  const cache = global.cache;
  const stats = cache.getStats();
  const message =
    '📊 <b>إحصائيات الذاكرة</b>\n\n' +
    `💾 العناصر: ${stats.keys}\n` +
    `✅ النجاحات: ${stats.hits}\n` +
    `❌ الفشل: ${stats.misses}\n` +
    `📈 معدل النجاح: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`;
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'new:cache')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

bot.action('cache:clear', async (ctx) => {
  await ctx.answerCbQuery('🧹 جاري المسح...');
  const cache = global.cache;
  cache.flushAll();
  await ctx.reply('✅ تم مسح الذاكرة بنجاح', { parse_mode: 'HTML' });
});

// --- NEW RATE LIMITER ACTIONS ---
bot.action('new:ratelimiter', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.rateLimiterKeyboard();
  await ctx.editMessageText(
    '🛡️ <b>نظام الحماية من الإساءة</b>\n\n' +
      '⚠️ <b>الحد من الرسائل</b> - 10 رسائل/دقيقة\n' +
      '⚠️ <b>الحد من الأوامر</b> - 20 أمر/دقيقة\n' +
      '⚠️ <b>الحد من الألعاب</b> - 5 ألعاب/5 دقائق\n\n' +
      '🔒 حماية عالية ضد الإساءة والبوتات المزعجة',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('ratelimit:status', async (ctx) => {
  const rateLimiter = global.rateLimiter;
  const status = rateLimiter.getUserStatus(ctx.from.id);
  const message =
    '📊 <b>حالة حسابك</b>\n\n' +
    `الرسائل: ${status.messages.count}/${status.messages.limit}\n` +
    `الأوامر: ${status.commands.count}/${status.commands.limit}\n` +
    `الألعاب: ${status.games.count}/${status.games.limit}\n\n` +
    `${status.blocked ? '🚫 <b>محظور حالياً</b>' : '✅ <b>آمن</b>'}`;
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'new:ratelimiter')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

bot.action('ratelimit:info', async (ctx) => {
  const message =
    '❓ <b>ما هو نظام الحماية؟</b>\n\n' +
    '🛡️ يحمي البوت من:\n' +
    '• البوتات المزعجة\n' +
    '• الهجمات المكثفة\n' +
    '• الاستخدام المفرط\n\n' +
    '⚠️ إذا تجاوزت الحد الأقصى:\n' +
    '• حظر تلقائي 5 دقائق\n' +
    '• شطب المحاولات الخاطئة\n\n' +
    '✅ الاستخدام الطبيعي آمن تماماً';
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'new:ratelimiter')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

// --- ADVANCED FEATURES ACTIONS ---
bot.action('features:goals', (ctx) => CommandHandler.handleGoals(ctx));
bot.action('features:charity', (ctx) => CommandHandler.handleCharity(ctx));
bot.action('features:memorization', (ctx) => CommandHandler.handleMemorization(ctx));
bot.action('features:dua', (ctx) => CommandHandler.handleDua(ctx));
bot.action('features:referral', (ctx) => CommandHandler.handleReferral(ctx));
bot.action('features:events', (ctx) => CommandHandler.handleEvents(ctx));
bot.action('features:rewards', (ctx) => CommandHandler.handleRewards(ctx));
bot.action('features:library', (ctx) => CommandHandler.handleLibrary(ctx));
bot.action('features:teams', (ctx) => CommandHandler.handleTeams(ctx));
bot.action('features:stats', (ctx) => CommandHandler.handleStats(ctx));
bot.action('stats:view', (ctx) => CommandHandler.handleStats(ctx));

// --- REFERRAL ACTIONS ---
bot.action('referral_leaderboard', async (ctx) => {
  const ReferralSystem = require('./features/referralSystem');
  const leaderboard = await ReferralSystem.getReferralLeaderboard(10);
  await ctx.reply(ReferralSystem.formatReferralLeaderboard(leaderboard), { parse_mode: 'HTML' });
});

bot.action('referral_info', async (ctx) => {
  const ReferralSystem = require('./features/referralSystem');
  await ctx.reply(ReferralSystem.getReferralInfo(), { parse_mode: 'HTML' });
});

// --- EVENTS ACTIONS ---
bot.action('events_leaderboard', async (ctx) => {
  const EventsSystem = require('./features/eventsSystem');
  const events = await EventsSystem.getActiveEvents();
  if (!events.length) return ctx.reply('❌ لا توجد أحداث نشطة');
  const leaderboard = await EventsSystem.getEventLeaderboard(events[0]._id, 10);
  await ctx.reply(EventsSystem.formatEventLeaderboard(events[0], leaderboard), {
    parse_mode: 'HTML'
  });
});

// --- REWARDS ACTIONS ---
bot.action('reward:daily', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.claimDailyReward(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '✅ تم' : '❌');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('rewards:daily', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.claimDailyReward(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '✅ تم' : '❌');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('reward:wheel', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.spinWheel(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '✅ تم' : '❌');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action(/reward:loot:(basic|silver|gold|legendary)/, async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const boxType = ctx.match[1];
  const result = await RewardsSystem.openLootBox(ctx.from.id, boxType);
  await ctx.answerCbQuery(result.success ? '✅ تم' : '❌');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

// --- GOALS ACTIONS ---
bot.action('add_goal', async (ctx) => {
  const keyboard = require('./ui/keyboards').goalsTemplatesKeyboard();
  await ctx.reply('🎯 اختر قالب هدف جاهز:', {
    parse_mode: 'HTML',
    reply_markup: keyboard.reply_markup
  });
});

bot.action(/goal:(khatma|adhkar|pages|prayers|games|charity)/, async (ctx) => {
  const GoalsManager = require('./features/goals');
  const templates = GoalsManager.getSuggestedGoals();
  const type = ctx.match[1];
  const template = templates.find((t) => {
    if (type === 'pages') return t.type === 'quran_pages';
    return t.type === type;
  });
  if (!template) return ctx.answerCbQuery('❌ قالب غير موجود');
  const result = await GoalsManager.createGoal(ctx.from.id, template);
  await ctx.answerCbQuery(result.success ? '✅ تم' : '❌');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

// --- CHARITY ACTIONS ---
bot.action(/charity:add:(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'charity', charityType: ctx.match[1] };
  await ctx.reply('💝 أرسل المبلغ والوصف (اختياري). مثال: 100 مساعدة محتاج');
  await ctx.answerCbQuery('✅');
});

// --- MEMORIZATION ACTIONS ---
bot.action('mem:add', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'memorization' };
  await ctx.reply('📖 أرسل: رقم السورة | اسم السورة | من آية | إلى آية\nمثال: 1|الفاتحة|1|7');
  await ctx.answerCbQuery('✅');
});

bot.action('mem:stats', (ctx) => CommandHandler.handleMemorization(ctx));
bot.action('mem:tips', async (ctx) => {
  const MemorizationSystem = require('./features/memorizationSystem');
  const tips = MemorizationSystem.getMemorizationTips();
  await ctx.reply(`💡 <b>نصائح الحفظ</b>\n\n${tips.join('\n')}`, { parse_mode: 'HTML' });
});
bot.action('mem:review', async (ctx) => {
  const MemorizationSystem = require('./features/memorizationSystem');
  const dueReviews = await MemorizationSystem.getDueReviews(ctx.from.id);
  if (!dueReviews.length) {
    return ctx.reply('✅ لا توجد مراجعات مستحقة حالياً');
  }

  let message = '📝 <b>مراجعات مستحقة</b>\n\n';
  dueReviews.slice(0, 5).forEach((v, i) => {
    message += `${i + 1}. ${v.surahName} (${v.fromAyah}-${v.toAyah})\n`;
  });
  await ctx.reply(message, { parse_mode: 'HTML' });
});

// --- DUA ACTIONS ---
const showSingleDuaFromCategory = async (ctx, category) => {
  const DuaSystem = require('./features/duaSystem');
  const collection = DuaSystem.getDuaCollection(category);

  if (!collection) {
    await ctx.answerCbQuery('❌ الفئة غير موجودة');
    return;
  }

  const dua = DuaSystem.getRandomDuaByCategory(category);
  if (!dua) {
    await ctx.answerCbQuery('❌ لا توجد أدعية في هذه الفئة');
    return;
  }

  const message =
    `🤲 <b>${collection.name}</b>\n` +
    `📚 <b>عدد الأدعية في الفئة:</b> ${collection.duas.length}\n\n` +
    DuaSystem.formatDua(dua);

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('🆕 دعاء آخر', `dua:next:${category}`)],
    [Markup.button.callback('📂 جميع الفئات', 'dua:menu'), Markup.button.callback('⬅️ الرئيسية', 'menu:main')]
  ]);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: buttons.reply_markup
    });
  } catch (_e) {
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: buttons.reply_markup
    });
  }
};

bot.action(
  /dua:(morning|evening|protection|forgiveness|sustenance|sleep|food|travel)/,
  async (ctx) => {
    const category = ctx.match[1];
    await showSingleDuaFromCategory(ctx, category);
    await ctx.answerCbQuery('🤲 تم عرض دعاء كامل');
  }
);

bot.action(
  /dua:next:(morning|evening|protection|forgiveness|sustenance|sleep|food|travel)/,
  async (ctx) => {
    const category = ctx.match[1];
    await showSingleDuaFromCategory(ctx, category);
    await ctx.answerCbQuery('🆕 دعاء جديد');
  }
);

bot.action('dua:menu', (ctx) => CommandHandler.handleDua(ctx));

// --- LIBRARY ACTIONS ---
bot.action('library:tafsir', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const tafsir = await IslamicLibrary.getTafsir(1, 1, 'السعدي');
  await ctx.reply(IslamicLibrary.formatLibraryContent('tafsir', tafsir), { parse_mode: 'HTML' });
});

bot.action('library:hadith', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const hadith = await IslamicLibrary.getHadith('all');
  await ctx.reply(IslamicLibrary.formatLibraryContent('hadith', hadith), { parse_mode: 'HTML' });
});

bot.action('library:fiqh', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const fiqh = await IslamicLibrary.getFiqhRuling('الصلاة');
  await ctx.reply(IslamicLibrary.formatLibraryContent('fiqh', fiqh), { parse_mode: 'HTML' });
});

bot.action('library:stories', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const story = await IslamicLibrary.getQuranStory('موسى');
  await ctx.reply(IslamicLibrary.formatLibraryContent('story', story), { parse_mode: 'HTML' });
});

bot.action('library:sahabi', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const sahabi = await IslamicLibrary.getSahabiBiography('أبو بكر');
  await ctx.reply(IslamicLibrary.formatLibraryContent('sahabi', sahabi), { parse_mode: 'HTML' });
});

bot.action('library:awrad', (ctx) => CommandHandler.handleDua(ctx));

// --- TEAMS ACTIONS ---
bot.action('team:create', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'team_create' };
  await ctx.reply('👥 أرسل اسم الفريق والوصف (اختياري) بصيغة: الاسم | الوصف');
  await ctx.answerCbQuery('✅');
});

bot.action('team:join', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'team_join' };
  await ctx.reply('👥 أرسل اسم الفريق للانضمام:');
  await ctx.answerCbQuery('✅');
});

bot.action('team:leaderboard', async (ctx) => {
  const TeamManager = require('./features/teamManager');
  const teams = await TeamManager.getTeamLeaderboard(10);
  await ctx.reply(TeamManager.formatTeamLeaderboard(teams), { parse_mode: 'HTML' });
});

bot.action('team:info', (ctx) => CommandHandler.handleTeams(ctx));

// --- ADMIN HANDLERS (معالجات الإعدادات الإدارية) ---
bot.action('settings:general', (ctx) => MenuHandler.handleGeneralSettings(ctx));
bot.action('settings:users', (ctx) => MenuHandler.handleUserManagement(ctx));
bot.action('settings:security', (ctx) => MenuHandler.handleSecuritySettings(ctx));
bot.action('settings:content', (ctx) => MenuHandler.handleContentManagement(ctx));
bot.action('settings:stats', (ctx) => MenuHandler.handleAdminStats(ctx));

// --- SUB-MENU HANDLERS FOR SETTINGS ---
// General Settings Sub-menus
bot.action('settings:messages', (ctx) => MenuHandler.handleMessagesSettings(ctx));
bot.action('settings:notifySettings', (ctx) => MenuHandler.handleNotifySettings(ctx));
bot.action('settings:scheduler', (ctx) => MenuHandler.handleSchedulerSettings(ctx));

// User Management Sub-menus
bot.action('admin:searchUser', (ctx) => MenuHandler.handleSearchUserMenu(ctx));
bot.action('admin:banUsers', (ctx) => MenuHandler.handleBanUsers(ctx));

// Security Sub-menus
bot.action('security:rateLimit', (ctx) => MenuHandler.handleRateLimit(ctx));
bot.action('security:verification', (ctx) => MenuHandler.handleVerification(ctx));

// Content Management Sub-menus
bot.action('content:add', (ctx) => MenuHandler.handleAddContent(ctx));
bot.action('content:edit', (ctx) => MenuHandler.handleEditContent(ctx));
bot.action('content:delete', (ctx) => MenuHandler.handleDeleteContent(ctx));

// Stats Sub-menus
bot.action('stats:economy', (ctx) => MenuHandler.handleStatsEconomy(ctx));

// --- SEARCH & MANAGEMENT HANDLERS ---
bot.action('admin:search', (ctx) => MenuHandler.handleSearchUser(ctx));
bot.action('security:logs', (ctx) => MenuHandler.handleSecurityLogs(ctx));
bot.action('content:stats', (ctx) => MenuHandler.handleContentStats(ctx));
bot.action('stats:users', (ctx) => MenuHandler.handleStatsUsers(ctx));
bot.action('stats:games', (ctx) => MenuHandler.handleStatsGames(ctx));

// --- BAN/UNBAN HANDLERS ---
bot.action(/admin:ban:(\d+)/, async (ctx) => {
  try {
    const userId = parseInt(ctx.match[1]);
    const { User } = require('./database/models');
    const userToBan = await User.findOne({ userId });

    if (!userToBan) {
      return ctx.answerCbQuery('❌ لم يتم العثور على المستخدم');
    }

    userToBan.isBanned = true;
    userToBan.bannedAt = new Date();
    userToBan.banReason = 'تم الحظر من قبل الإدارة';
    await userToBan.save();

    await ctx.answerCbQuery('✅ تم حظر المستخدم بنجاح');
    await ctx.editMessageText(
      `✅ <b>تم حظر المستخدم</b>\n\n👤 ${userToBan.firstName}\n🆔 ${userId}`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'settings:users')]])
          .reply_markup
      }
    );
  } catch (error) {
    console.error('Ban error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action(/admin:unban:(\d+)/, async (ctx) => {
  try {
    const userId = parseInt(ctx.match[1]);
    const { User } = require('./database/models');
    const userToUnban = await User.findOne({ userId });

    if (!userToUnban) {
      return ctx.answerCbQuery('❌ لم يتم العثور على المستخدم');
    }

    userToUnban.isBanned = false;
    userToUnban.bannedAt = null;
    userToUnban.banReason = null;
    await userToUnban.save();

    await ctx.answerCbQuery('✅ تم السماح للمستخدم بنجاح');
    await ctx.editMessageText(
      `✅ <b>تم السماح للمستخدم</b>\n\n👤 ${userToUnban.firstName}\n🆔 ${userId}`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'settings:users')]])
          .reply_markup
      }
    );
  } catch (error) {
    console.error('Unban error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// --- BROADCAST HANDLER ---
bot.action('admin:broadcast', async (ctx) => {
  try {
    ctx.session = ctx.session || {};
    ctx.session.adminAwait = { type: 'broadcast' };
    await ctx.answerCbQuery('✅ جاهز');
    await ctx.reply('📢 أدخل الرسالة المراد بثها لجميع المستخدمين:\n\n(اكتب /cancel للإلغاء)');
  } catch (error) {
    console.error('Broadcast error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('close', (ctx) => MenuHandler.handleClose(ctx));

// --- KHATMA ACTIONS ---
bot.action('khatma:addpage', (ctx) => MenuHandler.handleKhatmaAddPage(ctx, 1));
bot.action('khatma:add5', (ctx) => MenuHandler.handleKhatmaAddFive(ctx));
bot.action('khatma:reset', (ctx) => MenuHandler.handleKhatmaReset(ctx));
bot.action('khatma:save', (ctx) => MenuHandler.handleKhatmaSave(ctx));
bot.action('khatma:settings', (ctx) => MenuHandler.handleKhatmaSettings(ctx));
bot.action('khatma:toggleNotify', (ctx) => MenuHandler.handleKhatmaToggleNotify(ctx));
bot.action(/khatma:inc:(.+)/, (ctx) => {
  const delta = parseInt(ctx.match[1]);
  return MenuHandler.handleKhatmaAdjustIncrement(ctx, delta);
});
bot.action('khatma:setTime', (ctx) => MenuHandler.handleKhatmaSetTime(ctx));
bot.action('khatma:setTimezone', (ctx) => MenuHandler.handleKhatmaSetTimezone(ctx));
bot.action('khatma:share', (ctx) => MenuHandler.handleKhatmaShare(ctx));
bot.action('khatma:stats', (ctx) => MenuHandler.handleKhatmaStats(ctx));
bot.action('khatma:viewSaved', (ctx) => MenuHandler.handleKhatmaViewSaved(ctx));

// --- ADHKAR HANDLERS (أذكار الصباح والمساء والنوم) ---
bot.action('adhkar:morning', (ctx) => ContentHandler.handleMorningAdhkar(ctx));
bot.action('adhkar:evening', (ctx) => ContentHandler.handleEveningAdhkar(ctx));
bot.action('adhkar:sleep', (ctx) => ContentHandler.handleSleepAdhkar(ctx));
bot.action('adhkar:stats', (ctx) => ContentHandler.handleAdhkarStats(ctx));

// --- GAME HANDLERS ---
bot.action('game:rps', (ctx) => GameHandler.handleRPS(ctx));
bot.action(/game:rps:(rock|paper|scissors)/, (ctx) => {
  const choice = ctx.match[1];
  GameHandler.handleRPSChoice(ctx, choice);
});

bot.action('game:guess', (ctx) => GameHandler.handleGuess(ctx));
bot.action('guess:cancel', async (ctx) => {
  const GuessNumberGame = require('./games/guessNumberGame');
  await GuessNumberGame.cancelGame(ctx);
});
bot.action('game:quiz', (ctx) => GameHandler.handleQuiz(ctx));
bot.action(/game:quiz:(.+)/, (ctx) => {
  const answer = ctx.match[1];
  GameHandler.handleQuizAnswer(ctx, answer);
});

bot.action('game:dice', (ctx) => GameHandler.handleDice(ctx));
bot.action('game:luck', (ctx) => GameHandler.handleLuck(ctx));
bot.action('game:challenges', (ctx) => GameHandler.handleChallenges(ctx));

// --- QURANIC GAMES HANDLERS (نظام جديد متكامل) ---
bot.action('game:quranic', async (ctx) => await QuranicGamesHandler.showMenu(ctx));

// لعبة تخمين الآية
bot.action('qgame:guess', async (ctx) => await QuranicGamesHandler.startGuessTheSurah(ctx));

// لعبة أكمل الآية
bot.action('qgame:complete', async (ctx) => await QuranicGamesHandler.startCompleteVerse(ctx));

// لعبة اكتشف الفرق
bot.action('qgame:spot', async (ctx) => await QuranicGamesHandler.startSpotDifference(ctx));
bot.action('qgame:spot_true', async (ctx) => await QuranicGamesHandler.processAnswer(ctx, 'true'));
bot.action('qgame:spot_false', async (ctx) => await QuranicGamesHandler.processAnswer(ctx, 'false'));

// لعبة معلومات قرآنية
bot.action('qgame:trivia', async (ctx) => await QuranicGamesHandler.startTriviaGame(ctx));
bot.action(/qgame:trivia_(.+)/, async (ctx) => {
  const answer = ctx.match[1];
  await QuranicGamesHandler.processAnswer(ctx, answer);
});

// لعبة عد الآيات
bot.action('qgame:count', async (ctx) => await QuranicGamesHandler.startCountVersesGame(ctx));

// لعبة الأسئلة الثقافية الإسلامية
bot.action('qgame:cultural', async (ctx) => await QuranicGamesHandler.startCulturalKnowledge(ctx));

// --- KEYBOARD BUTTON HANDLERS - MUST BE BEFORE bot.on('text') ---
bot.hears('🕌 الختمة', (ctx) => MenuHandler.handleKhatmaMenu(ctx));
bot.hears('📿 الأذكار', (ctx) => MenuHandler.handleAdhkarMenu(ctx));
bot.hears('📖 القرآن', (ctx) => MenuHandler.handleQuranMenu(ctx));
bot.hears('💭 الاقتباسات', (ctx) => MenuHandler.handleQuotesMenu(ctx));
bot.hears('✍️ الشعر', (ctx) => MenuHandler.handlePoetryMenu(ctx));
bot.hears('🎮 الألعاب', (ctx) => MenuHandler.handleGamesMenu(ctx));
bot.hears('💰 الاقتصاد', (ctx) => MenuHandler.handleEconomyMenu(ctx));
bot.hears('👤 حسابي', (ctx) => MenuHandler.handleProfileMenu(ctx));
bot.hears('🏆 المتصدرين', (ctx) => MenuHandler.handleLeaderboardMenu(ctx));
bot.hears('⚙️ الإعدادات', (ctx) => MenuHandler.handleSettingsMenu(ctx));
bot.hears('✨ الميزات', (ctx) => CommandHandler.handleFeaturesMenu(ctx));
bot.hears('📚 المكتبة', (ctx) => CommandHandler.handleLibrary(ctx));
bot.hears('📊 إحصائيات', (ctx) => CommandHandler.handleStats(ctx));
bot.hears('🎁 المكافآت', (ctx) => CommandHandler.handleRewards(ctx));
bot.hears('🛍️ المتجر', (ctx) => MenuHandler.handleShopMenu(ctx));
bot.hears('💸 التحويلات والتبرعات', (ctx) => MenuHandler.handleTransfersMenu(ctx));
bot.hears('🔔 الإشعارات الذكية', (ctx) => MenuHandler.handleSmartNotificationsMenu(ctx));
bot.hears('📁 النسخ الاحتياطية', (ctx) => MenuHandler.handleBackupsMenu(ctx));
bot.hears('⚡ التخزين المؤقت', (ctx) => MenuHandler.handleCacheMenu(ctx));
bot.hears('🛡️ حماية من الإساءة', (ctx) => MenuHandler.handleProtectionMenu(ctx));
bot.hears('🎨 توليد صورة', (ctx) => imageHandler.handleImageButton(ctx));

// --- TEXT HANDLER FOR IMAGE GENERATION AND QURANIC GAMES ---
bot.on('text', async (ctx, next) => {
  // Check if user is waiting for image prompt using the new Set system
  if (ctx.from && imageHandler.isWaitingForImagePrompt(ctx.from.id)) {
    const handled = await imageHandler.handleTextMessage(ctx);
    if (handled) return;
  }

  // معالجة إجابات الألعاب القرآنية
  if (ctx.session?.gameState && ctx.session.gameState.game === 'quranic') {
    const userAnswer = ctx.message.text;
    await QuranicGamesHandler.processAnswer(ctx, userAnswer);
    return;
  }

  // Let other handlers process the message
  if (typeof next === 'function') {
    return next();
  }
});

// --- ECONOMY HANDLERS ---
bot.action('eco:balance', (ctx) => EconomyHandler.handleBalance(ctx));
bot.action('eco:shop', (ctx) => EconomyHandler.handleShop(ctx));
bot.action(/shop:buy:(\d+)/, (ctx) => {
  const itemId = parseInt(ctx.match[1]);
  EconomyHandler.handleBuyItem(ctx, itemId);
});
bot.action('eco:inventory', (ctx) => EconomyHandler.handleInventory(ctx));
bot.action('eco:stats', (ctx) => EconomyHandler.handleEconomyStats(ctx));

// --- ADDITIONAL ECONOMY HANDLERS ---
bot.action('eco:transfer', async (ctx) => {
  try {
    ctx.session = ctx.session || {};
    ctx.session.ecoAwait = { type: 'transfer' };
    await ctx.answerCbQuery('✅ جاهز');
    await ctx.reply(
      '💸 أدخل معرّف المستخدم الذي تريد التحويل له:\n\n(مثال: @username أو معرّفه الرقمي)'
    );
  } catch (error) {
    console.error('Transfer error:', error);
    ctx.answerCbQuery('❌ خطأ');
  }
});

bot.action('eco:auction', async (ctx) => {
  try {
    const AuctionManager = require('./economy/auctionManager');

    ctx.session = ctx.session || {};
    ctx.session.ecoAwait = { type: 'auction_select' };

    const auctions = await AuctionManager.getActiveAuctions(bot);
    const message = AuctionManager.formatAuctionList(auctions);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📌 مزاداتي', 'eco:my_auctions')],
        [Markup.button.callback('⬅️ رجوع', 'menu:economy')]
      ])
    });
    ctx.answerCbQuery('✅');
  } catch (error) {
    console.error('Auction error:', error);
    ctx.answerCbQuery('❌ خطأ');
  }
});

bot.action('eco:my_auctions', async (ctx) => {
  try {
    const AuctionManager = require('./economy/auctionManager');
    const auctions = await AuctionManager.getUserActiveBids(ctx.from.id);
    const message = AuctionManager.formatUserAuctions(auctions, ctx.from.id);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'eco:auction')]
      ])
    });
    ctx.answerCbQuery('✅');
  } catch (error) {
    console.error('My auctions error:', error);
    ctx.answerCbQuery('❌ خطأ');
  }
});

// --- CONTENT HANDLERS ---
bot.action('menu:baqfat', (ctx) => ContentHandler.handleBaqfat(ctx));
bot.action('menu:avatars', (ctx) => ContentHandler.handleAvatars(ctx));
bot.action('menu:tweets', (ctx) => ContentHandler.handleTweets(ctx));
bot.action('menu:books', (ctx) => ContentHandler.handleBooks(ctx));
bot.action('menu:stories', (ctx) => ContentHandler.handleStories(ctx));
bot.action('menu:movies', (ctx) => ContentHandler.handleMovies(ctx));
bot.action('menu:wallpapers', (ctx) => ContentHandler.handleWallpapers(ctx));
bot.action('menu:headers', (ctx) => ContentHandler.handleHeaders(ctx));
bot.action('menu:songs', (ctx) => ContentHandler.handleSongs(ctx));
bot.action('menu:entertainment', (ctx) => ContentHandler.handleEntertainment(ctx));

// --- PROFILE HANDLERS ---
bot.action('profile:info', (ctx) => ProfileHandler.handleProfileInfo(ctx));
bot.action('profile:badges', (ctx) => ProfileHandler.handleBadges(ctx));
bot.action('profile:stats', (ctx) => ProfileHandler.handleGameStats(ctx));
bot.action('profile:gifts', (ctx) => ProfileHandler.handleGifts(ctx));

// --- LEADERBOARD FILTERS ---
bot.action('leaderboard:xp', async (ctx) => {
  try {
    const { User } = require('./database/models');
    const users = await User.find().sort({ xp: -1 }).limit(10);
    const currentUser = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ xp: -1 });
    const userRank = allUsers.findIndex((u) => u.userId === currentUser.userId) + 1;

    let board = `🏆 **أعلى 10 في النقاط**

🎯 ترتيبك: ${userRank}/${allUsers.length}\n\n`;

    users.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const userMark = u.userId === currentUser.userId ? ' 👈' : '';
      board += `${medal} ${u.firstName || 'مستخدم'} - ⭐${u.xp.toLocaleString()}${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 العملات', 'leaderboard:coins'),
        Markup.button.callback('🎖️ المستويات', 'leaderboard:level')
      ],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);
    await ctx.editMessageText(board, { reply_markup: buttons.reply_markup });
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ في التحديث');
  }
});

bot.action('leaderboard:coins', async (ctx) => {
  try {
    const { User } = require('./database/models');
    const users = await User.find().sort({ coins: -1 }).limit(10);
    const currentUser = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ coins: -1 });
    const userRank = allUsers.findIndex((u) => u.userId === currentUser.userId) + 1;

    let board = `💰 **أغنى 10 مستخدمين**

🎯 ترتيبك: ${userRank}/${allUsers.length}\n\n`;

    users.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const userMark = u.userId === currentUser.userId ? ' 👈' : '';
      board += `${medal} ${u.firstName || 'مستخدم'} - 💵${u.coins.toLocaleString()}${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('⭐ النقاط', 'leaderboard:xp'),
        Markup.button.callback('🎖️ المستويات', 'leaderboard:level')
      ],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);
    await ctx.editMessageText(board, { reply_markup: buttons.reply_markup });
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ في التحديث');
  }
});

bot.action('leaderboard:level', async (ctx) => {
  try {
    const { User } = require('./database/models');
    const users = await User.find().sort({ level: -1, xp: -1 }).limit(10);
    const currentUser = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ level: -1, xp: -1 });
    const userRank = allUsers.findIndex((u) => u.userId === currentUser.userId) + 1;

    let board = `🎖️ **أعلى 10 في المستويات**

🎯 ترتيبك: ${userRank}/${allUsers.length}\n\n`;

    users.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const userMark = u.userId === currentUser.userId ? ' 👈' : '';
      board += `${medal} ${u.firstName || 'مستخدم'} - 🎖️${u.level} (⭐${u.xp.toLocaleString()})${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('⭐ النقاط', 'leaderboard:xp'),
        Markup.button.callback('💰 العملات', 'leaderboard:coins')
      ],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);
    await ctx.editMessageText(board, { reply_markup: buttons.reply_markup });
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ في التحديث');
  }
});

// --- SMART STATS & REWARDS HANDLERS ---
bot.action('stats:view', async (ctx) => {
  try {
    const user = await user.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    const statsMessage = Formatter.formatSmartStats(user);
    await ctx.editMessageText(
      statsMessage,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🎯 المهام اليومية', 'quests:daily')],
          [Markup.button.callback('🏅 الإنجازات', 'achievements:view')],
          [Markup.button.callback('⬅️ رجوع', 'menu:main')]
        ]).reply_markup
      }
    );
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ في التحديث');
  }
});

// --- SMART STATS & REWARDS HANDLERS ---
bot.action('stats:view', async (ctx) => {
  try {
    const user = await user.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    const statsMessage = Formatter.formatSmartStats(user);
    await ctx.editMessageText(
      statsMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback('🏅 الإنجازات', 'achievements:view')],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ])
    );
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ في التحديث');
  }
});

bot.action('rewards:daily', async (ctx) => {
  try {
    const user = await user.findOne({ userId: ctx.from.id });
    if (!user) return ctx.answerCbQuery('❌ خطأ');

    const lastDaily = new Date(user.lastDailyReward);
    const now = new Date();
    const hoursDiff = (now - lastDaily) / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
      const reward = 50;
      user.coins += reward;
      user.xp += 10;
      user.lastDailyReward = new Date();
      await user.save();

      await ctx.editMessageText(
        `🎁 **مكافأتك اليومية**

✅ حصلت على:
• 💰 ${reward} عملة
• ⭐ 10 نقاط

العودة غداً لأخذ المكافأة التالية!`,
        Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'menu:main')]])
      );
    } else {
      const hoursLeft = Math.ceil(24 - hoursDiff);
      await ctx.answerCbQuery(`⏰ العودة في ${hoursLeft} ساعة`);
    }
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ');
  }
});

bot.action('achievements:view', async (ctx) => {
  try {
    const user = await user.findOne({ userId: ctx.from.id });
    const achievementsMsg = Formatter.formatAchievements(user);

    await ctx.editMessageText(
      achievementsMsg,
      Markup.inlineKeyboard([
        [Markup.button.callback('📊 الإحصائيات', 'stats:view')],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ])
    );
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ');
  }
});

bot.action('quests:daily', async (ctx) => {
  try {
    const user = await user.findOne({ userId: ctx.from.id });
    const questsMsg = Formatter.formatDailyQuests(user);

    await ctx.editMessageText(
      questsMsg,
      Markup.inlineKeyboard([
        [Markup.button.callback('🎮 الألعاب', 'menu:games')],
        [Markup.button.callback('📖 الختمة', 'menu:khatma')],
        [Markup.button.callback('⬅️ رجوع', 'menu:main')]
      ])
    );
  } catch (error) {
    ctx.answerCbQuery('❌ خطأ');
  }
});

// --- KHATMA ACTIONS ---
bot.action('khatma:add5', async (ctx) => {
  const user = await user.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage < 604) {
    const pagesToAdd = Math.min(5, 604 - user.khatmaProgress.currentPage);
    user.khatmaProgress.currentPage += pagesToAdd;
    user.khatmaProgress.percentComplete = Math.round((user.khatmaProgress.currentPage / 604) * 100);
    user.khatmaProgress.lastRead = new Date();
    user.xp += pagesToAdd * 2;
    await user.save();
    await ctx.answerCbQuery(`✅ تم إضافة ${pagesToAdd} صفحات!`);
  }
  await MenuHandler.handleKhatmaMenu(ctx);
});

bot.action('khatma:addpage', async (ctx) => {
  const user = await user.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage < 604) {
    user.khatmaProgress.currentPage += 1;
    user.khatmaProgress.percentComplete = Math.round((user.khatmaProgress.currentPage / 604) * 100);
    user.khatmaProgress.lastRead = new Date();
    user.xp += 2;
    await user.save();
    await ctx.answerCbQuery('✅ تم إضافة صفحة! +2 نقاط');
  }
  await MenuHandler.handleKhatmaMenu(ctx);
});

bot.action('khatma:reset', async (ctx) => {
  const user = await user.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage >= 604) {
    user.khatmaProgress.currentPage = 1;
    user.khatmaProgress.percentComplete = 0;
    user.khatmaProgress.completionCount += 1;
    user.khatmaProgress.startDate = new Date();
    user.xp += 100;
    user.coins += 50;
    await user.save();
    await ctx.answerCbQuery('✅ مبروك! أكملت الختمة! +100 نقطة + 50 عملة');
  } else {
    await ctx.answerCbQuery('❌ لم تكملها بعد!');
  }
});

// --- SMART CONTENT HANDLERS ---
bot.action('adhkar:favorite', async (ctx) => {
  await ctx.answerCbQuery('❤️ تم حفظ الذكر في المفضلة!');
});

bot.action('quran:tafsir', async (ctx) => {
  await ctx.reply(
    '📚 التفسير: هذه آية قرآنية كريمة تحتوي على حكم وعبر عظيمة...\n\n💡 تأمل فيها جيداً'
  );
});

bot.action('quran:save', async (ctx) => {
  await ctx.answerCbQuery('❤️ تم حفظ الآية في المفضلة!');
});

bot.action('quote:random', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const quote = await ContentProvider.getQuote();

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('❤️ حفظ', 'quote:save'), Markup.button.callback('📋 نسخ', 'quote:copy')],
      [Markup.button.callback('📤 شارك', 'quote:share')],
      [Markup.button.callback('🆕 جديد', 'quote:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:quotes')]
    ]);

    try {
      await ctx.editMessageText(`✨ <b>اقتباس ملهم</b>\n\n<code>${quote}</code>`, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(`✨ <b>اقتباس ملهم</b>\n\n<code>${quote}</code>`, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('✨ اقتباس جديد!');
  } catch (error) {
    console.error('Error in quote:random:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في جلب الاقتباس');
  }
});

bot.action('quote:save', async (ctx) => {
  try {
    const { User } = require('./database/models');
    const ContentProvider = require('./content/contentProvider');

    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    const quote = await ContentProvider.getQuote();

    // Initialize saved quotes if not exists
    if (!user.savedQuotes) {
      user.savedQuotes = [];
    }

    // Check if quote already saved
    if (!user.savedQuotes.includes(quote)) {
      user.savedQuotes.push(quote);
      await user.save();
      await ctx.answerCbQuery('❤️ تم حفظ الاقتباس في المفضلة!');
    } else {
      await ctx.answerCbQuery('ℹ️ هذا الاقتباس محفوظ بالفعل');
    }
  } catch (error) {
    console.error('Error in quote:save:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في حفظ الاقتباس');
  }
});

bot.action('quote:share', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const quote = await ContentProvider.getQuote();

    const shareMessage = `🌟 اقتباس من البوت الإسلامي الذكي 🤖\n\n${quote}\n\n� <i>شارك هذا الاقتباس مع أصدقائك!</i>`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('❤️ حفظ', 'quote:save')],
      [Markup.button.callback('اقتباس آخر', 'quote:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:quotes')]
    ]);

    try {
      await ctx.editMessageText(shareMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(shareMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('📤 تم تحضير الاقتباس - نسخ والصقه لمشاركته!');
  } catch (error) {
    console.error('Error in quote:share:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في مشاركة الاقتباس');
  }
});

bot.action('quote:favorites', async (ctx) => {
  try {
    const { User } = require('./database/models');

    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    if (!user.savedQuotes || user.savedQuotes.length === 0) {
      const message = '❤️ <b>الاقتباسات المحفوظة</b>\n\nلم تحفظ أي اقتباسات بعد، ابدأ بحفظ الاقتباسات التي يعجب بها!';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🌟 أخذ اقتباس', 'quote:random')],
        [Markup.button.callback('⬅️ رجوع', 'menu:quotes')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup
        });
      }
      return ctx.answerCbQuery('لا توجد اقتباسات محفوظة');
    }

    // Display saved quotes (first 5)
    const savedQuotes = user.savedQuotes.slice(0, 5);
    const quotesText = savedQuotes.map((q, i) => `${i+1}. ${q}`).join('\n\n');
    const message = `❤️ <b>الاقتباسات المحفوظة</b> (${user.savedQuotes.length})\n\n${quotesText}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🌟 اقتباس جديد', 'quote:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:quotes')]
    ]);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('❤️ عرض الاقتباسات المحفوظة');
  } catch (error) {
    console.error('Error in quote:favorites:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في عرض الاقتباسات المحفوظة');
  }
});

bot.action('quote:copy', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const quote = await ContentProvider.getQuote();

    // Store quote in clipboard context
    ctx.session = ctx.session || {};
    ctx.session.lastContent = quote;

    // Send as text that can be copied
    const message = `📋 <b>انسخ الاقتباس:</b>\n\n<code>${quote}</code>\n\n✅ يمكنك الآن نسخ النص بالضغط عليه`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ رجوع', 'quote:random')]
    ]);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('📋 تم نسخ الاقتباس إلى الحافظة!');
  } catch (error) {
    console.error('Error in quote:copy:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في نسخ الاقتباس');
  }
});

bot.action('menu:quotes', (ctx) => MenuHandler.handleQuotesMenu(ctx));

// --- POETRY SYSTEM HANDLERS ---
bot.action('poetry:random', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const poem = await ContentProvider.getPoetry();

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('❤️ حفظ', 'poetry:save'), Markup.button.callback('📋 نسخ', 'poetry:copy')],
      [Markup.button.callback('📤 شارك', 'poetry:share')],
      [Markup.button.callback('🆕 جديدة', 'poetry:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:poetry')]
    ]);

    try {
      await ctx.editMessageText(`📖 <b>قصيدة عربية أصيلة</b>\n\n<code>${poem}</code>`, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(`📖 <b>قصيدة عربية أصيلة</b>\n\n<code>${poem}</code>`, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('✨ قصيدة جديدة!');
  } catch (error) {
    console.error('Error in poetry:random:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في جلب القصيدة');
  }
});

bot.action('poetry:save', async (ctx) => {
  try {
    const { User } = require('./database/models');
    const ContentProvider = require('./content/contentProvider');

    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    const poem = await ContentProvider.getPoetry();

    // Initialize saved poems if not exists
    if (!user.savedPoems) {
      user.savedPoems = [];
    }

    // Check if poem already saved
    if (!user.savedPoems.includes(poem)) {
      user.savedPoems.push(poem);
      await user.save();
      await ctx.answerCbQuery('❤️ تم حفظ القصيدة في المفضلة!');
    } else {
      await ctx.answerCbQuery('ℹ️ هذه القصيدة محفوظة بالفعل');
    }
  } catch (error) {
    console.error('Error in poetry:save:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في حفظ القصيدة');
  }
});

bot.action('poetry:share', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const poem = await ContentProvider.getPoetry();

    const shareMessage = `📖 قصيدة عربية أصيلة 🎭\n\n${poem}\n\n💡 <i>شارك هذه القصيدة مع أصدقائك!</i>`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('❤️ حفظ', 'poetry:save')],
      [Markup.button.callback('قصيدة أخرى', 'poetry:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:poetry')]
    ]);

    try {
      await ctx.editMessageText(shareMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(shareMessage, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('📤 تم تحضير القصيدة - نسخ والصقها لمشاركتها!');
  } catch (error) {
    console.error('Error in poetry:share:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في مشاركة القصيدة');
  }
});

bot.action('poetry:favorites', async (ctx) => {
  try {
    const { User } = require('./database/models');

    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
    }

    if (!user.savedPoems || user.savedPoems.length === 0) {
      const message = '❤️ <b>القصائد المحفوظة</b>\n\nلم تحفظ أي قصائد بعد، ابدأ بحفظ القصائد التي تعجbب بها!';

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🌟 قصيدة جديدة', 'poetry:random')],
        [Markup.button.callback('⬅️ رجوع', 'menu:poetry')]
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup
        });
      } catch (e) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: buttons.reply_markup
        });
      }
      return ctx.answerCbQuery('لا توجد قصائد محفوظة');
    }

    // Display saved poems (first 3)
    const savedPoems = user.savedPoems.slice(0, 3);
    const poemsText = savedPoems.map((p, i) => `${i+1}. ${p}`).join('\n\n');
    const message = `❤️ <b>القصائد المحفوظة</b> (${user.savedPoems.length})\n\n${poemsText}`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🌟 قصيدة جديدة', 'poetry:random')],
      [Markup.button.callback('⬅️ رجوع', 'menu:poetry')]
    ]);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('❤️ عرض القصائد المحفوظة');
  } catch (error) {
    console.error('Error in poetry:favorites:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في عرض القصائد المحفوظة');
  }
});

bot.action('poetry:copy', async (ctx) => {
  try {
    const ContentProvider = require('./content/contentProvider');
    const poem = await ContentProvider.getPoetry();

    // Store poem in clipboard context
    ctx.session = ctx.session || {};
    ctx.session.lastContent = poem;

    // Send as text that can be copied
    const message = `📋 <b>انسخ القصيدة:</b>\n\n<code>${poem}</code>\n\n✅ يمكنك الآن نسخ النص بالضغط عليه`;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ رجوع', 'poetry:random')]
    ]);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: buttons.reply_markup
      });
    }

    await ctx.answerCbQuery('📋 تم نسخ القصيدة إلى الحافظة!');
  } catch (error) {
    console.error('Error in poetry:copy:', error);
    await ctx.answerCbQuery('❌ حدث خطأ في نسخ القصيدة');
  }
});

bot.action('menu:poetry', (ctx) => MenuHandler.handlePoetryMenu(ctx));

// --- KEYBOARD BUTTON HANDLERS ---


// --- OWNER KEYBOARD BUTTON HANDLERS ---
bot.hears('👑 لوحة المالك', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  if (UIManager.isOwner(ctx.from.id)) {
    await CommandHandler.handleOwnerPanel(ctx);
  } else {
    ctx.reply('❌ هذا الأمر متاح للمالك فقط');
  }
});

// --- TEXT HANDLERS ---
bot.on('text', async (ctx) => {
  try {
    const message = ctx.message.text;

    // ⭐ CHECK GUESS GAME INPUT FIRST (before all other handlers)
    const GuessNumberGame = require('./games/guessNumberGame');
    if (GuessNumberGame.isGameActive(ctx)) {
      console.log('🎮 اللعبة نشطة - معالجة التخمين');
      await GuessNumberGame.processGuess(ctx, message);
      return;
    }

    console.log('📝 نص عادي:', message.substring(0, 30));

    // Handle feature awaiting input
    if (ctx.session && ctx.session.featureAwait) {
      const awaiting = ctx.session.featureAwait;
      ctx.session.featureAwait = null;

      if (awaiting.type === 'charity') {
        const CharityTracker = require('./features/charityTracker');
        const parts = message.trim().split(' ');
        let amount = 0;
        let description = message.trim();
        if (parts.length > 1 && /^\d+(\.\d+)?$/.test(parts[0])) {
          amount = parseFloat(parts[0]);
          description = parts.slice(1).join(' ');
        }

        const result = await CharityTracker.recordCharity(ctx.from.id, {
          type: awaiting.charityType,
          amount,
          description
        });

        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }

      if (awaiting.type === 'memorization') {
        const MemorizationSystem = require('./features/memorizationSystem');
        const parts = message.split('|').map((p) => p.trim());
        if (parts.length < 4) {
          return ctx.reply('❌ صيغة غير صحيحة. مثال: 1|الفاتحة|1|7');
        }

        const surah = parseInt(parts[0], 10);
        const surahName = parts[1];
        const fromAyah = parseInt(parts[2], 10);
        const toAyah = parseInt(parts[3], 10);

        if (Number.isNaN(surah) || Number.isNaN(fromAyah) || Number.isNaN(toAyah)) {
          return ctx.reply('❌ أرقام الآيات غير صحيحة');
        }

        const result = await MemorizationSystem.addMemorization(ctx.from.id, {
          surah,
          surahName,
          fromAyah,
          toAyah
        });

        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }

      if (awaiting.type === 'team_create') {
        const TeamManager = require('./features/teamManager');
        const parts = message.split('|').map((p) => p.trim());
        const name = parts[0];
        const description = parts[1] || '';
        if (!name) {
          return ctx.reply('❌ الرجاء إدخال اسم الفريق');
        }
        const result = await TeamManager.createTeam(ctx.from.id, name, description);
        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }

      if (awaiting.type === 'team_join') {
        const TeamManager = require('./features/teamManager');
        const name = message.trim();
        if (!name) {
          return ctx.reply('❌ الرجاء إدخال اسم الفريق');
        }
        const result = await TeamManager.joinTeam(ctx.from.id, name);
        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }
    }

    // Handle economy awaiting input
    if (ctx.session && ctx.session.ecoAwait) {
      const awaiting = ctx.session.ecoAwait;
      const { User } = require('./database/models');

      try {
        if (awaiting.type === 'auction_select') {
          const input = message.trim();
          if (input === '/cancel' || input === 'إلغاء') {
            ctx.session.ecoAwait = null;
            return ctx.reply('❌ تم إلغاء المزاد');
          }

          const choice = parseInt(input, 10);
          if (isNaN(choice)) {
            return ctx.reply('❌ رقم غير صحيح. أرسل رقم عنصر صحيح من القائمة.');
          }

          const AuctionManager = require('./economy/auctionManager');
          const auction = await AuctionManager.getAuctionByItemId(choice);

          if (!auction) {
            return ctx.reply('❌ لا يوجد مزاد نشط لهذا الرقم حالياً. افتح المزاد من جديد.');
          }

          const minBid = auction.highestBid?.amount
            ? auction.highestBid.amount + auction.minIncrement
            : auction.basePrice;

          ctx.session.ecoAwait = { type: 'auction_bid', itemId: auction.itemId };
          return ctx.reply(
            `💰 اختر مبلغ المزايدة على ${auction.itemName}\n` +
              `الحد الأدنى: ${minBid} عملة\n` +
              'اكتب المبلغ أو أرسل (إلغاء)'
          );
        }

        if (awaiting.type === 'auction_bid') {
          const input = message.trim();
          if (input === '/cancel' || input === 'إلغاء') {
            ctx.session.ecoAwait = null;
            return ctx.reply('❌ تم إلغاء المزاد');
          }

          const amount = parseInt(input, 10);
          if (isNaN(amount)) {
            return ctx.reply('❌ المبلغ غير صحيح. أدخل رقم صحيح.');
          }

          const AuctionManager = require('./economy/auctionManager');
          const result = await AuctionManager.placeBid(ctx.from.id, awaiting.itemId, amount, bot);

          if (!result.ok) {
            return ctx.reply(result.message);
          }

          ctx.session.ecoAwait = null;
          return ctx.reply(
            `${result.message}\n` +
              `💳 رصيدك المتبقي: ${result.balance} عملة`
          );
        }

        if (awaiting.type === 'transfer') {
          // Handle coin transfer - find target user
          const targetId = message.trim();
          let targetUser;

          if (/^\d+$/.test(targetId)) {
            // Search by user ID
            targetUser = await User.findOne({ userId: parseInt(targetId) });
          } else if (targetId.startsWith('@')) {
            // Search by @username
            const usernameToFind = targetId.substring(1).toLowerCase();
            targetUser = await User.findOne({
              $or: [
                { username: new RegExp(usernameToFind, 'i') },
                { firstName: new RegExp(usernameToFind, 'i') }
              ]
            });
          } else {
            // Search by firstName or username
            targetUser = await User.findOne({
              $or: [
                { firstName: new RegExp(targetId, 'i') },
                { username: new RegExp(targetId, 'i') }
              ]
            });
          }

          ctx.session.ecoAwait = null;

          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم. حاول استخدام معرفك الرقمي أو اسمك');
          }

          ctx.session.ecoAwait = {
            type: 'transferAmount',
            targetId: targetUser.userId,
            targetName:
              targetUser.firstName || targetUser.username || `المستخدم ${targetUser.userId}`
          };

          const senderCoins = (await User.findOne({ userId: ctx.from.id })).coins || 0;
          return ctx.reply(
            `💸 كم عملة تريد التحويل لـ ${targetUser.firstName || targetUser.username}?\n\n(رصيدك: ${senderCoins} عملة)`
          );
        }

        if (awaiting.type === 'transferAmount') {
          // Handle transfer amount input
          const amount = parseInt(message.trim());
          const sender = await User.findOne({ userId: ctx.from.id });
          const receiver = await User.findOne({ userId: awaiting.targetId });

          if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ المبلغ غير صحيح. أدخل رقماً موجباً');
          }

          if (!sender || (sender.coins || 0) < amount) {
            ctx.session.ecoAwait = null;
            return ctx.reply('❌ رصيدك غير كافي');
          }

          if (!receiver) {
            ctx.session.ecoAwait = null;
            return ctx.reply('❌ المستخدم المستقبل غير موجود');
          }

          if (sender.userId === receiver.userId) {
            ctx.session.ecoAwait = null;
            return ctx.reply('❌ لا يمكنك التحويل لنفسك');
          }

          // Perform transfer
          sender.coins = (sender.coins || 0) - amount;
          receiver.coins = (receiver.coins || 0) + amount;

          // Update transfer counts
          sender.transfersCount = (sender.transfersCount || 0) + 1;
          receiver.receivedTransfers = (receiver.receivedTransfers || 0) + 1;

          // Save both users
          await sender.save();
          await receiver.save();

          // Log transaction
          const Transaction = require('./database/models/Transaction');
          await Transaction.create({
            userId: sender.userId,
            type: 'transfer',
            amount: amount,
            reason: `تحويل لـ ${awaiting.targetName}`,
            relatedUserId: receiver.userId,
            status: 'completed'
          });

          ctx.session.ecoAwait = null;

          // Notify the user
          await ctx.reply(
            '✅ <b>تم التحويل بنجاح!</b>\n\n' +
              `💸 حولت ${amount} عملة لـ ${awaiting.targetName}\n` +
              `💰 رصيدك الجديد: ${sender.coins} عملة`,
            { parse_mode: 'HTML' }
          );

          // Try to notify receiver
          try {
            await ctx.telegram.sendMessage(
              receiver.userId,
              '✅ <b>تلقيت تحويل!</b>\n\n' +
                `💸 استقبلت ${amount} عملة من ${sender.firstName || 'مستخدم'}\n` +
                `💰 رصيدك الجديد: ${receiver.coins} عملة`,
              { parse_mode: 'HTML' }
            );
          } catch (notifyError) {
            logger.warn('Could not notify receiver:', notifyError.message);
          }
        }
      } catch (err) {
        console.error('Error handling ecoAwait input:', err);
        ctx.session.ecoAwait = null;
        return ctx.reply('❌ حدث خطأ أثناء المعالجة');
      }
    }

    // Handle admin awaiting input
    if (ctx.session && ctx.session.adminAwait) {
      const awaiting = ctx.session.adminAwait;
      const { User } = require('./database/models');

      try {
        if (awaiting.type === 'searchUser') {
          // Search for user by ID or name
          let foundUser;
          if (/^\d+$/.test(message.trim())) {
            // Search by ID
            foundUser = await User.findOne({ userId: parseInt(message.trim()) });
          } else {
            // Search by name
            foundUser = await User.findOne({ firstName: new RegExp(message.trim(), 'i') });
          }

          ctx.session.adminAwait = null;

          if (!foundUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          const userInfo =
            '👤 <b>معلومات المستخدم</b>\n\n' +
            `👤 الاسم: ${foundUser.firstName}\n` +
            `🆔 ID: ${foundUser.userId}\n` +
            `⭐ النقاط: ${foundUser.xp || 0}\n` +
            `🎖️ المستوى: ${foundUser.level || 1}\n` +
            `💰 العملات: ${foundUser.coins || 0}\n` +
            `📅 تاريخ الانضمام: ${new Date(foundUser.joinDate).toLocaleDateString('ar')}`;

          const buttons = Markup.inlineKeyboard(
            [Markup.button.callback('🚫 حظر', `admin:ban:${  foundUser.userId}`)],
            [Markup.button.callback('✅ السماح', `admin:unban:${  foundUser.userId}`)],
            [Markup.button.callback('⬅️ رجوع', 'settings:users')]
          );

          return ctx.reply(userInfo, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
        }

        if (awaiting.type === 'broadcast') {
          // Handle broadcast message
          if (message.toLowerCase() === '/cancel') {
            ctx.session.adminAwait = null;
            return ctx.reply('❌ تم الإلغاء');
          }

          const allUsers = await User.find({ banned: false });
          let sent = 0;
          let failed = 0;

          await ctx.reply(`📊 جاري الإرسال لـ ${allUsers.length} مستخدم...`);

          const sendPromises = allUsers.map((user) => {
            return ctx.telegram
              .sendMessage(user.userId, `📢 <b>رسالة من الإدارة</b>\n\n${message}`, {
                parse_mode: 'HTML'
              })
              .then(() => sent++)
              .catch(() => failed++);
          });

          await Promise.all(sendPromises);
          ctx.session.adminAwait = null;

          return ctx.reply(`✅ <b>تم الإرسال</b>\n\n✅ نجح: ${sent}\n❌ فشل: ${failed}`, {
            parse_mode: 'HTML'
          });
        }
      } catch (err) {
        console.error('Error handling adminAwait input:', err);
        ctx.session.adminAwait = null;
        return ctx.reply('❌ حدث خطأ أثناء المعالجة');
      }
    }

    // Handle owner awaiting input
    if (ctx.session && ctx.session.ownerAwait) {
      const awaiting = ctx.session.ownerAwait;
      const { User } = require('./database/models');
      const UIManager = require('./ui/keyboards');

      if (!UIManager.isOwner(ctx.from.id)) {
        ctx.session.ownerAwait = null;
        return ctx.reply('❌ غير مصرح');
      }

      try {
        if (awaiting.type === 'broadcast') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('❌ تم الإلغاء');
          }

          const allUsers = await User.find({ banned: false });
          let sent = 0;
          let failed = 0;

          await ctx.reply(`📊 جاري الإرسال لـ ${allUsers.length} مستخدم...`);

          for (const user of allUsers) {
            try {
              await ctx.telegram.sendMessage(
                user.userId,
                `📢 <b>رسالة من المالك</b>\n\n${message}`,
                { parse_mode: 'HTML' }
              );
              sent++;
            } catch (e) {
              failed++;
            }
            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(`✅ <b>تم الإرسال</b>\n\n✅ نجح: ${sent}\n❌ فشل: ${failed}`, {
            parse_mode: 'HTML'
          });
        }

        if (awaiting.type === 'givecoins') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('❌ تم الإلغاء');
          }

          const parts = message.trim().split(/\s+/);
          if (parts.length !== 2) {
            return ctx.reply('❌ الصيغة غير صحيحة\nأرسل: ID المبلغ\nمثال: 123456789 1000');
          }

          const userId = parseInt(parts[0]);
          const amount = parseInt(parts[1]);

          if (isNaN(userId) || isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ القيم غير صحيحة');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.coins += amount;
          targetUser.totalEarnings += amount;
          await targetUser.save();

          ctx.session.ownerAwait = null;

          // Notify the user
          try {
            await ctx.telegram.sendMessage(
              userId,
              '🎁 <b>مكافأة من المالك!</b>\n\n' +
                `تلقيت ${amount} عملة من مالك البوت!\n` +
                `رصيدك الجديد: ${targetUser.coins} عملة`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            // User blocked bot
          }

          return ctx.reply(
            '✅ تم بنجاح\n' +
              `المستخدم: ${targetUser.firstName}\n` +
              `المبلغ: ${amount} عملة\n` +
              `الرصيد الجديد: ${targetUser.coins} عملة`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'rewardall') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('❌ تم الإلغاء');
          }

          const amount = parseInt(message.trim());
          if (isNaN(amount) || amount <= 0) {
            return ctx.reply('❌ المبلغ غير صحيح');
          }

          const allUsers = await User.find({ banned: false });
          let updated = 0;

          await ctx.reply(`⏳ جاري توزيع ${amount} عملة لـ ${allUsers.length} مستخدم...`);

          for (const user of allUsers) {
            user.coins += amount;
            user.totalEarnings += amount;
            await user.save();
            updated++;

            // Notify user
            try {
              await ctx.telegram.sendMessage(
                user.userId,
                '🎁 <b>مكافأة جماعية!</b>\n\n' +
                  `تلقيت ${amount} عملة من مالك البوت!\n` +
                  `رصيدك الجديد: ${user.coins} عملة`,
                { parse_mode: 'HTML' }
              );
            } catch (e) {
              // User blocked bot
            }

            // Small delay
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(
            '✅ تم التوزيع\n' +
              `عدد المستخدمين: ${updated}\n` +
              `المبلغ لكل مستخدم: ${amount} عملة\n` +
              `المجموع الكلي: ${updated * amount} عملة`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (err) {
        console.error('Error handling ownerAwait input:', err);
        ctx.session.ownerAwait = null;
        return ctx.reply('❌ حدث خطأ أثناء المعالجة');
      }
    }

    // Handle awaiting khatma settings input (time / timezone)
    if (ctx.session && ctx.session.khatmaAwait) {
      const awaiting = ctx.session.khatmaAwait;
      try {
        const { User } = require('./database/models');
        const user = await User.findOne({ userId: ctx.from.id });
        if (!user) return ctx.reply('❌ لم يتم العثور على ملفك');

        if (awaiting.type === 'notifyTime') {
          const m = message.trim();
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(m)) {
            return ctx.reply('❌ الصيغة غير صحيحة. الرجاء إرسال HH:MM مثل 08:30');
          }
          user.preferences = user.preferences || {};
          user.preferences.khatmaSettings = user.preferences.khatmaSettings || {};
          user.preferences.khatmaSettings.notifyTime = m;
          await user.save();
          ctx.session.khatmaAwait = null;
          return ctx.reply(`✅ تم حفظ وقت الإشعار: ${m}`);
        }

        if (awaiting.type === 'timezone') {
          const tz = message.trim();
          try {
            // validate timezone via Intl
            Intl.DateTimeFormat('en-US', { timeZone: tz });
            user.preferences = user.preferences || {};
            user.preferences.khatmaSettings = user.preferences.khatmaSettings || {};
            user.preferences.khatmaSettings.timezone = tz;
            await user.save();
            ctx.session.khatmaAwait = null;
            return ctx.reply(`✅ تم حفظ المنطقة الزمنية: ${tz}`);
          } catch (e) {
            return ctx.reply('❌ المنطقة الزمنية غير صالحة. حاول مثل: Asia/Riyadh أو UTC');
          }
        }
      } catch (err) {
        console.error('Error handling khatmaAwait input:', err);
        ctx.session.khatmaAwait = null;
        return ctx.reply('❌ حدث خطأ أثناء حفظ الإعداد');
      }
    }

    // Default response for unrecognized messages
    await ctx.reply('❓ لم أفهم رسالتك. يرجى استخدام الأوامر المتاحة أو الأزرار في القائمة الرئيسية.', { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Text handler error:', error);
    ctx.reply('❌ حدث خطأ، جاري المحاولة...');
  }
});

// --- BOT STARTUP WITH RECONNECTION ---
const reconnectManager = new ReconnectManager({
  maxRetries: 50,
  initialDelay: 3000,
  maxDelay: 300000,
  backoffMultiplier: 1.5
});

const botStart = async () => {
  return new Promise((resolve, reject) => {
    try {
      logger.info('🤖 جاري بدء بوت Telegram...');

      // Delete any existing webhook to prevent conflicts
      bot.telegram
        .deleteWebhook({ drop_pending_updates: true })
        .then(() => {
          logger.info('✅ تم التحقق من حذف الـ Webhook');
        })
        .catch((webhookError) => {
          logger.warn('⚠️ خطأ في حذف الـ Webhook:', webhookError.message);
        });

      // Launch bot
      bot
        .launch()
        .then(() => {
          reconnectManager.isConnected = true;
          logger.info('✅ تم تشغيل البوت بنجاح!');
          logger.info('✅ البوت يعمل الآن!');
          logger.info('🎯 البوت مستعد و ينتظر الرسائل...');
          resolve(true);
        })
        .catch((error) => {
          logger.error('❌ فشل في بدء البوت:', error.message);
          reconnectManager.isConnected = false;

          // Handle 409 Conflict error (another bot instance running)
          if (error.response && error.response.error_code === 409) {
            logger.warn('⚠️ خطأ 409: يوجد نسخة أخرى من البوت جاري التوقف...');
            logger.warn('⏳ سيحاول إعادة الاتصال خلال 5 ثواني...');
            reject(error); // Will trigger retry in startBot
          } else {
            logger.error('❌ خطأ غير متوقع:', error.message);
            reject(error);
          }
        });
    } catch (error) {
      logger.error('❌ خطأ في محاولة بدء البوت:', error.message);
      reconnectManager.isConnected = false;
      reject(error);
    }
  });
};

async function startBot() {
  try {
    // Give any previous instance time to fully shutdown (Railway cold start delay)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Connect to database
    logger.info('📦 جاري الاتصال بـ MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/arab-bot';

    // محاولة الاتصال بـ MongoDB مع إعادة محاولة
    await reconnectManager.connect(async () => {
      await Database.connect(mongoUri);
      logger.info('✅ تم الاتصال بـ MongoDB بنجاح!');
    });

    // Start bot with intelligent retry logic
    logger.info('🚀 جاري بدء البوت...');

    let botStarted = false;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelays = [3000, 5000, 7000, 10000, 15000]; // Increasing delays

    while (retryCount < maxRetries && !botStarted) {
      try {
        // Wait before trying to start (gives previous instance time to shutdown)
        if (retryCount > 0) {
          const delayMs = retryDelays[retryCount - 1];
          logger.info(`⏳ محاولة #${retryCount + 1}/${maxRetries} بعد ${delayMs / 1000} ثانية...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        await botStart();
        botStarted = true;
        logger.info('✅ البوت جاهز!');
      } catch (error) {
        retryCount++;

        // Check if it's a 409 error (another instance running)
        if (error.response && error.response.error_code === 409) {
          logger.warn(`⚠️ محاولة #${retryCount}/${maxRetries} - خطأ 409 (نسخة أخرى تعمل)`);

          if (retryCount >= maxRetries) {
            logger.error('❌ تم تجاوز عدد المحاولات. سيتم الإيقاف للسماح للسحابة بإعادة التشغيل.');
            process.exit(1);
          }
        } else {
          logger.error(`❌ فشل في محاولة #${retryCount}: ${error.message}`);
          if (retryCount >= maxRetries) {
            logger.error('❌ تم تجاوز عدد المحاولات.');
            throw error;
          }
        }
      }
    }

    // بدء مراقبة صحة الاتصال
    await reconnectManager.startHealthCheck(
      async () => {
        // فحص أن البوت لا يزال يعمل
        try {
          if (bot.polling && bot.polling.timeout) {
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      },
      () => {
        logger.warn('⚠️ فقدان صلة البوت');
      }
    );

    // مراقبة اتصال الإنترنت
    connectionMonitor.startMonitoring((isOnline) => {
      if (isOnline) {
        logger.info('🌐 عاد اتصال الإنترنت!');
        healthMonitor.updateStats({ reconnectAttempts: healthMonitor.stats.reconnectAttempts + 1 });
        // حاول إعادة الاتصال إذا كان البوت معطل
        if (!reconnectManager.isConnected) {
          botStart();
        }
      } else {
        logger.warn('🌐 انقطع اتصال الإنترنت');
        reconnectManager.isConnected = false;
      }
    });

    // بدء مراقبة صحة البوت الدوري
    healthMonitor.startPeriodicCheck(60000); // فحص كل دقيقة

    logger.info('✅ البوت يعمل الآن!');
    logger.info('🎯 البوت مستعد و ينتظر الرسائل...');

    // Initialize New Systems
    logger.info('📲 جاري تفعيل الأنظمة الجديدة...');

    try {
      // Initialize Notification System
      const NotificationSystem = require('./features/notificationSystem');
      const notificationSystem = new NotificationSystem(bot);
      notificationSystem.initialize();
      logger.info('✅ نظام الإشعارات الذكية جاهز');

      // Initialize Advanced Notification System
      const AdvancedNotificationSystem = require('./features/advancedNotificationSystem');
      const advancedNotificationSystem = new AdvancedNotificationSystem(bot);
      advancedNotificationSystem.initialize();
      global.advancedNotifications = advancedNotificationSystem;
      logger.info('✅ نظام الإشعارات المتقدم جاهز');

      // Initialize Backup System
      const BackupSystem = require('./utils/backupSystem');
      const backupSystem = new BackupSystem();
      backupSystem.scheduleAutomaticBackups();
      logger.info('✅ نظام النسخ الاحتياطية جاهز');

      // Initialize Cache Manager
      const CacheManager = require('./utils/cacheManager');
      global.cache = new CacheManager(600);
      logger.info('✅ نظام التخزين المؤقت جاهز');

      // Initialize Rate Limiter
      const RateLimiter = require('./utils/rateLimiter');
      global.rateLimiter = new RateLimiter();
      logger.info('✅ نظام الحماية من الإساءة جاهز');

      logger.info('✅ جميع الأنظمة الجديدة جاهزة!');
    } catch (error) {
      logger.error('⚠️ خطأ في تفعيل بعض الأنظمة:', error.message);
    }

    // Start Khatma scheduler (sends notifications to opted-in users)

    let khatmaScheduler = null;
    let auctionInterval = null;
    let auctionReminderInterval = null;

    try {
      const KhatmaScheduler = require('./utils/khatmaScheduler');

      khatmaScheduler = new KhatmaScheduler({ intervalMs: 1000 * 60 * 15 }, bot);

      khatmaScheduler.start();

      logger.info('🔔 KhatmaScheduler started — notifying opted-in users');
    } catch (err) {
      logger.error('❌ Failed to start KhatmaScheduler:', err.message);
    }

    try {
      const AuctionManager = require('./economy/auctionManager');
      await AuctionManager.ensureActiveAuctions(bot);
      auctionInterval = setInterval(() => {
        AuctionManager.finalizeExpiredAuctions(bot).catch((err) => {
          logger.error('❌ Auction finalize error:', err.message);
        });
      }, 60 * 1000);
      auctionReminderInterval = setInterval(() => {
        AuctionManager.sendTimeLeftNotifications(bot).catch((err) => {
          logger.error('❌ Auction reminder error:', err.message);
        });
      }, 5 * 60 * 60 * 1000);
      logger.info('✅ نظام المزاد جاهز');
    } catch (err) {
      logger.error('❌ Failed to start AuctionManager:', err.message);
    }

    // Graceful shutdown with timeout
    const gracefulShutdown = (signal) => {
      logger.info(`🛑 جاري إيقاف البوت... (${signal})`);

      // Set a timeout to force exit if shutdown takes too long
      const shutdownTimeout = setTimeout(() => {
        logger.error('⏱️ انتهت مهلة الإيقاف، إيقاف قسري...');
        process.exit(1);
      }, 10000); // 10 second timeout

      // Stop all services
      try {
        if (khatmaScheduler) {
          khatmaScheduler.stop();
          logger.info('✅ تم إيقاف KhatmaScheduler');
        }
        if (auctionInterval) {
          clearInterval(auctionInterval);
          logger.info('✅ تم إيقاف AuctionManager');
        }
        if (auctionReminderInterval) {
          clearInterval(auctionReminderInterval);
        }
        if (reconnectManager) {
          reconnectManager.stop();
          logger.info('✅ تم إيقاف ReconnectManager');
        }
        if (connectionMonitor) {
          connectionMonitor.stopMonitoring();
          logger.info('✅ تم إيقاف ConnectionMonitor');
        }
        if (healthMonitor) {
          healthMonitor.stopPeriodicCheck();
          logger.info('✅ تم إيقاف HealthMonitor');
        }
      } catch (error) {
        logger.error('خطأ أثناء إيقاف الخدمات:', error.message);
      }

      // Stop bot
      try {
        bot.stop(signal);
        logger.info('✅ تم إيقاف البوت');
        clearTimeout(shutdownTimeout);
        process.exit(0);
      } catch (error) {
        logger.error('خطأ في إيقاف البوت:', error.message);
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    // Setup graceful shutdown handlers
    let isShuttingDown = false;

    process.once('SIGINT', () => {
      if (!isShuttingDown) {
        isShuttingDown = true;
        gracefulShutdown('SIGINT');
      }
    });

    process.once('SIGTERM', () => {
      if (!isShuttingDown) {
        isShuttingDown = true;
        gracefulShutdown('SIGTERM');
      }
    });

    // معالجة أخطاء غير متوقعة
    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('❌ Promise Rejection غير معالج:', reason);
      logger.error('💡 Stack:', reason instanceof Error ? reason.stack : reason);
      healthMonitor.logError();
    });

    process.on('uncaughtException', (error) => {
      logger.error('❌ استثناء غير معالج:', error.message);
      logger.error('💡 Stack:', error.stack);
      healthMonitor.logError();

      // في بيئة الإنتاج، دع السحابة تتعامل مع إعادة التشغيل
      if (process.env.NODE_ENV === 'production') {
        logger.error('💥 البوت سيتوقف. السحابة ستعيد تشغيله تلقائياً...');
        if (!isShuttingDown) {
          isShuttingDown = true;
          gracefulShutdown('UNCAUGHT_EXCEPTION');
        }
      }
    });
  } catch (error) {
    logger.error('❌ فشل في بدء البوت:', error.message);
    logger.info('⏳ سيحاول البوت الاتصال مجدداً خلال 10 ثواني...');

    setTimeout(() => {
      startBot();
    }, 10000);
  }
}

// ==========================================
// HTTP SERVER FOR RENDER HEALTH CHECK
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Arab Telegram Bot is running!',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: 'active',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`🌐 HTTP Server running on port ${PORT}`);
});

// Start the bot
startBot();

module.exports = bot;
