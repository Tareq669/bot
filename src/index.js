/* eslint-disable quotes, no-unexpected-multiline, prefer-template, no-const-assign, no-trailing-spaces, no-undef, no-unused-vars, prefer-const */
require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const Database = require('./database/db');
const CommandHandler = require('./commands/commandHandler');
const MenuHandler = require('./commands/menuHandler');
const GameHandler = require('./commands/gameHandler');
const EconomyHandler = require('./commands/economyHandler');
const ContentHandler = require('./commands/contentHandler');
const ProfileHandler = require('./commands/profileHandler');
const { logger } = require('./utils/helpers');
const ReconnectManager = require('./utils/reconnect');
const connectionMonitor = require('./utils/connectionMonitor');
const healthMonitor = require('./utils/healthMonitor');
const EconomyManager = require('./economy/economyManager');
const Formatter = require('./ui/formatter');
const { User } = require('./database/models');

// Import AI Systems
const AIManager = require('./ai/aiManager');
const LearningSystem = require('./ai/learningSystem');
const SmartNotifications = require('./ai/smartNotifications');
const AnalyticsEngine = require('./ai/analyticsEngine');
const IntegratedAI = require('./ai/integratedAI');

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
bot.telegram.setMyCommands([
  { command: 'start', description: '?? ????????' },
  { command: 'khatma', description: '?? ??????' },
  { command: 'adhkar', description: '?? ???????' },
  { command: 'quran', description: '?? ??????' },
  { command: 'games', description: '?? ???????' },
  { command: 'qgames', description: '?? ??????? ????????' },
  { command: 'economy', description: '?? ????????' },
  { command: 'shop', description: '??? ??????' },
  { command: 'transfer', description: '?? ????? ?????' },
  { command: 'profile', description: '?? ?????' },
  { command: 'leaderboard', description: '?? ?????????' },
  { command: 'language', description: '?? ?????' },
  { command: 'notifications', description: '?? ?????????' },
  { command: 'help', description: '? ????????' }
]).catch(err => {
  logger.error('??? ?? ????? ????? ???????:', err);
});

// Error handling for bot
bot.catch((err, ctx) => {
  // ????? ????? Timeout ????????
  if (err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH') {
    logger.warn(`?? ??? ????? ????: ${err.code}`);
    return;
  }

  logger.error('? ??? ?? ?????:', err);
  healthMonitor.logError();
  // ???? ???? ??? ????????
  try {
    if (ctx && ctx.reply && err.code !== 409) {
      ctx.reply('? ??? ??? ??? ?????? ???? ?????? ???????...').catch(e => {
        logger.error('??? ???? ??? ?????:', e.message);
      });
    }
  } catch (e) {
    logger.error('??? ?? ?????? ?????:', e.message);
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

// --- AI SMART COMMANDS ---
bot.command('dashboard', async (ctx) => {
  try {
    const dashboard = await IntegratedAI.generateSmartDashboard(ctx.from.id);
    const formatted = IntegratedAI.formatSmartDashboard(dashboard);
    ctx.reply(formatted, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Dashboard error:', error);
    ctx.reply('? ???? ?????? ??? ????? ??????');
  }
});

bot.command('analytics', async (ctx) => {
  try {
    const report = await AnalyticsEngine.generateUserReport(ctx.from.id);
    const formatted = AnalyticsEngine.formatReport(report);
    ctx.reply(formatted, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Analytics error:', error);
    ctx.reply('? ???? ????????? ??? ????? ??????');
  }
});

bot.command('coaching', async (ctx) => {
  try {
    const message = await IntegratedAI.generateCoachingMessage(ctx.from.id);
    ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Coaching error:', error);
    ctx.reply('? ???? ??????? ??? ????? ??????');
  }
});

bot.command('motivation', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    if (user) {
      const motivation = IntegratedAI.generateMotivation(user);
      ctx.reply(motivation, { parse_mode: 'HTML' });
    }
  } catch (error) {
    logger.error('Motivation error:', error);
    ctx.reply('? ???? ??????? ??? ????? ??????');
  }
});

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

// --- NEW FEATURES COMMANDS ---
// Shop System
bot.command('shop', async (ctx) => {
  try {
    const ShopSystem = require('./features/shopSystem');
    const menu = ShopSystem.formatShopMenu();
    ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Shop error:', error);
    ctx.reply('? ???? ?????? ??? ?????');
  }
});

// Payment & Transfer
bot.command('transfer', async (ctx) => {
  try {
    const msg = ctx.message.text.split(' ');
    
    if (msg.length < 3) {
      return ctx.reply('??????: /transfer @username amount\n????: /transfer @user 100');
    }
    
    ctx.reply('?? ???? ?????? ???????...');
  } catch (error) {
    ctx.reply('? ??? ??? ?? ???????');
  }
});

// Multi-language
bot.command('language', async (ctx) => {
  try {
    const LanguageManager = require('./utils/languageManager');
    const langManager = new LanguageManager();
    const menu = langManager.getLanguagesMenu();
    ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('? ???? ?????? ??? ?????');
  }
});

// Notifications Management
bot.command('notifications', async (ctx) => {
  try {
    const msg = `?? <b>????? ?????????</b>\n\n`;
    const msg2 = msg + `${ctx.message.from.first_name}\n\n`;
    const msg3 = msg2 + `?????? ???????? ???????:\n`;
    const msg4 = msg3 + `? ?????\n? ?????\n\n/notif on|off`;
    ctx.reply(msg4, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('? ???? ????????? ??? ?????');
  }
});

// Backup System
bot.command('backup', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  
  if (!ownerIds.includes(ctx.from.id)) {
    return ctx.reply('? ??? ???? ??????');
  }
  
  try {
    const BackupSystem = require('./utils/backupSystem');
    const backup = new BackupSystem();
    const result = await backup.backupUsers();
    
    if (result.success) {
      ctx.reply(`? ?? ????? ??????????!\n?? ${result.filename}\n?? ${result.count} ??????`);
    } else {
      ctx.reply('? ??? ????? ??????????');
    }
  } catch (error) {
    ctx.reply('? ??? ?? ????? ??????????');
  }
});

// Quranic Games
bot.command('qgames', async (ctx) => {
  try {
    const QuranicGames = require('./games/quranicGames');
    const menu = QuranicGames.formatGamesList();
    ctx.reply(menu, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply('? ???? ??????? ??? ?????');
  }
});

// --- ADMIN COMMANDS ---
bot.command('health', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  
  if (ownerIds.includes(ctx.from.id)) {
    const report = healthMonitor.getFullReport();
    await ctx.reply(report, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('? ??? ???? ?????? ???? ?????');
  }
});

bot.command('myid', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  const isOwner = ownerIds.includes(ctx.from.id);
  
  await ctx.reply(
    `?? <b>??????? ?????</b>\n\n` +
    `?? ?????: ${ctx.from.first_name || '??? ?????'}\n` +
    `?? Telegram ID: <code>${ctx.from.id}</code>\n` +
    `????? ??????: ${ctx.from.username ? '@' + ctx.from.username : '??? ?????'}\n` +
    `${isOwner ? '?? <b>??? ???? ?????</b>' : ''}`,
    { parse_mode: 'HTML' }
  );
});

bot.command('owners', async (ctx) => {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  
  if (!ownerIds.includes(ctx.from.id)) {
    return ctx.reply('? ??? ???? ?????? ???? ?????');
  }
  
  await ctx.reply(
    `?? <b>????? ?????</b>\n\n` +
    `IDs: <code>${ownerIds.join(', ')}</code>\n\n` +
    `?? ?????? ???? ????:\n` +
    `1. ???? ??? ????? /myid ?????\n` +
    `2. ??? ID ????? ?? ?? ??? .env\n` +
    `3. BOT_OWNERS=ID1,ID2,ID3\n` +
    `4. ??? ????? ?????`,
    { parse_mode: 'HTML' }
  );
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
      return ctx.answerCbQuery('? ??? ????');
    }

    const banned = await User.find({ banned: true }).limit(20);
    
    let message = `?? <b>?????????? ????????? (${banned.length})</b>\n\n`;
    
    if (banned.length === 0) {
      message += '?? ???? ???????? ??????? ??????';
    } else {
      banned.forEach((u, i) => {
        message += `${i + 1}. ${u.firstName}\n`;
        message += `   ID: <code>${u.userId}</code>\n`;
        message += `   ?????: ${u.bannedReason || '??? ????'}\n\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('?? ????', 'owner:panel')]
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
    console.error('Owner banned error:', error);
    ctx.answerCbQuery('? ??? ???');
  }
});

// Owner - Database Info
bot.action('owner:dbinfo', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    const mongoose = require('mongoose');
    const dbStats = await mongoose.connection.db.stats();
    
    const message = `??? <b>??????? ????? ????????</b>\n\n` +
      `?? <b>??????????:</b>\n` +
      `ï¿½ ?????: ${mongoose.connection.db.databaseName}\n` +
      `ï¿½ ?????: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB\n` +
      `ï¿½ ??? ???????: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB\n` +
      `ï¿½ ??? ?????????: ${dbStats.objects}\n` +
      `ï¿½ ?????????: ${dbStats.collections}\n` +
      `ï¿½ ???????: ${dbStats.indexes}\n\n` +
      `?? <b>???????:</b>\n` +
      `ï¿½ ??????: ${mongoose.connection.readyState === 1 ? '? ????' : '? ??? ????'}\n` +
      `ï¿½ Host: ${mongoose.connection.host}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('?? ?????', 'owner:dbinfo')],
      [Markup.button.callback('?? ????', 'owner:database')]
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
    ctx.answerCbQuery('? ??? ???');
  }
});

// Owner - Richest Users
bot.action('owner:richest', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    const richest = await User.find().sort({ coins: -1 }).limit(10);
    
    let message = `?? <b>???? 10 ????????</b>\n\n`;
    richest.forEach((u, i) => {
      const medal = i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : `${i + 1}.`;
      message += `${medal} ${u.firstName}\n`;
      message += `   ?? ${u.coins.toLocaleString()} ????\n`;
      message += `   ID: <code>${u.userId}</code>\n\n`;
    });


    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('?? ????', 'owner:economy')]
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
    console.error('Owner richest error:', error);
    ctx.answerCbQuery('? ??? ???');
  }
});

