/**
 * src/index.js
 * Main entry point for the Arab Telegram Bot
 * Integrates all handlers, systems, and core functionality
 */

require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Database = require('./database/db');
const { logger } = require('./utils/helpers');

// Import Handlers
const AdminHandlers = require('./handlers/adminHandlers');
const AIHandlers = require('./handlers/aiHandlers');
const GameHandlers = require('./handlers/gameHandlers');
const EconomyHandlers = require('./handlers/economyHandlers');
const ContentHandlers = require('./handlers/contentHandlers');
const ModerationHandlers = require('./handlers/moderationHandlers');

// Import Command Handlers
const CommandHandler = require('./commands/commandHandler');
const MenuHandler = require('./commands/menuHandler');
const ProfileHandler = require('./commands/profileHandler');

// Import UI Components
const UIManager = require('./ui/keyboards');

// Import Models
const { User } = require('./database/models');
const EconomyManager = require('./economy/economyManager');

// Validate environment variables
if (!process.env.BOT_TOKEN) {
  logger.error('❌ BOT_TOKEN is not defined in environment variables');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  logger.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Use session middleware
bot.use(session());

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Call a menu handler or show fallback message if handler doesn't exist
 * @param {Object} handler - Handler object (e.g., MenuHandler)
 * @param {string} methodName - Method name to call
 * @param {Object} ctx - Telegraf context
 * @param {string} fallbackMessage - Message to show if handler doesn't exist
 */
async function callMenuOrFallback(handler, methodName, ctx, fallbackMessage) {
  if (typeof handler[methodName] === 'function') {
    return await handler[methodName](ctx);
  } else {
    return ctx.reply(fallbackMessage);
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// User tracking middleware
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      let user = await User.findOne({ userId: ctx.from.id });
      if (!user) {
        user = await EconomyManager.createUser(ctx.from.id, ctx.from);
      }
      ctx.dbUser = user;
    } catch (error) {
      logger.error('User tracking middleware error:', error);
    }
  }
  return next();
});

// Logging middleware
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  
  if (ctx.updateType === 'message' && ctx.message?.text) {
    logger.info(`User ${ctx.from.id} sent: ${ctx.message.text} (${ms}ms)`);
  } else if (ctx.updateType === 'callback_query') {
    logger.info(`User ${ctx.from.id} clicked: ${ctx.callbackQuery.data} (${ms}ms)`);
  }
});

// ============================================================================
// CORE COMMANDS
// ============================================================================

// Start command
bot.command('start', async (ctx) => {
  try {
    await CommandHandler.handleStart(ctx);
  } catch (error) {
    logger.error('Start command error:', error);
    ctx.reply('❌ حدث خطأ أثناء بدء البوت');
  }
});

// Help command
bot.command('help', async (ctx) => {
  try {
    await CommandHandler.handleHelp(ctx);
  } catch (error) {
    logger.error('Help command error:', error);
    ctx.reply('❌ حدث خطأ');
  }
});

// Profile command
bot.command('profile', async (ctx) => {
  try {
    await ProfileHandler.handleProfile(ctx);
  } catch (error) {
    logger.error('Profile command error:', error);
    ctx.reply('❌ حدث خطأ في عرض الملف الشخصي');
  }
});

// Balance command
bot.command('balance', async (ctx) => {
  try {
    await CommandHandler.handleBalance(ctx);
  } catch (error) {
    logger.error('Balance command error:', error);
    ctx.reply('❌ حدث خطأ في عرض الرصيد');
  }
});

// Leaderboard command
bot.command('leaderboard', async (ctx) => {
  try {
    await CommandHandler.handleLeaderboard(ctx);
  } catch (error) {
    logger.error('Leaderboard command error:', error);
    ctx.reply('❌ حدث خطأ في عرض لوحة المتصدرين');
  }
});

// Daily reward command
bot.command('daily', async (ctx) => {
  try {
    await CommandHandler.handleDailyReward(ctx);
  } catch (error) {
    logger.error('Daily reward command error:', error);
    ctx.reply('❌ حدث خطأ في المكافأة اليومية');
  }
});

// Owner panel command
bot.command('owner', async (ctx) => {
  try {
    await CommandHandler.handleOwnerPanel(ctx);
  } catch (error) {
    logger.error('Owner panel command error:', error);
    ctx.reply('❌ حدث خطأ');
  }
});

// ============================================================================
// MENU HANDLERS
// ============================================================================

// Main menu
bot.action('menu:main', async (ctx) => {
  try {
    await MenuHandler.handleMainMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Main menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Khatma menu
bot.action('menu:khatma', async (ctx) => {
  try {
    await MenuHandler.handleKhatmaMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Khatma menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Adhkar menu
bot.action('menu:adhkar', async (ctx) => {
  try {
    await MenuHandler.handleAdhkarMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Adhkar menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Quran menu
bot.action('menu:quran', async (ctx) => {
  try {
    await MenuHandler.handleQuranMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Quran menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Games menu
bot.action('menu:games', async (ctx) => {
  try {
    await MenuHandler.handleGamesMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Games menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Economy menu
bot.action('menu:economy', async (ctx) => {
  try {
    await MenuHandler.handleEconomyMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Economy menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Profile menu
bot.action('menu:profile', async (ctx) => {
  try {
    await MenuHandler.handleProfileMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Profile menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Leaderboard menu
bot.action('menu:leaderboard', async (ctx) => {
  try {
    await MenuHandler.handleLeaderboardMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Leaderboard menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Settings menu
bot.action('menu:settings', async (ctx) => {
  try {
    await MenuHandler.handleSettingsMenu(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Settings menu error:', error);
    await ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// ============================================================================
// REGISTER ALL HANDLERS
// ============================================================================

// Register Admin Handlers
AdminHandlers.register(bot);

// Register AI Handlers
AIHandlers.register(bot);

// Register Game Handlers
GameHandlers.register(bot);

// Register Economy Handlers
EconomyHandlers.register(bot);

// Register Content Handlers
ContentHandlers.register(bot);

// Register Moderation Handlers
ModerationHandlers.register(bot);

// ============================================================================
// TEXT MESSAGE HANDLERS (Reply Keyboard)
// ============================================================================

// Handle text messages from reply keyboard
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  try {
    // Main menu buttons
    if (text === '🕌 الختمة') {
      return await MenuHandler.handleKhatmaMenu(ctx);
    }
    if (text === '📿 الأذكار') {
      return await MenuHandler.handleAdhkarMenu(ctx);
    }
    if (text === '📖 القرآن') {
      return await MenuHandler.handleQuranMenu(ctx);
    }
    if (text === '💭 الاقتباسات') {
      return await MenuHandler.handleQuotesMenu(ctx);
    }
    if (text === '✍️ الشعر') {
      return await MenuHandler.handlePoetryMenu(ctx);
    }
    if (text === '🎮 الألعاب') {
      return await MenuHandler.handleGamesMenu(ctx);
    }
    if (text === '💰 الاقتصاد') {
      return await MenuHandler.handleEconomyMenu(ctx);
    }
    if (text === '👤 حسابي') {
      return await MenuHandler.handleProfileMenu(ctx);
    }
    if (text === '🏆 المتصدرين') {
      return await MenuHandler.handleLeaderboardMenu(ctx);
    }
    if (text === '⚙️ الإعدادات') {
      return await MenuHandler.handleSettingsMenu(ctx);
    }
    if (text === '✨ الميزات') {
      return await callMenuOrFallback(MenuHandler, 'handleFeaturesMenu', ctx, '✨ الميزات\n\nهذه الميزة قيد التطوير');
    }
    if (text === '📚 المكتبة') {
      return await callMenuOrFallback(MenuHandler, 'handleLibraryMenu', ctx, '📚 المكتبة\n\nهذه الميزة قيد التطوير');
    }
    if (text === '🛍️ المتجر') {
      return await MenuHandler.handleShopMenu(ctx);
    }
    if (text === '💸 التحويلات والتبرعات') {
      return await MenuHandler.handleTransfersMenu(ctx);
    }
    if (text === '🔔 الإشعارات الذكية') {
      return await MenuHandler.handleSmartNotificationsMenu(ctx);
    }
    if (text === '🌍 إدارة اللغات') {
      return await MenuHandler.handleLanguagesMenu(ctx);
    }
    if (text === '📁 النسخ الاحتياطية') {
      return await MenuHandler.handleBackupsMenu(ctx);
    }
    if (text === '⚡ التخزين المؤقت') {
      return await MenuHandler.handleCacheMenu(ctx);
    }
    if (text === '🛡️ حماية من الإساءة') {
      return await MenuHandler.handleProtectionMenu(ctx);
    }
    if (text === '✨ الميزات الجديدة') {
      return await callMenuOrFallback(MenuHandler, 'handleNewFeaturesMenu', ctx, '✨ الميزات الجديدة\n\nهذه الميزة قيد التطوير');
    }
    if (text === '📊 إحصائيات') {
      return await callMenuOrFallback(MenuHandler, 'handleAdminStats', ctx, '📊 إحصائيات\n\nهذه الميزة قيد التطوير');
    }
    if (text === '🎁 المكافآت') {
      return await callMenuOrFallback(MenuHandler, 'handleRewardsMenu', ctx, '🎁 المكافآت\n\nاستخدم /daily للحصول على مكافأتك اليومية');
    }
    if (text === '👑 لوحة المالك') {
      if (ctx.from && UIManager.isOwner(ctx.from.id)) {
        return await CommandHandler.handleOwnerPanel(ctx);
      } else {
        return ctx.reply('❌ هذا الأمر متاح للمالك فقط');
      }
    }
    if (text === '❌ إغلق') {
      return ctx.reply('تم الإغلاق', { reply_markup: { remove_keyboard: true } });
    }
  } catch (error) {
    logger.error('Text handler error:', error);
    ctx.reply('❌ حدث خطأ');
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
bot.catch((err, ctx) => {
  logger.error('Bot error:', err);
  try {
    ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  } catch (replyError) {
    logger.error('Error sending error message:', replyError);
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Stop the bot
    bot.stop(signal);
    logger.info('✅ Bot stopped');
    
    // Disconnect from database
    await Database.disconnect();
    logger.info('✅ Database disconnected');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // For uncaught exceptions, we need to exit immediately after logging
  // as the application state may be inconsistent
  try {
    bot.stop('uncaughtException');
  } catch (e) {
    // Ignore errors during emergency stop
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

async function initializeBot() {
  try {
    logger.info('🤖 Starting Arab Telegram Bot...');
    
    // Connect to database
    await Database.connect(process.env.MONGO_URI);
    logger.info('✅ Database connected');
    
    // Launch bot
    await bot.launch();
    logger.info('✅ Bot launched successfully');
    logger.info(`Bot is running as @${bot.botInfo.username}`);
    
    // Log system information
    logger.info('📊 System Information:');
    logger.info(`- Node.js version: ${process.version}`);
    logger.info(`- Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`- Bot owners: ${process.env.BOT_OWNERS || 'Not configured'}`);
    
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Start the bot
initializeBot();