// Owner - Reward All Users
bot.action('owner:rewardall', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'rewardall' };
    
    await ctx.answerCbQuery('? ????');
    await ctx.reply(
      `?? <b>?????? ??????</b>\n\n` +
      `???? ?????? ???? ???? ?????? ????? ??????????:\n\n` +
      `? ???? /cancel ???????`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Owner rewardall error:', error);
    ctx.answerCbQuery('? ??? ???');
  }
});

// Owner - Systems Status
bot.action('owner:systems', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    const mongoose = require('mongoose');
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const message = `? <b>???? ???????</b>\n\n` +
      `?? <b>?????:</b>\n` +
      `ï¿½ ??????: ? ????\n` +
      `ï¿½ ??? ???????: ${Math.floor(uptime / 60)} ?????\n` +
      `ï¿½ PID: ${process.pid}\n\n` +
      `?? <b>???????:</b>\n` +
      `ï¿½ ?????????: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
      `ï¿½ ???????: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
      `ï¿½ RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB\n\n` +
      `??? <b>????? ????????:</b>\n` +
      `ï¿½ ??????: ${mongoose.connection.readyState === 1 ? '? ????' : '? ??? ????'}\n\n` +
      `?? <b>Node.js:</b>\n` +
      `ï¿½ ???????: ${process.version}\n` +
      `ï¿½ ??????: ${process.platform}`;


    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('?? ?????', 'owner:systems')],
      [Markup.button.callback('?? ????', 'owner:panel')]
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
    ctx.answerCbQuery('? ??? ???');
  }
});

// Owner - Cleanup inactive users
bot.action('owner:cleanup', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    // Users inactive for more than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactiveCount = await User.countDocuments({
      lastActiveDay: { $lt: ninetyDaysAgo }
    });

    const message = `??? <b>????? ????????</b>\n\n` +
      `?????????? ????? ????? (???? ?? 90 ???): ${inactiveCount}\n\n` +
      `?? ?? ???? ??????\n\n` +
      `?? ??? ??????? ?? ???? ??????? ???!`;


    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('? ???? ????', 'owner:cleanup:confirm'),
        Markup.button.callback('? ?????', 'owner:panel')
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
    ctx.answerCbQuery('? ??? ???');
  }
});

bot.action('owner:cleanup:confirm', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('? ??? ????');
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await User.deleteMany({
      lastActiveDay: { $lt: ninetyDaysAgo }
    });

    await ctx.answerCbQuery(`? ?? ??? ${result.deletedCount} ??????`);
    await ctx.editMessageText(
      `? <b>??? ????? ???????</b>\n\n` +
      `??? ?????????? ?????????: ${result.deletedCount}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Owner cleanup confirm error:', error);
    ctx.answerCbQuery('? ??? ???');
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
bot.action('menu:languages', (ctx) => MenuHandler.handleLanguagesMenu(ctx));
bot.action('menu:backups', (ctx) => MenuHandler.handleBackupsMenu(ctx));
bot.action('menu:cache', (ctx) => MenuHandler.handleCacheMenu(ctx));
bot.action('menu:protection', (ctx) => MenuHandler.handleProtectionMenu(ctx));
bot.action('settings:notifications', (ctx) => MenuHandler.handleNotificationsSettings(ctx));
bot.action('settings:toggleNotify', (ctx) => MenuHandler.handleToggleNotifications(ctx));
bot.action('settings:language', (ctx) => MenuHandler.handleLanguageSettings(ctx));

// --- NEW FEATURES MENU ---
bot.action('menu:newfeatures', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.newFeaturesMenuKeyboard();
  await ctx.editMessageText(
    '? <b>???????? ??????? ?? ?????</b>\n\n' +
    '?? <b>??????? ????????</b> - ????? ??????? ?????? ?????\n' +
    '??? <b>?????? ???????</b> - ????? ?????? ??????\n' +
    '?? <b>?????? ??????</b> - ??????? ???????\n' +
    '?? <b>????????? ??????</b> - ??????? ????? ?????\n' +
    '?? <b>?????? ????????</b> - ???? ???????? ??????\n' +
    '?? <b>????? ??????????</b> - ??? ???????? ????????\n' +
    '? <b>???? ??????? ??????</b> - ???? ????\n' +
    '??? <b>????? ?? ???????</b> - ???? ????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('menu:premiumfeatures', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.premiumFeaturesKeyboard();
  await ctx.editMessageText(
    '?? <b>??????? ???????</b>\n\n' +
    '??????: ????? ???????? ?????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

// --- NEW QGAMES ACTIONS ---
bot.action('new:qgames', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.quranicGamesKeyboard();
  await ctx.editMessageText(
    '?? <b>??????? ????????</b>\n\n' +
    '1?? <b>????? ?????</b> - ???? ????? ?? ?????? ???????\n' +
    '2?? <b>????? ?????</b> - ???? ????? ???????\n' +
    '3?? <b>????? ?????</b> - ?? ????? ??? ?????\n' +
    '4?? <b>??????? ??????</b> - ??? ??? ????? ??????\n' +
    '5?? <b>?? ?????</b> - ?? ????? ????????\n\n' +
    '?? ?? ???? ???? <b>10-20 ????</b> ??? ??????!',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action(/qgame:(gueverse|complete|spot|trivia|surah)/, async (ctx) => {
  ctx.answerCbQuery('?? ???? ????? ??????...');
  const GameManager = require('./games/quranicGames');
  
  const gameType = ctx.match[1];
  const games = {
    'gueverse': 'guessTheVerse',
    'complete': 'completeTheVerse',
    'spot': 'spotTheDifference',
    'trivia': 'qurranTrivia',
    'surah': 'surahCount'
  };
  
  const result = await GameManager[games[gameType]](ctx.from.id);
  if (result.success) {
    let message = result.question;
    const keyboard = Markup.inlineKeyboard(
      result.options.map(opt => [
        Markup.button.callback(opt, `qgameans:${gameType}:${opt}`)
      ])
    );
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply('? ' + result.message);
  }
});

// --- NEW SHOP ACTIONS ---
bot.action('new:shop', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.shopMenuKeyboard();
  await ctx.editMessageText(
    '??? <b>???? ????? ???????</b>\n\n' +
    '?? <b>???????</b> - ????? ????? VIP ????????\n' +
    '? <b>????????</b> - ?????? ????? ?? 2x ?3x\n' +
    '?? <b>???????</b> - ????? ?????\n' +
    '?? <b>????? ???????</b> - ???? ?????? ????\n\n' +
    '?? <b>??????:</b> ?????? <code>/balance</code>',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('shop:all', async (ctx) => {
  const shopSystem = require('./features/shopSystem');
  const items = shopSystem.getAllShopItems();
  let message = '??? <b>?? ??????? ???????</b>\n\n';
  items.forEach(item => {
    message += `${item.emoji} <b>${item.name}</b>\n?? ${item.price} ????\n${item.description}\n\n`;
  });
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'new:shop')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

// --- NEW TRANSFER ACTIONS ---
bot.action('new:transfer', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.transferMenuKeyboard();
  await ctx.editMessageText(
    '?? <b>???? ????????? ?????????</b>\n\n' +
    '?? <b>????? ?????</b> - ??? ?????? ????????\n' +
    '? <b>????? ????</b> - ???? ?????\n' +
    '?? <b>???? ????</b> - ????? ??????\n' +
    '?? <b>?????</b> - ???? ????????\n\n' +
    '? ??? ?????? 100%',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('transfer:coins', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.ecoAwait = { type: 'transfer' };
  await ctx.reply('?? <b>????? ?????</b>\n\n' +
    '???? ????? ???????? ???? ???? ??????? ??:\n\n' +
    '<code>@username</code> ?? <code>?????? ??????</code>',
  { parse_mode: 'HTML' }
  );
});

bot.action('transfer:charity', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.ecoAwait = { type: 'donate' };
  await ctx.reply('?? <b>???? ????</b>\n\n???? ?????? ?????? (???????):\n????: 100 ?????? ?????', { parse_mode: 'HTML' });
});

// --- NEW NOTIFICATIONS ACTIONS ---
bot.action('new:notifications', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.notificationsMenuKeyboard();
  await ctx.editMessageText(
    '?? <b>????????? ??????</b>\n\n' +
    '?? <b>??????? ???????</b> - ??????? ?????\n' +
    '? <b>??????? ????a?</b> - ?????? ??????\n' +
    '?? <b>??????? ???????</b> - ???? ????????\n' +
    '?? <b>??????? ????????</b> - ???? ????\n' +
    '?? <b>??????? ???????</b> - ????? ?????\n\n' +
    '?? ???? ????????? ???? ??????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action(/notify:(adhkar|prayer|games|rewards|events|stats)/, async (ctx) => {
  const type = ctx.match[1];
  const notificationSystem = require('./features/notificationSystem');
  const user = await require('./database/db').User.findById(ctx.from.id);
  
  let message = '';
  switch(type) {
    case 'adhkar':
      message = '?? ??????? ??????? ?????\n? ?????? ??????? ????? ????????';
      break;
    case 'prayer':
      message = '? ??????? ??????\n? ?????? ?????? ??????';
      break;
    case 'games':
      message = '?? ??????? ???????\n? ???? ?????? ???????? ???????';
      break;
    case 'rewards':
      message = '?? ??????? ????????\n? ?????? ???? ?????';
      break;
    case 'events':
      message = '?? ??????? ???????\n? ?????? ??????? ???????';
      break;
    case 'stats': {
      const userStats = await require('./database/db').User.findById(ctx.from.id);
      message = `?? <b>?????????</b>\n\n` +
        `?? ?????: ${userStats.coins}\n` +
        `? ????: ${userStats.xp}\n` +
        `?? ??????? ???????: ${userStats.gamesPlayed}\n` +
        `?? ?????? ???????: ${userStats.quranPages} ????`;
      break;
    }
  }
  
  await ctx.reply(message, { parse_mode: 'HTML' });
  ctx.answerCbQuery('? ??');
});

// --- NEW LANGUAGE ACTIONS ---
bot.action('new:language', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.languageMenuKeyboard();
  await ctx.editMessageText(
    '?? <b>????? ??????</b>\n\n' +
    '???? <b>???????</b> - ??????? ?????? (???????)\n' +
    '???? <b>English</b> - ??????????\n' +
    '???? <b>Franï¿½ais</b> - ????????\n\n' +
    '?? ???? ???? ???????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action(/lang:(ar|en|fr)/, async (ctx) => {
  const lang = ctx.match[1];
  const languageManager = global.languageManager;
  const result = await languageManager.setUserLanguage(ctx.from.id, lang);
  
  const messages = {
    'ar': '? ?? ????? ????? ??? ???????',
    'en': '? Language changed to English',
    'fr': '? La langue a ï¿½tï¿½ changï¿½e en franï¿½ais'
  };
  
  await ctx.reply(messages[lang], { parse_mode: 'HTML' });
  ctx.answerCbQuery('?');
});

// --- NEW BACKUP ACTIONS ---
bot.action('new:backup', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.backupMenuKeyboard();
  await ctx.editMessageText(
    '?? <b>???? ????? ??????????</b>\n\n' +
    '?? <b>????? ?????????</b> - ?????? ????????\n' +
    '?? <b>????? ?????</b> - ?? ????? ????????\n' +
    '?? <b>???????</b> - ???? ????? ?????\n' +
    '??? <b>???</b> - ??? ???? ?????\n\n' +
    '? ?????? ???? ????? ??????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('backup:create', async (ctx) => {
  await ctx.answerCbQuery('? ???? ????? ???? ????????...');
  const backupSystem = require('./utils/backupSystem');
  const result = await backupSystem.createBackup('manual');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('backup:list', async (ctx) => {
  const backupSystem = require('./utils/backupSystem');
  const backups = await backupSystem.listBackups();
  let message = '?? <b>????? ????? ??????????</b>\n\n';
  backups.forEach((b, i) => {
    message += `${i+1}. ${b.date}\n?? ${b.size}\n\n`;
  });
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'new:backup')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

// --- NEW CACHE ACTIONS ---
bot.action('new:cache', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.cacheSystemKeyboard();
  await ctx.editMessageText(
    '? <b>???? ??????? ??????</b>\n\n' +
    '?? <b>????????</b> - ??????? ???????\n' +
    '?? <b>???</b> - ????? ???????\n' +
    '? <b>??????</b> - ???? ??????\n\n' +
    '?? ????? ???? ????? ????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('cache:stats', async (ctx) => {
  const cache = global.cache;
  const stats = cache.getStats();
  const message = `?? <b>???????? ???????</b>\n\n` +
    `?? ???????: ${stats.keys}\n` +
    `? ????????: ${stats.hits}\n` +
    `? ?????: ${stats.misses}\n` +
    `?? ???? ??????: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`;
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'new:cache')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

bot.action('cache:clear', async (ctx) => {
  await ctx.answerCbQuery('?? ???? ?????...');
  const cache = global.cache;
  cache.flushAll();
  await ctx.reply('? ?? ??? ??????? ?????', { parse_mode: 'HTML' });
});

// --- NEW RATE LIMITER ACTIONS ---
bot.action('new:ratelimiter', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  const keyboard = UIManager.rateLimiterKeyboard();
  await ctx.editMessageText(
    '??? <b>???? ??????? ?? ???????</b>\n\n' +
    '?? <b>???? ?? ???????</b> - 10 ?????/?????\n' +
    '?? <b>???? ?? ???????</b> - 20 ???/?????\n' +
    '?? <b>???? ?? ???????</b> - 5 ?????/5 ?????\n\n' +
    '?? ????? ????? ?? ??????? ???????? ???????',
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.action('ratelimit:status', async (ctx) => {
  const rateLimiter = global.rateLimiter;
  const status = rateLimiter.getUserStatus(ctx.from.id);
  const message = `?? <b>???? ?????</b>\n\n` +
    `???????: ${status.messages.count}/${status.messages.limit}\n` +
    `???????: ${status.commands.count}/${status.commands.limit}\n` +
    `???????: ${status.games.count}/${status.games.limit}\n\n` +
    `${status.blocked ? '?? <b>????? ??????</b>' : '? <b>???</b>'}`;
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'new:ratelimiter')]]);
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
});

bot.action('ratelimit:info', async (ctx) => {
  const message = `? <b>?? ?? ???? ????????</b>\n\n` +
    `??? ???? ????? ??:\n` +
    `ï¿½ ??????? ???????\n` +
    `ï¿½ ??????? ???????\n` +
    `ï¿½ ????????? ??????\n\n` +
    `?? ??? ?????? ???? ??????:\n` +
    `ï¿½ ??? ?????? 5 ?????\n` +
    `ï¿½ ??? ????????? ???????\n\n` +
    `? ????????? ??????? ??? ??????`;
  const keyboard = Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'new:ratelimiter')]]);
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
  if (!events.length) return ctx.reply('? ?? ???? ????? ????');
  const leaderboard = await EventsSystem.getEventLeaderboard(events[0]._id, 10);
  await ctx.reply(EventsSystem.formatEventLeaderboard(events[0], leaderboard), { parse_mode: 'HTML' });
});

// --- REWARDS ACTIONS ---
bot.action('reward:daily', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.claimDailyReward(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '? ??' : '?');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('rewards:daily', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.claimDailyReward(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '? ??' : '?');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action('reward:wheel', async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const result = await RewardsSystem.spinWheel(ctx.from.id);
  await ctx.answerCbQuery(result.success ? '? ??' : '?');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

bot.action(/reward:loot:(basic|silver|gold|legendary)/, async (ctx) => {
  const RewardsSystem = require('./features/rewardsSystem');
  const boxType = ctx.match[1];
  const result = await RewardsSystem.openLootBox(ctx.from.id, boxType);
  await ctx.answerCbQuery(result.success ? '? ??' : '?');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

// --- GOALS ACTIONS ---
bot.action('add_goal', async (ctx) => {
  const keyboard = require('./ui/keyboards').goalsTemplatesKeyboard();
  await ctx.reply('?? ???? ???? ??? ????:', { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
});

bot.action(/goal:(khatma|adhkar|pages|prayers|games|charity)/, async (ctx) => {
  const GoalsManager = require('./features/goals');
  const templates = GoalsManager.getSuggestedGoals();
  const type = ctx.match[1];
  const template = templates.find(t => {
    if (type === 'pages') return t.type === 'quran_pages';
    return t.type === type;
  });
  if (!template) return ctx.answerCbQuery('? ???? ??? ?????');
  const result = await GoalsManager.createGoal(ctx.from.id, template);
  await ctx.answerCbQuery(result.success ? '? ??' : '?');
  await ctx.reply(result.message, { parse_mode: 'HTML' });
});

// --- CHARITY ACTIONS ---
bot.action(/charity:add:(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'charity', charityType: ctx.match[1] };
  await ctx.reply('?? ???? ?????? ?????? (???????). ????: 100 ?????? ?????');
  await ctx.answerCbQuery('?');
});

// --- MEMORIZATION ACTIONS ---
bot.action('mem:add', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'memorization' };
  await ctx.reply('?? ????: ??? ?????? | ??? ?????? | ?? ??? | ??? ???\n????: 1|???????|1|7');
  await ctx.answerCbQuery('?');
});

bot.action('mem:stats', (ctx) => CommandHandler.handleMemorization(ctx));
bot.action('mem:tips', async (ctx) => {
  const MemorizationSystem = require('./features/memorizationSystem');
  const tips = MemorizationSystem.getMemorizationTips();
  await ctx.reply(`?? <b>????? ?????</b>\n\n${tips.join('\n')}`, { parse_mode: 'HTML' });
});
bot.action('mem:review', async (ctx) => {
  const MemorizationSystem = require('./features/memorizationSystem');
  const dueReviews = await MemorizationSystem.getDueReviews(ctx.from.id);
  if (!dueReviews.length) {
    return ctx.reply('? ?? ???? ??????? ?????? ??????');
  }

  let message = '?? <b>??????? ??????</b>\n\n';
  dueReviews.slice(0, 5).forEach((v, i) => {
    message += `${i + 1}. ${v.surahName} (${v.fromAyah}-${v.toAyah})\n`;
  });
  await ctx.reply(message, { parse_mode: 'HTML' });
});

// --- DUA ACTIONS ---
bot.action(/dua:(morning|evening|protection|forgiveness|sustenance|sleep|food|travel)/, async (ctx) => {
  const DuaSystem = require('./features/duaSystem');
  const category = ctx.match[1];
  const collection = DuaSystem.getDuaCollection(category);
  if (!collection) return ctx.answerCbQuery('? ??? ?????');
  await ctx.reply(DuaSystem.formatDuaCollection(collection), { parse_mode: 'HTML' });
});

// --- LIBRARY ACTIONS ---
bot.action('library:tafsir', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const tafsir = await IslamicLibrary.getTafsir(1, 1, '??????');
  await ctx.reply(IslamicLibrary.formatLibraryContent('tafsir', tafsir), { parse_mode: 'HTML' });
});

bot.action('library:hadith', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const hadith = await IslamicLibrary.getHadith('all');
  await ctx.reply(IslamicLibrary.formatLibraryContent('hadith', hadith), { parse_mode: 'HTML' });
});

bot.action('library:fiqh', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const fiqh = await IslamicLibrary.getFiqhRuling('??????');
  await ctx.reply(IslamicLibrary.formatLibraryContent('fiqh', fiqh), { parse_mode: 'HTML' });
});

bot.action('library:stories', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const story = await IslamicLibrary.getQuranStory('????');
  await ctx.reply(IslamicLibrary.formatLibraryContent('story', story), { parse_mode: 'HTML' });
});

bot.action('library:sahabi', async (ctx) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const sahabi = await IslamicLibrary.getSahabiBiography('??? ???');
  await ctx.reply(IslamicLibrary.formatLibraryContent('sahabi', sahabi), { parse_mode: 'HTML' });
});

bot.action('library:awrad', (ctx) => CommandHandler.handleDua(ctx));

// --- TEAMS ACTIONS ---
bot.action('team:create', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'team_create' };
  await ctx.reply('?? ???? ??? ?????? ?????? (???????) ?????: ????? | ?????');
  await ctx.answerCbQuery('?');
});

bot.action('team:join', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.featureAwait = { type: 'team_join' };
  await ctx.reply('?? ???? ??? ?????? ????????:');
  await ctx.answerCbQuery('?');
});

bot.action('team:leaderboard', async (ctx) => {
  const TeamManager = require('./features/teamManager');
  const teams = await TeamManager.getTeamLeaderboard(10);
  await ctx.reply(TeamManager.formatTeamLeaderboard(teams), { parse_mode: 'HTML' });
});

bot.action('team:info', (ctx) => CommandHandler.handleTeams(ctx));

// --- ADMIN HANDLERS (??????? ????????? ????????) ---
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
    const userToBan = await User.findOne({ userId });

    if (!userToBan) {
      return ctx.answerCbQuery('? ?? ??? ?????? ??? ????????');
    }

    userToBan.banned = true;
    userToBan.bannedAt = new Date();
    userToBan.bannedReason = '?? ????? ?? ??? ???????';
    await userToBan.save();

    await ctx.answerCbQuery('? ?? ??? ???????? ?????');
    await ctx.editMessageText(`? <b>?? ??? ????????</b>\n\n?? ${userToBan.firstName}\n?? ${userId}`, 
      { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'settings:users')]]).reply_markup });
  } catch (error) {
    console.error('Ban error:', error);
    ctx.answerCbQuery('? ??? ???');
  }
});

bot.action(/admin:unban:(\d+)/, async (ctx) => {
  try {
    const userId = parseInt(ctx.match[1]);
    const userToUnban = await User.findOne({ userId });

    if (!userToUnban) {
      return ctx.answerCbQuery('? ?? ??? ?????? ??? ????????');
    }

    userToUnban.banned = false;
    userToUnban.bannedAt = null;
    userToUnban.bannedReason = null;
    await userToUnban.save();

    await ctx.answerCbQuery('? ?? ?????? ???????? ?????');
    await ctx.editMessageText(`? <b>?? ?????? ????????</b>\n\n?? ${userToUnban.firstName}\n?? ${userId}`, 
      { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'settings:users')]]).reply_markup });
  } catch (error) {
    console.error('Unban error:', error);
    ctx.answerCbQuery('? ??? ???');
  }
});

// --- BROADCAST HANDLER ---
bot.action('admin:broadcast', async (ctx) => {
  try {
    ctx.session = ctx.session || {};
    ctx.session.adminAwait = { type: 'broadcast' };
    await ctx.answerCbQuery('? ????');
    await ctx.reply('?? ???? ??????? ?????? ???? ????? ??????????:\n\n(???? /cancel ???????)');
  } catch (error) {
    console.error('Broadcast error:', error);
    ctx.answerCbQuery('? ??? ???');
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

// --- ADHKAR HANDLERS (????? ?????? ??????? ??????) ---
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
bot.action('game:quiz', (ctx) => GameHandler.handleQuiz(ctx));
bot.action(/game:quiz:(.+)/, (ctx) => {
  const answer = ctx.match[1];
  GameHandler.handleQuizAnswer(ctx, answer);
});

bot.action('game:dice', (ctx) => GameHandler.handleDice(ctx));
bot.action('game:luck', (ctx) => GameHandler.handleLuck(ctx));
bot.action('game:challenges', (ctx) => GameHandler.handleChallenges(ctx));

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
    await ctx.answerCbQuery('? ????');
    await ctx.reply('?? ???? ????? ???????? ???? ???? ??????? ??:\n\n(????: @username ?? ?????? ??????)');
  } catch (error) {
    console.error('Transfer error:', error);
    ctx.answerCbQuery('? ???');
  }
});

bot.action('eco:auction', async (ctx) => {
  try {
    const items = [
      '? ????? ???? - 500 ????',
      '?? ??? ???? - 1000 ????',
      '?? ????? ????? - 2000 ????',
      '??? ???? ??? - 750 ????',
      '? ????? ????? - 600 ????'
    ];
    
    const message = `?? <b>??? ??????</b>\n\n${items.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\n?? ???? ?????? ???????? ????`;
    
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard([[Markup.button.callback('?? ????', 'menu:economy')]]) });
    ctx.answerCbQuery('?');
  } catch (error) {
    console.error('Auction error:', error);
    ctx.answerCbQuery('? ???');
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
    const users = await User.find().sort({ xp: -1 }).limit(10);
    const user = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ xp: -1 });
    const userRank = allUsers.findIndex(u => u.userId === user.userId) + 1;

    let board = `?? **???? 10 ?? ??????**

?? ??????: ${userRank}/${allUsers.length}\n\n`;
    
    users.forEach((u, i) => {
      const medal = i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : `${i+1}.`;
      const userMark = u.userId === user.userId ? ' ??' : '';
      board += `${medal} ${u.firstName || '??????'} - ?${u.xp.toLocaleString()}${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('?? ???????', 'leaderboard:coins'),
        Markup.button.callback('??? ?????????', 'leaderboard:level')
      ],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]);
    await ctx.editMessageText(board, buttons);
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

bot.action('leaderboard:coins', async (ctx) => {
  try {
    const users = await User.find().sort({ coins: -1 }).limit(10);
    const user = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ coins: -1 });
    const userRank = allUsers.findIndex(u => u.userId === user.userId) + 1;

    let board = `?? **???? 10 ????????**

?? ??????: ${userRank}/${allUsers.length}\n\n`;
    
    users.forEach((u, i) => {
      const medal = i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : `${i+1}.`;
      const userMark = u.userId === user.userId ? ' ??' : '';
      board += `${medal} ${u.firstName || '??????'} - ??${u.coins.toLocaleString()}${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('? ??????', 'leaderboard:xp'),
        Markup.button.callback('??? ?????????', 'leaderboard:level')
      ],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]);
    await ctx.editMessageText(board, buttons);
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

bot.action('leaderboard:level', async (ctx) => {
  try {
    const users = await User.find().sort({ level: -1, xp: -1 }).limit(10);
    const user = await User.findOne({ userId: ctx.from.id });
    const allUsers = await User.find().sort({ level: -1, xp: -1 });
    const userRank = allUsers.findIndex(u => u.userId === user.userId) + 1;

    let board = `??? **???? 10 ?? ?????????**

?? ??????: ${userRank}/${allUsers.length}\n\n`;
    
    users.forEach((u, i) => {
      const medal = i === 0 ? '??' : i === 1 ? '??' : i === 2 ? '??' : `${i+1}.`;
      const userMark = u.userId === user.userId ? ' ??' : '';
      board += `${medal} ${u.firstName || '??????'} - ???${u.level} (?${u.xp.toLocaleString()})${userMark}\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('? ??????', 'leaderboard:xp'),
        Markup.button.callback('?? ???????', 'leaderboard:coins')
      ],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]);
    await ctx.editMessageText(board, buttons);
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

// --- SMART STATS & REWARDS HANDLERS ---
bot.action('stats:view', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('? ?? ??? ?????? ??? ????');
    }

    const statsMessage = Formatter.formatSmartStats(user);
    await ctx.editMessageText(statsMessage, Markup.inlineKeyboard([
      [Markup.button.callback('?? ?????? ???????', 'quests:daily')],
      [Markup.button.callback('?? ?????????', 'achievements:view')],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]));
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

// --- AI ACHIEVEMENTS & NOTIFICATIONS ---
bot.action('achievements:view', async (ctx) => {
  try {
    const achievements = await SmartNotifications.checkAchievements(ctx.from.id);
    let message = '?? <b>????????</b>\n\n';
    
    if (achievements.length > 0) {
      message += '<b>??????? ?????! ??</b>\n';
      const formatted = SmartNotifications.formatAchievements(achievements);
      message += formatted;
    } else {
      message += '?? ?? ???? ??????? ????? ??????\n';
      message += '?? ????? ?? ????? ???????? ???? ??????? ?????!';
    }

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '?? ????', callback_data: 'stats:view' }
        ]]
      }
    });
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ?????? ??? ?????????');
  }
});

bot.action('notification:check', async (ctx) => {
  try {
    const notification = await SmartNotifications.getSmartNotification(ctx.from.id, ctx);
    let message = '?? <b>???????? ??????</b>\n\n';
    
    if (notification) {
      message += SmartNotifications.formatNotification(notification);
    } else {
      message += '? ?? ???? ??????? ?????';
    }

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '?? ????', callback_data: 'menu:main' }
        ]]
      }
    });
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ?????? ??? ?????????');
  }
});

bot.action('behavior:analyze', async (ctx) => {
  try {
    const behavior = await LearningSystem.analyzeUserBehavior(ctx.from.id);
    let message = '?? <b>????? ?????</b>\n\n';
    
    message += `<b>????????:</b>\n${behavior.preferences.join(', ')}\n\n`;
    message += `<b>??????:</b> ${behavior.activityLevel}\n`;
    message += `<b>????????:</b> ${behavior.engagement}%\n\n`;
    message += `<b>???? ????:</b>\n${behavior.strengths.join(', ')}\n\n`;
    message += `<b>??????:</b>\n${behavior.weaknesses.join(', ')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '?? ????', callback_data: 'menu:main' }
        ]]
      }
    });
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

// --- SMART STATS & REWARDS HANDLERS ---
bot.action('stats:view', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) {
      return ctx.answerCbQuery('? ?? ??? ?????? ??? ????');
    }

    const statsMessage = Formatter.formatSmartStats(user);
    await ctx.editMessageText(statsMessage, Markup.inlineKeyboard([
      [Markup.button.callback('?? ?????? ???????', 'quests:daily')],
      [Markup.button.callback('?? ?????????', 'achievements:view')],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]));
  } catch (error) {
    ctx.answerCbQuery('? ??? ?? ???????');
  }
});

bot.action('rewards:daily', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    if (!user) return ctx.answerCbQuery('? ???');

    const lastDaily = new Date(user.lastDailyReward);
    const now = new Date();
    const hoursDiff = (now - lastDaily) / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
      const reward = 50;
      user.coins += reward;
      user.xp += 10;
      user.lastDailyReward = new Date();
      await user.save();
      
      await ctx.editMessageText(`?? **??????? ???????**

? ???? ???:
ï¿½ ?? ${reward} ????
ï¿½ ? 10 ????

?????? ???? ???? ???????? ???????!`, Markup.inlineKeyboard([
        [Markup.button.callback('?? ????', 'menu:main')]
      ]));
    } else {
      const hoursLeft = Math.ceil(24 - hoursDiff);
      await ctx.answerCbQuery(`? ?????? ?? ${hoursLeft} ????`);
    }
  } catch (error) {
    ctx.answerCbQuery('? ???');
  }
});

bot.action('achievements:view', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    const achievementsMsg = Formatter.formatAchievements(user);
    
    await ctx.editMessageText(achievementsMsg, Markup.inlineKeyboard([
      [Markup.button.callback('?? ??????????', 'stats:view')],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]));
  } catch (error) {
    ctx.answerCbQuery('? ???');
  }
});

bot.action('quests:daily', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id });
    const questsMsg = Formatter.formatDailyQuests(user);
    
    await ctx.editMessageText(questsMsg, Markup.inlineKeyboard([
      [Markup.button.callback('?? ???????', 'menu:games')],
      [Markup.button.callback('?? ??????', 'menu:khatma')],
      [Markup.button.callback('?? ????', 'menu:main')]
    ]));
  } catch (error) {
    ctx.answerCbQuery('? ???');
  }
});

// --- KHATMA ACTIONS ---
bot.action('khatma:add5', async (ctx) => {
  const user = await User.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage < 604) {
    const pagesToAdd = Math.min(5, 604 - user.khatmaProgress.currentPage);
    user.khatmaProgress.currentPage += pagesToAdd;
    user.khatmaProgress.percentComplete = Math.round((user.khatmaProgress.currentPage / 604) * 100);
    user.khatmaProgress.lastRead = new Date();
    user.xp += pagesToAdd * 2;
    await user.save();
    await ctx.answerCbQuery(`? ?? ????? ${pagesToAdd} ?????!`);
  }
  await MenuHandler.handleKhatmaMenu(ctx);
});

bot.action('khatma:addpage', async (ctx) => {
  const user = await User.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage < 604) {
    user.khatmaProgress.currentPage += 1;
    user.khatmaProgress.percentComplete = Math.round((user.khatmaProgress.currentPage / 604) * 100);
    user.khatmaProgress.lastRead = new Date();
    user.xp += 2;
    await user.save();
    await ctx.answerCbQuery('? ?? ????? ????! +2 ????');
  }
  await MenuHandler.handleKhatmaMenu(ctx);
});

bot.action('khatma:reset', async (ctx) => {
  const user = await User.findOne({ userId: ctx.from.id });
  if (user && user.khatmaProgress.currentPage >= 604) {
    user.khatmaProgress.currentPage = 1;
    user.khatmaProgress.percentComplete = 0;
    user.khatmaProgress.completionCount += 1;
    user.khatmaProgress.startDate = new Date();
    user.xp += 100;
    user.coins += 50;
    await user.save();
    await ctx.answerCbQuery('? ?????! ????? ??????! +100 ???? + 50 ????');
  } else {
    await ctx.answerCbQuery('? ?? ?????? ???!');
  }
});

// --- SMART CONTENT HANDLERS ---
bot.action('adhkar:favorite', async (ctx) => {
  await ctx.answerCbQuery('?? ?? ??? ????? ?? ???????!');
});

bot.action('quran:tafsir', async (ctx) => {
  await ctx.reply('?? ???????: ??? ??? ?????? ????? ????? ??? ??? ???? ?????...\n\n?? ???? ???? ?????');
});

bot.action('quran:save', async (ctx) => {
  await ctx.answerCbQuery('?? ?? ??? ????? ?? ???????!');
});

bot.action('quote:save', async (ctx) => {
  await ctx.answerCbQuery('?? ?? ??? ???????? ?? ???????!');
});

bot.action('quote:share', async (ctx) => {
  await ctx.answerCbQuery('?? ???? ??? ???????? ?? ???????!');
});

// --- KEYBOARD BUTTON HANDLERS ---
bot.hears('?? ??????', (ctx) => MenuHandler.handleKhatmaMenu(ctx));
bot.hears('?? ???????', (ctx) => MenuHandler.handleAdhkarMenu(ctx));
bot.hears('?? ??????', (ctx) => MenuHandler.handleQuranMenu(ctx));
bot.hears('?? ??????????', (ctx) => MenuHandler.handleQuotesMenu(ctx));
bot.hears('?? ?????', (ctx) => MenuHandler.handlePoetryMenu(ctx));
bot.hears('?? ???????', (ctx) => MenuHandler.handleGamesMenu(ctx));
bot.hears('?? ????????', (ctx) => MenuHandler.handleEconomyMenu(ctx));
bot.hears('?? ?????', (ctx) => MenuHandler.handleProfileMenu(ctx));
bot.hears('?? ?????????', (ctx) => MenuHandler.handleLeaderboardMenu(ctx));
bot.hears('?? ?????????', (ctx) => MenuHandler.handleSettingsMenu(ctx));
bot.hears('? ???????', (ctx) => CommandHandler.handleFeaturesMenu(ctx));
bot.hears('?? ???????', (ctx) => CommandHandler.handleLibrary(ctx));
bot.hears('?? ????????', (ctx) => CommandHandler.handleStats(ctx));
bot.hears('?? ????????', (ctx) => CommandHandler.handleRewards(ctx));
bot.hears('??? ??????', (ctx) => MenuHandler.handleShopMenu(ctx));
bot.hears('?? ????????? ?????????', (ctx) => MenuHandler.handleTransfersMenu(ctx));
bot.hears('?? ????????? ??????', (ctx) => MenuHandler.handleSmartNotificationsMenu(ctx));
bot.hears('?? ????? ??????', (ctx) => MenuHandler.handleLanguagesMenu(ctx));
bot.hears('?? ????? ??????????', (ctx) => MenuHandler.handleBackupsMenu(ctx));
bot.hears('? ??????? ??????', (ctx) => MenuHandler.handleCacheMenu(ctx));
bot.hears('??? ????? ?? ???????', (ctx) => MenuHandler.handleProtectionMenu(ctx));
bot.hears('? ????', (ctx) => ctx.deleteMessage().catch(() => ctx.reply('? ??')));

// --- OWNER KEYBOARD BUTTON HANDLERS ---
bot.hears('?? ???? ??????', async (ctx) => {
  const UIManager = require('./ui/keyboards');
  if (UIManager.isOwner(ctx.from.id)) {
    await CommandHandler.handleOwnerPanel(ctx);
  } else {
    ctx.reply('? ??? ????? ???? ?????? ???');
  }
});

// --- TEXT HANDLERS ---
bot.on('text', async (ctx) => {
  try {
    const message = ctx.message.text;

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
        const parts = message.split('|').map(p => p.trim());
        if (parts.length < 4) {
          return ctx.reply('? ???? ??? ?????. ????: 1|???????|1|7');
        }

        const surah = parseInt(parts[0], 10);
        const surahName = parts[1];
        const fromAyah = parseInt(parts[2], 10);
        const toAyah = parseInt(parts[3], 10);

        if (Number.isNaN(surah) || Number.isNaN(fromAyah) || Number.isNaN(toAyah)) {
          return ctx.reply('? ????? ?????? ??? ?????');
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
        const parts = message.split('|').map(p => p.trim());
        const name = parts[0];
        const description = parts[1] || '';
        if (!name) {
          return ctx.reply('? ?????? ????? ??? ??????');
        }
        const result = await TeamManager.createTeam(ctx.from.id, name, description);
        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }

      if (awaiting.type === 'team_join') {
        const TeamManager = require('./features/teamManager');
        const name = message.trim();
        if (!name) {
          return ctx.reply('? ?????? ????? ??? ??????');
        }
        const result = await TeamManager.joinTeam(ctx.from.id, name);
        return ctx.reply(result.message, { parse_mode: 'HTML' });
      }
    }

    // Handle admin awaiting input
    if (ctx.session && ctx.session.adminAwait) {
      const awaiting = ctx.session.adminAwait;

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
            return ctx.reply('? ?? ??? ?????? ??? ????????');
          }

          const userInfo = `?? <b>??????? ????????</b>\n\n` +
            `?? ?????: ${foundUser.firstName}\n` +
            `?? ID: ${foundUser.userId}\n` +
            `? ??????: ${foundUser.xp || 0}\n` +
            `??? ???????: ${foundUser.level || 1}\n` +
            `?? ???????: ${foundUser.coins || 0}\n` +
            `?? ????? ????????: ${new Date(foundUser.joinedAt).toLocaleDateString('ar')}`;

          const buttons = Markup.inlineKeyboard([
            [Markup.button.callback('?? ???', 'admin:ban:' + foundUser.userId)],
            [Markup.button.callback('? ??????', 'admin:unban:' + foundUser.userId)],
            [Markup.button.callback('?? ????', 'settings:users')]
          ]);

          return ctx.reply(userInfo, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
        }

        if (awaiting.type === 'broadcast') {
          // Handle broadcast message
          if (message.toLowerCase() === '/cancel') {
            ctx.session.adminAwait = null;
            return ctx.reply('? ?? ???????');
          }

          const allUsers = await User.find({ banned: false });
          let sent = 0;
          let failed = 0;

          await ctx.reply(`?? ???? ??????? ?? ${allUsers.length} ??????...`);

          const sendPromises = allUsers.map(user => {
            return ctx.telegram.sendMessage(user.userId, 
              `?? <b>????? ?? ???????</b>\n\n${message}`, 
              { parse_mode: 'HTML' }
            ).then(() => sent++)
              .catch(() => failed++);
          });

          await Promise.all(sendPromises);
          ctx.session.adminAwait = null;

          return ctx.reply(`? <b>?? ???????</b>\n\n? ???: ${sent}\n? ???: ${failed}`, { parse_mode: 'HTML' });
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
            return ctx.reply('? ?? ??? ?????? ??? ????????. ???? ??????? ????? ?????? ?? ????');
          }

          ctx.session.ecoAwait = { 
            type: 'transferAmount', 
            targetId: targetUser.userId, 
            targetName: targetUser.firstName || targetUser.username || `???????? ${targetUser.userId}`
          };
          
          const senderCoins = (await User.findOne({ userId: ctx.from.id })).coins || 0;
          return ctx.reply(`?? ?? ???? ???? ??????? ?? ${targetUser.firstName || targetUser.username}?\n\n(?????: ${senderCoins} ????)`);
        }

        if (awaiting.type === 'transferAmount') {
          // Handle transfer amount input
          const amount = parseInt(message.trim());
          const sender = await User.findOne({ userId: ctx.from.id });
          const receiver = await User.findOne({ userId: awaiting.targetId });

          if (isNaN(amount) || amount <= 0) {
            return ctx.reply('? ?????? ??? ????. ???? ????? ??????');
          }

          if (!sender || (sender.coins || 0) < amount) {
            ctx.session.ecoAwait = null;
            return ctx.reply('? ????? ??? ????');
          }

          if (!receiver) {
            ctx.session.ecoAwait = null;
            return ctx.reply('? ???????? ???????? ??? ?????');
          }

          if (sender.userId === receiver.userId) {
            ctx.session.ecoAwait = null;
            return ctx.reply('? ?? ????? ??????? ?????');
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
            reason: `????? ?? ${awaiting.targetName}`,
            relatedUserId: receiver.userId,
            status: 'completed'
          });

          ctx.session.ecoAwait = null;
          
          // Notify sender
          await ctx.reply(
            `? <b>?? ??????? ?????!</b>\n\n` +
            `?? ???? ${amount} ???? ?? ${awaiting.targetName}\n` +
            `?? ????? ??????: ${sender.coins} ????`,
            { parse_mode: 'HTML' }
          );
          
          // Try to notify receiver
          try {
            await ctx.telegram.sendMessage(
              receiver.userId,
              `? <b>????? ?????!</b>\n\n` +
              `?? ??????? ${amount} ???? ?? ${sender.firstName || '??????'}\n` +
              `?? ????? ??????: ${receiver.coins} ????`,
              { parse_mode: 'HTML' }
            );
          } catch (notifyError) {
            logger.warn('Could not notify receiver:', notifyError.message);
          }
        }
      } catch (err) {
        console.error('Error handling ecoAwait input:', err);
        ctx.session.ecoAwait = null;
        return ctx.reply('? ??? ??? ????? ????????');
      }
    }

    // Handle owner awaiting input
    if (ctx.session && ctx.session.ownerAwait) {
      const awaiting = ctx.session.ownerAwait;
      const UIManager = require('./ui/keyboards');

      if (!UIManager.isOwner(ctx.from.id)) {
        ctx.session.ownerAwait = null;
        return ctx.reply('? ??? ????');
      }

      try {
        if (awaiting.type === 'broadcast') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('? ?? ???????');
          }

          const allUsers = await User.find({ banned: false });
          let sent = 0;
          let failed = 0;

          await ctx.reply(`?? ???? ??????? ?? ${allUsers.length} ??????...`);

          for (const user of allUsers) {
            try {
              await ctx.telegram.sendMessage(user.userId, 
                `?? <b>????? ?? ??????</b>\n\n${message}`, 
                { parse_mode: 'HTML' }
              );
              sent++;
            } catch (e) {
              failed++;
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(
            `? <b>?? ???????</b>\n\n? ???: ${sent}\n? ???: ${failed}`, 
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'givecoins') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('? ?? ???????');
          }

          const parts = message.trim().split(/\s+/);
          if (parts.length !== 2) {
            return ctx.reply('? ?????? ??? ?????\n????: ID ??????\n????: 123456789 1000');
          }

          const userId = parseInt(parts[0]);
          const amount = parseInt(parts[1]);

          if (isNaN(userId) || isNaN(amount) || amount <= 0) {
            return ctx.reply('? ????? ??? ?????');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('? ?? ??? ?????? ??? ????????');
          }

          targetUser.coins += amount;
          targetUser.totalEarnings += amount;
          await targetUser.save();

          ctx.session.ownerAwait = null;
          
          // Notify the user
          try {
            await ctx.telegram.sendMessage(userId, 
              `?? <b>?????? ?? ??????!</b>\n\n` +
              `????? ${amount} ???? ?? ???? ?????!\n` +
              `????? ??????: ${targetUser.coins} ????`, 
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            // User blocked bot
          }

          return ctx.reply(
            `? <b>?? ?????</b>\n\n` +
            `????????: ${targetUser.firstName}\n` +
            `??????: ${amount} ????\n` +
            `?????? ??????: ${targetUser.coins} ????`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'rewardall') {
          if (message.toLowerCase() === '/cancel') {
            ctx.session.ownerAwait = null;
            return ctx.reply('? ?? ???????');
          }

          const amount = parseInt(message.trim());
          if (isNaN(amount) || amount <= 0) {
            return ctx.reply('? ?????? ??? ????');
          }

          const allUsers = await User.find({ banned: false });
          let updated = 0;

          await ctx.reply(`? ???? ????? ${amount} ???? ?? ${allUsers.length} ??????...`);

          for (const user of allUsers) {
            user.coins += amount;
            user.totalEarnings += amount;
            await user.save();
            updated++;

            // Notify user
            try {
              await ctx.telegram.sendMessage(user.userId, 
                `?? <b>?????? ??????!</b>\n\n` +
                `????? ${amount} ???? ?? ???? ?????!\n` +
                `????? ??????: ${user.coins} ????`, 
                { parse_mode: 'HTML' }
              );
            } catch (e) {
              // User blocked bot
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(
            `? <b>?? ???????</b>\n\n` +
            `??? ??????????: ${updated}\n` +
            `?????? ??? ??????: ${amount} ????\n` +
            `??????? ?????: ${updated * amount} ????`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (err) {
        console.error('Error handling ownerAwait input:', err);
        ctx.session.ownerAwait = null;
        return ctx.reply('? ??? ??? ????? ????????');
      }
    }

    // Handle awaiting khatma settings input (time / timezone)
    if (ctx.session && ctx.session.khatmaAwait) {
      const awaiting = ctx.session.khatmaAwait;
      try {
        const user = await User.findOne({ userId: ctx.from.id });
        if (!user) return ctx.reply('? ?? ??? ?????? ??? ????');

        if (awaiting.type === 'notifyTime') {
          const m = message.trim();
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(m)) {
            return ctx.reply('? ?????? ??? ?????. ?????? ????? HH:MM ??? 08:30');
          }
          user.preferences = user.preferences || {};
          user.preferences.khatmaSettings = user.preferences.khatmaSettings || {};
          user.preferences.khatmaSettings.notifyTime = m;
          await user.save();
          ctx.session.khatmaAwait = null;
          return ctx.reply(`? ?? ??? ??? ???????: ${m}`);
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
            return ctx.reply(`? ?? ??? ??????? ???????: ${tz}`);
          } catch (e) {
            return ctx.reply('? ??????? ??????? ??? ?????. ???? ???: Asia/Riyadh ?? UTC');
          }
        }
      } catch (err) {
        console.error('Error handling khatmaAwait input:', err);
        ctx.session.khatmaAwait = null;
        return ctx.reply('? ??? ??? ????? ??? ???????');
      }
    }

    // Smart keyword detection
    if (message.includes('????') || message.includes('dashboard')) {
      const dashboard = await IntegratedAI.generateSmartDashboard(ctx.from.id);
      const formatted = IntegratedAI.formatSmartDashboard(dashboard);
      return ctx.reply(formatted, { parse_mode: 'HTML' });
    }

    if (message.includes('?????') || message.includes('achievement')) {
      const achievements = await SmartNotifications.checkAchievements(ctx.from.id);
      let response = '?? <b>????????</b>\n\n';
      if (achievements.length > 0) {
        response += SmartNotifications.formatAchievements(achievements);
      } else {
        response += '?? ?? ???? ??????? ????? ??????';
      }
      return ctx.reply(response, { parse_mode: 'HTML' });
    }

    if (message.includes('?????') || message.includes('analytics')) {
      const report = await AnalyticsEngine.generateUserReport(ctx.from.id);
      const formatted = AnalyticsEngine.formatReport(report);
      return ctx.reply(formatted, { parse_mode: 'HTML' });
    }

    if (message.includes('?????') || message.includes('coaching')) {
      const coaching = await IntegratedAI.generateCoachingMessage(ctx.from.id);
      return ctx.reply(coaching, { parse_mode: 'HTML' });
    }

    if (message.includes('?????') || message.includes('motivation')) {
      const user = await User.findOne({ userId: ctx.from.id });
      if (user) {
        const motivation = IntegratedAI.generateMotivation(user);
        return ctx.reply(motivation, { parse_mode: 'HTML' });
      }
    }

    // Check if it's a game input
    if (ctx.session && ctx.session.gameState && ctx.session.gameState.game === 'guess') {
      const guess = parseInt(message);
      const number = ctx.session.gameState.number;

      if (isNaN(guess)) {
        return ctx.reply('? ??? ???? ?? ????');
      }

      ctx.session.gameState.attempts++;

      if (guess === number) {
        ctx.reply(`?? ????! ${number}\n? 200 ????!`);
        EconomyManager.addCoins(ctx.from.id, 200, '???? ?????');
        ctx.session.gameState = null;
      } else if (guess < number) {
        ctx.reply(`?? ???? ?? ${guess}`);
      } else {
        ctx.reply(`?? ??? ?? ${guess}`);
      }

      if (ctx.session.gameState && ctx.session.gameState.attempts > 10) {
        ctx.reply(`? ????? ?????????! ${number}`);
        ctx.session.gameState = null;
      }
    } else {
      // Use AI for smart responses
      const aiResponse = await AIManager.generateSmartResponse(ctx.from.id, message);
      ctx.reply(aiResponse, { parse_mode: 'HTML' });

      // Record user interaction and update streak
      AIManager.recordUserInteraction(ctx.from.id, 'message:sent', 1);
      await LearningSystem.updateUserStreak(ctx.from.id);

      // Check for notifications
      const notification = await SmartNotifications.getSmartNotification(ctx.from.id, ctx);
      if (notification && Math.random() < 0.3) {
        // 30% chance to show notification
        setTimeout(() => {
          ctx.reply(SmartNotifications.formatNotification(notification), { parse_mode: 'HTML' });
        }, 2000);
      }
    }
  } catch (error) {
    console.error('Text handler error:', error);
    ctx.reply('? ??? ???? ???? ????????...');
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
      logger.info('?? ???? ??? ??? Telegram...');

      // Delete any existing webhook to prevent conflicts
      bot.telegram.deleteWebhook({ drop_pending_updates: true })
        .then(() => {
          logger.info('? ?? ?????? ?? ??? ??? Webhook');
        })
        .catch((webhookError) => {
          logger.warn('?? ??? ?? ??? ??? Webhook:', webhookError.message);
        });

      // Launch bot
      bot.launch()
        .then(() => {
          reconnectManager.isConnected = true;
          logger.info('? ?? ????? ????? ?????!');
          logger.info('? ????? ???? ????!');
          logger.info('?? ????? ????? ? ????? ???????...');
          resolve(true);
        })
        .catch((error) => {
          logger.error('? ??? ?? ??? ?????:', error.message);
          reconnectManager.isConnected = false;

          // Handle 409 Conflict error (another bot instance running)
          if (error.response && error.response.error_code === 409) {
            logger.warn('?? ??? 409: ???? ???? ???? ?? ????? ???? ??????...');
            logger.warn('? ?????? ????? ??????? ???? 5 ?????...');
            reject(error); // Will trigger retry in startBot
          } else {
            logger.error('? ??? ??? ?????:', error.message);
            reject(error);
          }
        });
    } catch (error) {
      logger.error('? ??? ?? ?????? ??? ?????:', error.message);
      reconnectManager.isConnected = false;
      reject(error);
    }
  });
};

async function startBot() {
  try {
    // Give any previous instance time to fully shutdown (Railway cold start delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Connect to database
    logger.info('?? ???? ??????? ?? MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/arab-bot';

    // ?????? ??????? ?? MongoDB ?? ????? ??????
    await reconnectManager.connect(async () => {
      await Database.connect(mongoUri);
      logger.info('? ?? ??????? ?? MongoDB ?????!');
    });

    // Start bot with intelligent retry logic
    logger.info('?? ???? ??? ?????...');

    let botStarted = false;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelays = [3000, 5000, 7000, 10000, 15000]; // Increasing delays

    while (retryCount < maxRetries && !botStarted) {
      try {
        // Wait before trying to start (gives previous instance time to shutdown)
        if (retryCount > 0) {
          const delayMs = retryDelays[retryCount - 1];
          logger.info(`? ?????? #${retryCount + 1}/${maxRetries} ??? ${delayMs / 1000} ?????...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        await botStart();
        botStarted = true;
        logger.info('? ????? ????!');
      } catch (error) {
        retryCount++;

        // Check if it's a 409 error (another instance running)
        if (error.response && error.response.error_code === 409) {
          logger.warn(`?? ?????? #${retryCount}/${maxRetries} - ??? 409 (???? ???? ????)`);

          if (retryCount >= maxRetries) {
            logger.error('? ?? ????? ??? ?????????. ???? ??????? ?????? ??????? ?????? ???????.');
            process.exit(1);
          }
        } else {
          logger.error(`? ??? ?? ?????? #${retryCount}: ${error.message}`);
          if (retryCount >= maxRetries) {
            logger.error('? ?? ????? ??? ?????????.');
            throw error;
          }
        }
      }
    }

    // ??? ?????? ??? ???????
    await reconnectManager.startHealthCheck(
      async () => {
        // ??? ?? ????? ?? ???? ????
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
        logger.warn('?? ????? ??? ?????');
      }
    );

    // ?????? ????? ????????
    connectionMonitor.startMonitoring((isOnline) => {
      if (isOnline) {
        logger.info('?? ??? ????? ????????!');
        healthMonitor.updateStats({ reconnectAttempts: healthMonitor.stats.reconnectAttempts + 1 });
        // ???? ????? ??????? ??? ??? ????? ????
        if (!reconnectManager.isConnected) {
          botStart();
        }
      } else {
        logger.warn('?? ????? ????? ????????');
        reconnectManager.isConnected = false;
      }
    });

    // ??? ?????? ??? ????? ??????
    healthMonitor.startPeriodicCheck(60000); // ??? ?? ?????

    logger.info('? ????? ???? ????!');
    logger.info(`?? ????? ????? ? ????? ???????...`);

    // Initialize New Systems
    logger.info('?? ???? ????? ??????? ???????...');

    try {
      // Initialize Notification System
      const NotificationSystem = require('./features/notificationSystem');
      const notificationSystem = new NotificationSystem(bot);
      notificationSystem.initialize();
      logger.info('? ???? ????????? ?????? ????');

      // Initialize Backup System
      const BackupSystem = require('./utils/backupSystem');
      const backupSystem = new BackupSystem();
      backupSystem.scheduleAutomaticBackups();
      logger.info('? ???? ????? ?????????? ????');

      // Initialize Cache Manager
      const CacheManager = require('./utils/cacheManager');
      global.cache = new CacheManager(600);
      logger.info('? ???? ??????? ?????? ????');

      // Initialize Rate Limiter
      const RateLimiter = require('./utils/rateLimiter');
      global.rateLimiter = new RateLimiter();
      logger.info('? ???? ??????? ?? ??????? ????');

      // Initialize Language Manager
      const LanguageManager = require('./utils/languageManager');
      global.languageManager = new LanguageManager();
      logger.info('? ???? ?????? ???????? ????');

      logger.info('? ???? ??????? ??????? ?????!');
    } catch (error) {
      logger.error('?? ??? ?? ????? ??? ???????:', error.message);
    }


    // Start Khatma scheduler (sends notifications to opted-in users)

    let khatmaScheduler = null;

    try {

      const KhatmaScheduler = require('./utils/khatmaScheduler');

      khatmaScheduler = new KhatmaScheduler({ intervalMs: 1000 * 60 * 15 }, bot);

      khatmaScheduler.start();

      logger.info('?? KhatmaScheduler started ï¿½ notifying opted-in users');

    } catch (err) {

      logger.error('? Failed to start KhatmaScheduler:', err.message);

    }

    // Graceful shutdown with timeout
    const gracefulShutdown = (signal) => {
      logger.info(`?? ???? ????? ?????... (${signal})`);

      // Set a timeout to force exit if shutdown takes too long
      const shutdownTimeout = setTimeout(() => {
        logger.error('?? ????? ???? ???????? ????? ????...');
        process.exit(1);
      }, 10000); // 10 second timeout

      // Stop all services
      try {
        if (khatmaScheduler) {
          khatmaScheduler.stop();
          logger.info('? ?? ????? KhatmaScheduler');
        }
        if (reconnectManager) {
          reconnectManager.stop();
          logger.info('? ?? ????? ReconnectManager');
        }
        if (connectionMonitor) {
          connectionMonitor.stopMonitoring();
          logger.info('? ?? ????? ConnectionMonitor');
        }
        if (healthMonitor) {
          healthMonitor.stopPeriodicCheck();
          logger.info('? ?? ????? HealthMonitor');
        }
      } catch (error) {
        logger.error('??? ????? ????? ???????:', error.message);
      }

      // Stop bot
      try {
        bot.stop(signal);
        logger.info('? ?? ????? ?????');
        clearTimeout(shutdownTimeout);
        process.exit(0);
      } catch (error) {
        logger.error('??? ?? ????? ?????:', error.message);
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

    // ?????? ????? ??? ??????
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('? Promise Rejection ??? ?????:', reason);
      logger.error('?? Stack:', reason instanceof Error ? reason.stack : reason);
      healthMonitor.logError();
    });

    process.on('uncaughtException', (error) => {
      logger.error('? ??????? ??? ?????:', error.message);
      logger.error('?? Stack:', error.stack);
      healthMonitor.logError();
      // ?? ???? ???????? ?? ??????? ?????? ?? ????? ???????
      if (process.env.NODE_ENV === 'production') {
        logger.error('?? ????? ??????. ??????? ????? ?????? ????????...');
        if (!isShuttingDown) {
          isShuttingDown = true;
          gracefulShutdown('UNCAUGHT_EXCEPTION');
        }
      }
    });

  } catch (error) {
    logger.error('? ??? ?? ??? ?????:', error.message);
    logger.info('? ?????? ????? ??????? ?????? ???? 10 ?????...');
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
  logger.info(`?? HTTP Server running on port ${PORT}`);
});

// Start the bot
startBot();

module.exports = bot;
