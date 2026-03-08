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
const NewGamesHandler = require('./commands/newGamesHandler');
const GroupAdminHandler = require('./commands/groupAdminHandler');
const GroupGamesHandler = require('./commands/groupGamesHandler');
const WhisperHandler = require('./commands/whisperHandler');
const QuranicGamesHandler = require('./commands/quranicGamesHandler');
const BankGameHandler = require('./commands/bankGameHandler');
const TournamentChallengeHandler = require('./commands/tournamentChallengeHandler');
const EconomyHandler = require('./commands/economyHandler');
const ContentHandler = require('./commands/contentHandler');
const ProfileHandler = require('./commands/profileHandler');
const ChatGamesUtilityHandler = require('./commands/chatGamesUtilityHandler');
const SponsoredAdsSystem = require('./features/sponsoredAdsSystem');
const { logger } = require('./utils/helpers');
const ReconnectManager = require('./utils/reconnect');
const connectionMonitor = require('./utils/connectionMonitor');
const healthMonitor = require('./utils/healthMonitor');
const Formatter = require('./utils/formatter');
const { User } = require('./database/models');

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

const trackUserIdentity = async (ctx) => {
  const from = ctx?.from;
  if (!from?.id) return;

  const nextFirstName = String(from.first_name || '').trim();
  const nextUsername = String(from.username || '').trim();
  const user = await User.findOne({ userId: Number(from.id) });

  if (!user) {
    await User.create({
      userId: Number(from.id),
      firstName: nextFirstName || nextUsername || `user_${from.id}`,
      username: nextUsername,
      joinDate: new Date(),
      lastActive: new Date(),
      nameHistory: []
    }).catch(() => {});
    return;
  }

  const currentFirstName = String(user.firstName || '').trim();
  const currentUsername = String(user.username || '').trim();
  const changed = currentFirstName !== nextFirstName || currentUsername !== nextUsername;
  user.nameHistory = Array.isArray(user.nameHistory) ? user.nameHistory : [];

  if (changed && (currentFirstName || currentUsername)) {
    const alreadyStored = user.nameHistory.some((entry) =>
      String(entry?.firstName || '').trim() === currentFirstName &&
      String(entry?.username || '').trim() === currentUsername
    );
    if (!alreadyStored) {
      user.nameHistory.unshift({
        firstName: currentFirstName,
        username: currentUsername,
        changedAt: new Date()
      });
      user.nameHistory = user.nameHistory.slice(0, 10);
    }
  }

  user.firstName = nextFirstName || currentFirstName || nextUsername || `user_${from.id}`;
  user.username = nextUsername;
  user.lastActive = new Date();
  await user.save().catch(() => {});
};

const parseOwnerIds = () =>
  String(process.env.BOT_OWNERS || '')
    .split(',')
    .map((id) => String(id).trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));

const requiredEnvVars = ['BOT_TOKEN'];
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
if (isMissingRequiredEnv(process.env.GEMINI_API_KEY)) {
  logger.warn('⚠️ GEMINI_API_KEY غير موجود: دردشة جو وتوليد الصور عبر Gemini لن يعملا حتى تضيف المفتاح.');
}

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
    allowedUpdates: ['message', 'edited_message', 'callback_query', 'inline_query', 'poll_answer', 'chat_member']
  }
});

// Initialize session middleware
bot.use(session());
bot.use(async (ctx, next) => {
  await trackUserIdentity(ctx);
  return next();
});
GroupGamesHandler.setup(bot);
TournamentChallengeHandler.setup(bot);

const PRIVATE_ONLY_COMMANDS = new Set([
  'khatma', 'adhkar', 'quran', 'quotes', 'poetry', 'games', 'economy', 'stats', 'rewards',
  'image', 'shop', 'transfer', 'notifications', 'notif', 'backup', 'qgames', 'profile',
  'balance', 'leaderboard', 'daily', 'features', 'goals', 'charity', 'memorization', 'dua',
  'referral', 'events', 'teams', 'owner', 'panel', 'owners', 'myid', 'health', 'givecoins'
]);

const GROUP_ONLY_COMMANDS = new Set([
  'gpanel', 'ghelp', 'gsettings', 'gwarn', 'gwarns', 'gunwarn', 'gresetwarn',
  'gmute', 'gunmute', 'gban', 'gunban', 'gclear', 'glogs', 'gpolicy', 'gprotect',
  'gadminstats', 'gprint', 'greasons', 'gbasic', 'gexceptions', 'granks', 'gdetect', 'gonline', 'gadminleave',
  'gtemplate_member', 'gtemplate_admin', 'gideal_member', 'gideal_admin', 'gshow_ideal_member', 'gshow_ideal_admin', 'gwelcome', 'gsuggest',
  'gfaq', 'gsuggestmenu', 'gsuggeststats', 'gsuggesttop', 'gquiz', 'gmath', 'gword', 'gdaily', 'gmcq', 'gvote', 'gquizset', 'gleader', 'gweekly', 'ggame', 'ggames',
  'g', 'gteam', 'gteams', 'gtour', 'gwho', 'griddle', 'gtype', 'chance', 'gduel', 'gstore', 'gbuy', 'ggifts', 'ggift', 'gassets', 'gwealth', 'gprofile', 'ginvest', 'gluck', 'gluckstats', 'gmonth', 'gmonthly', 'gbonus', 'glevels', 'glounge',
  'gcafework', 'gcafereq', 'gcafedeliver', 'gmood', 'gtopcafe', 'gtophookah', 'gtopsmoke', 'ghookahsession',
  'gcastle', 'gmycastle', 'gresstore', 'gbuyres', 'gmyres', 'gupcastle', 'gbarracks', 'gbuyarmy', 'guparmy', 'gtreasure', 'gshield', 'gmyshield', 'gwar', 'garena', 'gfighters', 'grulers', 'gally', 'gallyreq',
  'gconfess', 'gconfessend',
  'gbuygift', 'gsellgift', 'gscratch', 'gscratchstats', 'ggrantmoney', 'gtakemoney', 'whisper'
]);

const PRIVATE_REPLY_BUTTONS = new Set([
  '🕌 الختمة', '📿 الأذكار', '📖 القرآن', '💭 الاقتباسات', '✍️ الشعر', '🎮 الألعاب',
  '💰 الاقتصاد', '👤 حسابي', '🏆 المتصدرين', '⚙️ الإعدادات', '✨ الميزات', '📚 المكتبة',
  '📊 إحصائيات', '🎁 المكافآت', '🛍️ المتجر', '💸 التحويلات والتبرعات', '🔔 الإشعارات الذكية',
  '📁 النسخ الاحتياطية', '⚡ التخزين المؤقت', '🛡️ حماية من الإساءة', '🎨 توليد صورة', '🌤️ الطقس', '🕌 الأذان', '👑 لوحة المالك'
]);

bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  const isPrivate = chatType === 'private';
  const isGroup = chatType === 'group' || chatType === 'supergroup';

  if (
    isGroup &&
    ctx.callbackQuery?.data &&
    !ctx.callbackQuery.data.startsWith('group:') &&
    !ctx.callbackQuery.data.startsWith('bank:create:') &&
    !ctx.callbackQuery.data.startsWith('xo:')
  ) {
    await ctx.answerCbQuery('هذا الزر مخصص للمحادثة الخاصة.', { show_alert: false }).catch(() => {});
    return;
  }

  if (isPrivate && ctx.callbackQuery?.data?.startsWith('group:')) {
    await ctx.answerCbQuery('هذا الزر مخصص للجروبات.', { show_alert: false }).catch(() => {});
    return;
  }

  const text = ctx.message?.text?.trim();
  if (isGroup && text && PRIVATE_REPLY_BUTTONS.has(text)) {
    await ctx.reply('ℹ️ هذه القائمة مخصصة للمحادثة الخاصة مع البوت.');
    return;
  }

  if (text && text.startsWith('/')) {
    const commandName = text.slice(1).split(/\s+/)[0].split('@')[0].toLowerCase();

    if (isGroup && PRIVATE_ONLY_COMMANDS.has(commandName)) {
      await ctx.reply('ℹ️ هذا الأمر مخصص للمحادثة الخاصة مع البوت.');
      return;
    }

    if (isPrivate && GROUP_ONLY_COMMANDS.has(commandName)) {
      await ctx.reply('ℹ️ هذا الأمر مخصص للجروبات.');
      return;
    }
  }

  return next();
});

// Auto-reply commands to the same user message in groups.
bot.use(async (ctx, next) => {
  const chatType = ctx.chat?.type;
  const isGroup = chatType === 'group' || chatType === 'supergroup';
  const text = String(ctx.message?.text || '').trim();
  const messageId = Number(ctx.message?.message_id || 0);

  const isCommandLike = Boolean(
    isGroup &&
    messageId > 0 &&
    text &&
    (
      text.startsWith('/') ||
      /^(الاوامر|مساعدة|ساعدني|الالعاب|الألعاب|العاب الجروب|الرتب|رتبتي|فحص|رفع|تنزيل|كتم|الغاء|إلغاء|فك|حظر|تقييد|تفعيل|تعطيل|اعدادات|إعدادات|شراء|بيع|اهداء|إهداء|متجر|هدايا|ممتلكاتي|حسابي|راتب|بخشيش|العجلة|حظ|استثمار|سعر الاسهم|ديني|علمي|تاريخي|فقهي|جغرافي|فيزياء|فيزيائي|حسابات|حسابي|لاونج|كافيتيريا|اشرب|اكل|كول|البس|همسه|همسة|all)\b/i.test(text)
    )
  );

  if (isCommandLike) {
    const patchReplyMethod = (methodName) => {
      const original = ctx[methodName];
      if (typeof original !== 'function') return;
      ctx[methodName] = (...args) => {
        if (!args.length) return original.apply(ctx, args);
        const lastArg = args[args.length - 1];
        const hasOptionsObject = lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg);
        const options = hasOptionsObject ? lastArg : {};
        if (!options.reply_to_message_id) options.reply_to_message_id = messageId;
        if (!hasOptionsObject) args.push(options);
        return original.apply(ctx, args);
      };
    };

    [
      'reply',
      'replyWithPhoto',
      'replyWithVideo',
      'replyWithAnimation',
      'replyWithDocument',
      'replyWithAudio',
      'replyWithVoice',
      'replyWithSticker'
    ].forEach(patchReplyMethod);
  }

  return next();
});

bot.use(async (ctx, next) => {
  await next();
  await SponsoredAdsSystem.maybeShowAd(ctx);
});


// --- SET BOT COMMANDS MENU ---
Promise.all([
  bot.telegram.setMyCommands(
    [
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
    ],
    { scope: { type: 'all_private_chats' } }
  ),
  bot.telegram.setMyCommands(
    [
      { command: 'start', description: 'بدء نظام الجروب' },
      { command: 'gpanel', description: 'لوحة إدارة الجروب' },
      { command: 'ghelp', description: 'مساعدة أوامر الجروب' },
      { command: 'gwarn', description: 'تحذير عضو (بالرد)' },
      { command: 'gwarns', description: 'عرض تحذيرات عضو (بالرد)' },
      { command: 'gunwarn', description: 'إزالة تحذير (بالرد)' },
      { command: 'gresetwarn', description: 'تصفير التحذيرات (بالرد)' },
      { command: 'gpolicy', description: 'سياسة العقوبات التلقائية' },
      { command: 'gmute', description: 'كتم عضو بالدقائق (بالرد)' },
      { command: 'gunmute', description: 'فك كتم عضو (بالرد)' },
      { command: 'gban', description: 'حظر عضو (بالرد)' },
      { command: 'gunban', description: 'رفع حظر عضو (ID)' },
      { command: 'gclear', description: 'حذف رسالة (بالرد)' },
      { command: 'glogs', description: 'عرض سجل الإدارة' },
      { command: 'gadminstats', description: 'تقرير تفاعل مشرف' },
      { command: 'gprotect', description: 'إعدادات الحماية السريعة' },
      { command: 'gfaq', description: 'إدارة الردود التلقائية' },
      { command: 'gprint', description: 'برنت سجل عضو' },
      { command: 'greasons', description: 'تفعيل/تعطيل الأسباب' },
      { command: 'gbasic', description: 'إدارة رتبة الأساسي' },
      { command: 'gexceptions', description: 'إدارة الاستثناءات' },
      { command: 'granks', description: 'عدد الرتب' },
      { command: 'gdetect', description: 'تفعيل/تعطيل الكشف' },
      { command: 'gonline', description: 'قفل/فتح الانلاين' },
      { command: 'gadminleave', description: 'تنبيه مغادرة المشرفين' },
      { command: 'gwelcome', description: 'إعداد رسالة الترحيب' },
      { command: 'gsuggest', description: 'نظام الاقتراحات' },
      { command: 'g', description: 'القائمة السريعة' },
      { command: 'gquiz', description: 'سؤال سريع للجروب' },
      { command: 'gmath', description: 'تحدي حساب ذهني' },
      { command: 'gword', description: 'ترتيب كلمة' },
      { command: 'gdaily', description: 'التحدي اليومي' },
      { command: 'gmcq', description: 'سؤال اختيارات' },
      { command: 'gvote', description: 'تصويت تفاعلي' },
      { command: 'gconfess', description: 'بدء كرسي الاعتراف (بالرد)' },
      { command: 'gconfessend', description: 'إنهاء كرسي الاعتراف' },
      { command: 'gquizset', description: 'سلسلة QuizBot' },
      { command: 'gleader', description: 'متصدرين الجروب' },
      { command: 'gweekly', description: 'متصدرين الأسبوع' },
      { command: 'ggame', description: 'إعدادات ألعاب الجروب' },
      { command: 'gwho', description: 'لعبة مين أنا' },
      { command: 'griddle', description: 'ألغاز ذكية' },
      { command: 'gtype', description: 'سرعة الكتابة' },
      { command: 'chance', description: 'روليت الأوامر' },
      { command: 'gduel', description: 'تحدي عضوين' },
      { command: 'gstore', description: 'متجر الجروب' },
      { command: 'gbuy', description: 'شراء عنصر من المتجر' },
      { command: 'ggifts', description: 'قائمة الهدايا' },
      { command: 'ggift', description: 'إهداء هدية' },
      { command: 'gbuygift', description: 'شراء هدية لنفسك' },
      { command: 'gsellgift', description: 'بيع هدية من ممتلكاتك' },
      { command: 'gscratch', description: 'كشط بطاقات ربح' },
      { command: 'gscratchstats', description: 'إحصائيات الكشط' },
      { command: 'gassets', description: 'ممتلكاتك في الجروب' },
      { command: 'gwealth', description: 'لوحة أغنى ممتلكات' },
      { command: 'gprofile', description: 'ملفك في الجروب' },
      { command: 'whisper', description: 'همسة خاصة بعضو' },
      { command: 'ggrantmoney', description: 'منح فلوس (للمالك)' },
      { command: 'gtakemoney', description: 'سحب فلوس (للمالك)' },
      { command: 'ginvest', description: 'استثمار فلوس الجروب' },
      { command: 'gluck', description: 'الحظ (اختر رقم 1-1000)' },
      { command: 'gluckstats', description: 'إحصائيات الحظ' },
      { command: 'glevels', description: 'لوحة المستويات' },
      { command: 'gmonth', description: 'متصدرين الشهر' },
      { command: 'gmonthly', description: 'صرف مكافأة شهرية' },
      { command: 'gbonus', description: 'ضبط مكافآت الترقية' },
      { command: 'glounge', description: 'لاونج الجروب (دخان/أرجيلة)' },
      { command: 'gcafework', description: 'عمل بالكافيتيريا' },
      { command: 'gcafereq', description: 'فتح طلب كافيتيريا' },
      { command: 'gmood', description: 'مزاجك الحالي' },
      { command: 'gcastle', description: 'إنشاء قلعة' },
      { command: 'gmycastle', description: 'تفاصيل قلعتي' },
      { command: 'gresstore', description: 'متجر الموارد' },
      { command: 'gbuyres', description: 'شراء موارد القلعة' },
      { command: 'gmyres', description: 'مواردي' },
      { command: 'gupcastle', description: 'تطوير قلعتي' },
      { command: 'gbarracks', description: 'إنشاء معسكر' },
      { command: 'gbuyarmy', description: 'شراء جيش' },
      { command: 'guparmy', description: 'تطوير الجيش' },
      { command: 'gtreasure', description: 'بحث الكنز' },
      { command: 'gshield', description: 'تفعيل/تعطيل الحصانة' },
      { command: 'gmyshield', description: 'حصانتي' },
      { command: 'gwar', description: 'مبارزة بالرد' },
      { command: 'garena', description: 'الانضمام للمبارزة' },
      { command: 'gfighters', description: 'المبارزين' },
      { command: 'grulers', description: 'توب الحكام' },
      { command: 'gally', description: 'طلب تحالف' },
      { command: 'gallyreq', description: 'طلبات التحالف' }
    ].slice(0, 95),
    { scope: { type: 'all_group_chats' } }
  )
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
bot.start((ctx) => {
  if (GroupAdminHandler.isGroupChat(ctx)) {
    return GroupAdminHandler.handleGroupStart(ctx);
  }
  const text = String(ctx.message?.text || '');
  const payload = text.replace(/^\/start(?:@\w+)?\s*/i, '').trim();
  if (payload) {
    return WhisperHandler.handlePrivateStart(ctx, payload)
      .then((handledWhisper) => {
        if (handledWhisper) return;
        return GroupAdminHandler.handlePrivateTemplateStart(ctx, payload)
          .then((handled) => {
            if (handled) return;
            return CommandHandler.handleStart(ctx);
          });
      });
  }
  return CommandHandler.handleStart(ctx);
});
bot.help((ctx) => {
  if (GroupAdminHandler.isGroupChat(ctx)) {
    return GroupAdminHandler.handleGroupHelp(ctx);
  }
  return CommandHandler.handleHelp(ctx);
});

// --- GROUP ADMIN COMMANDS ---
bot.command('ghelp', (ctx) => GroupAdminHandler.handleGroupHelp(ctx));
bot.command('gpanel', (ctx) => GroupAdminHandler.handleGroupPanel(ctx));
bot.command('gsettings', (ctx) => GroupAdminHandler.handleGroupPanel(ctx));
bot.command('gwarn', (ctx) => GroupAdminHandler.handleWarnCommand(ctx));
bot.command('gwarns', (ctx) => GroupAdminHandler.handleWarnsCommand(ctx));
bot.command('gunwarn', (ctx) => GroupAdminHandler.handleUnwarnCommand(ctx));
bot.command('gresetwarn', (ctx) => GroupAdminHandler.handleResetWarnCommand(ctx));
bot.command('gpolicy', (ctx) => GroupAdminHandler.handlePolicyCommand(ctx));
bot.command('gmute', (ctx) => GroupAdminHandler.handleMuteCommand(ctx));
bot.command('gunmute', (ctx) => GroupAdminHandler.handleUnmuteCommand(ctx));
bot.command('grestrict', (ctx) => GroupAdminHandler.handleRestrictCommand(ctx));
bot.command('gunrestrict', (ctx) => GroupAdminHandler.handleUnrestrictCommand(ctx));
bot.command('gban', (ctx) => GroupAdminHandler.handleBanCommand(ctx));
bot.command('gunban', (ctx) => GroupAdminHandler.handleUnbanCommand(ctx));
bot.command('gclear', (ctx) => GroupAdminHandler.handleClearCommand(ctx));
bot.command('glogs', (ctx) => GroupAdminHandler.handleLogsCommand(ctx));
bot.command('gprotect', (ctx) => GroupAdminHandler.handleProtectCommand(ctx));
bot.command('gprotectionlevel', (ctx) => GroupAdminHandler.handleProtectionPresetCommand(ctx));
bot.command('gprotectionsettings', (ctx) => GroupAdminHandler.handleProtectionSettingsCommand(ctx));
bot.command('gfaq', (ctx) => GroupAdminHandler.handleFaqCommand(ctx));
bot.command('gadminstats', (ctx) => GroupAdminHandler.handleAdminInteractionCommand(ctx));
bot.command('ginspect', (ctx) => GroupAdminHandler.handleInspectCommand(ctx));
bot.command('gprint', (ctx) => GroupAdminHandler.handlePrintCommand(ctx));
bot.command('greasons', (ctx) => GroupAdminHandler.handleReasonsToggle(ctx));
bot.command('gbasic', (ctx) => GroupAdminHandler.handleBasicOwnerCommand(ctx));
bot.command('gexceptions', (ctx) => GroupAdminHandler.handleExceptionsCommand(ctx));
bot.command('granks', (ctx) => GroupAdminHandler.handleRanksCountCommand(ctx));
bot.command('gdetect', (ctx) => GroupAdminHandler.handleDetectToggle(ctx));
bot.command('gonline', (ctx) => GroupAdminHandler.handleOnlineToggle(ctx));
bot.command('gadminleave', (ctx) => GroupAdminHandler.handleAdminLeaveToggle(ctx));
bot.command('gwelcome', (ctx) => GroupAdminHandler.handleWelcomeCommand(ctx));
bot.command('gsuggest', (ctx) => GroupAdminHandler.handleSuggestionCommand(ctx));
bot.command('gsuggestmenu', (ctx) => GroupAdminHandler.handleSuggestionMenuCommand(ctx));
bot.command('gsuggeststats', (ctx) => GroupAdminHandler.handleSuggestionStatsCommand(ctx));
bot.command('gsuggesttop', (ctx) => GroupAdminHandler.handleSuggestionTopCommand(ctx));
bot.command('gtemplate_member', (ctx) => GroupAdminHandler.handleTemplateSetupRequest(ctx, 'member'));
bot.command('gtemplate_admin', (ctx) => GroupAdminHandler.handleTemplateSetupRequest(ctx, 'admin'));
bot.command('gideal_member', (ctx) => GroupAdminHandler.handleIdealAssignCommand(ctx, 'member'));
bot.command('gideal_admin', (ctx) => GroupAdminHandler.handleIdealAssignCommand(ctx, 'admin'));
bot.command('gshow_ideal_member', (ctx) => GroupAdminHandler.handleShowIdealCard(ctx, 'member'));
bot.command('gshow_ideal_admin', (ctx) => GroupAdminHandler.handleShowIdealCard(ctx, 'admin'));
bot.command('gquiz', (ctx) => GroupGamesHandler.handleQuizCommand(ctx));
bot.command('gmath', (ctx) => GroupGamesHandler.handleMathCommand(ctx));
bot.command('gword', (ctx) => GroupGamesHandler.handleWordCommand(ctx));
bot.command('gwho', (ctx) => GroupGamesHandler.handleWhoAmICommand(ctx));
bot.command('griddle', (ctx) => GroupGamesHandler.handleRiddleCommand(ctx));
bot.command('gtype', (ctx) => GroupGamesHandler.handleTypingCommand(ctx));
bot.command('chance', (ctx) => GroupGamesHandler.handleChanceCommand(ctx));
bot.command('gduel', (ctx) => GroupGamesHandler.handleDuelCommand(ctx));
bot.command('gdaily', (ctx) => GroupGamesHandler.handleDailyCommand(ctx));
bot.command('gmcq', (ctx) => GroupGamesHandler.handleMcqCommand(ctx));
bot.command('gvote', (ctx) => GroupGamesHandler.handleVoteCommand(ctx));
bot.command('gconfess', (ctx) => GroupGamesHandler.handleConfessionStart(ctx));
bot.command('gconfessend', (ctx) => GroupGamesHandler.handleConfessionEnd(ctx));
bot.command('gquizset', (ctx) => GroupGamesHandler.handleQuizSetCommand(ctx));
bot.command('gleader', (ctx) => GroupGamesHandler.handleLeaderCommand(ctx));
bot.command('gweekly', (ctx) => GroupGamesHandler.handleWeeklyCommand(ctx));
bot.command('gmonth', (ctx) => GroupGamesHandler.handleMonthlyBoardCommand(ctx));
bot.command('gmonthly', (ctx) => GroupGamesHandler.handleMonthlyRewardCommand(ctx));
bot.command('gbonus', (ctx) => GroupGamesHandler.handleTierRewardsCommand(ctx));
bot.command('glounge', (ctx) => GroupGamesHandler.handleLoungeMenuCommand(ctx));
bot.command('gcafework', (ctx) => GroupGamesHandler.handleCafeWorkCommand(ctx));
bot.command('gcafereq', (ctx) => GroupGamesHandler.handleCafeRequestCommand(ctx));
bot.command('gcafedeliver', (ctx) => GroupGamesHandler.handleCafeDeliverCommand(ctx));
bot.command('gmood', (ctx) => GroupGamesHandler.handleMoodCommand(ctx));
bot.command('gtopcafe', (ctx) => GroupGamesHandler.handleCafeTopCommand(ctx));
bot.command('gtophookah', (ctx) => GroupGamesHandler.handleHookahPuffsTopCommand(ctx));
bot.command('gtopsmoke', (ctx) => GroupGamesHandler.handleSmokePuffsTopCommand(ctx));
bot.command('ghookahsession', (ctx) => GroupGamesHandler.handleHookahSessionOpen(ctx));
bot.command('gcastle', (ctx) => GroupGamesHandler.handleCreateCastleCommand(ctx));
bot.command('gmycastle', (ctx) => GroupGamesHandler.handleMyCastleCommand(ctx));
bot.command('gresstore', (ctx) => GroupGamesHandler.handleResourceStoreCommand(ctx));
bot.command('gbuyres', (ctx) => GroupGamesHandler.handleBuyResourcesCommand(ctx));
bot.command('gmyres', (ctx) => GroupGamesHandler.handleMyResourcesCommand(ctx));
bot.command('gupcastle', (ctx) => GroupGamesHandler.handleUpgradeCastleCommand(ctx));
bot.command('gbarracks', (ctx) => GroupGamesHandler.handleCreateBarracksCommand(ctx));
bot.command('gbuyarmy', (ctx) => GroupGamesHandler.handleBuyArmyCommand(ctx));
bot.command('guparmy', (ctx) => GroupGamesHandler.handleUpgradeArmyCommand(ctx));
bot.command('gtreasure', (ctx) => GroupGamesHandler.handleTreasureSearchCommand(ctx));
bot.command('gshield', (ctx) => GroupGamesHandler.handleShieldToggleCommand(ctx));
bot.command('gmyshield', (ctx) => GroupGamesHandler.handleMyShieldCommand(ctx));
bot.command('gwar', (ctx) => GroupGamesHandler.handleCastleDuelCommand(ctx));
bot.command('garena', (ctx) => GroupGamesHandler.handleArenaJoinCommand(ctx));
bot.command('gfighters', (ctx) => GroupGamesHandler.handleArenaListCommand(ctx));
bot.command('grulers', (ctx) => GroupGamesHandler.handleTopRulersCommand(ctx));
bot.command('gally', (ctx) => GroupGamesHandler.handleAllianceRequestCommand(ctx));
bot.command('gallyreq', (ctx) => GroupGamesHandler.handleAllianceRequestsCommand(ctx));
bot.command('glevels', (ctx) => GroupGamesHandler.handleLevelsCommand(ctx));
bot.command('gstore', (ctx) => GroupGamesHandler.handleStoreCommand(ctx));
bot.command('gbuy', (ctx) => GroupGamesHandler.handleBuyCommand(ctx));
bot.command('ggifts', (ctx) => GroupGamesHandler.handleGiftCatalogCommand(ctx));
bot.command('ggift', (ctx) => GroupGamesHandler.handleGiftCommand(ctx));
bot.command('gbuygift', (ctx) => GroupGamesHandler.handleBuyGiftForSelfCommand(ctx));
bot.command('gsellgift', (ctx) => GroupGamesHandler.handleSellGiftCommand(ctx));
bot.command('gscratch', (ctx) => GroupGamesHandler.handleScratchCommand(ctx));
bot.command('gscratchstats', (ctx) => GroupGamesHandler.handleScratchStatsCommand(ctx));
bot.command('gassets', (ctx) => GroupGamesHandler.handleAssetsCommand(ctx));
bot.command('gwealth', (ctx) => GroupGamesHandler.handleWealthCommand(ctx));
bot.command('gprofile', (ctx) => GroupGamesHandler.handleGroupProfileCommand(ctx));
bot.command('whisper', (ctx) => WhisperHandler.handleWhisperCommand(ctx));
bot.command('ggrantmoney', (ctx) => GroupGamesHandler.handleOwnerGrantMoneyCommand(ctx));
bot.command('gtakemoney', (ctx) => GroupGamesHandler.handleOwnerTakeMoneyCommand(ctx));
bot.command('gsetgender', (ctx) => GroupGamesHandler.handleSetGenderCommand(ctx));
bot.command('gdelgender', (ctx) => GroupGamesHandler.handleDeleteGenderCommand(ctx));
bot.command('ggender', (ctx) => GroupGamesHandler.handleMyGenderCommand(ctx));
bot.command('ggenderof', (ctx) => GroupGamesHandler.handleTargetGenderCommand(ctx));
bot.command('gjoinboys', (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'boys'));
bot.command('gjoingirls', (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'girls'));
bot.command('gleaveteam', (ctx) => GroupGamesHandler.handleLeaveCompetitionTeamCommand(ctx));
bot.command('gmyteam', (ctx) => GroupGamesHandler.handleMyCompetitionTeamCommand(ctx));
bot.command('gteamtop', (ctx) => GroupGamesHandler.handleCompetitionTopCommand(ctx));
bot.command('gstories', (ctx) => GroupGamesHandler.handleStoryTalkStart(ctx));
bot.command('gendstories', (ctx) => GroupGamesHandler.handleStoryTalkEnd(ctx));
bot.command('ginvest', (ctx) => GroupGamesHandler.handleInvestAllCommand(ctx));
bot.command('gluck', (ctx) => GroupGamesHandler.handleLuckCommand(ctx));
bot.command('gluckstats', (ctx) => GroupGamesHandler.handleLuckStatsCommand(ctx));
bot.command('ggame', (ctx) => GroupGamesHandler.handleGameToggleCommand(ctx));
bot.command('ggames', (ctx) => GroupGamesHandler.handleGamesHelp(ctx));
bot.command('gteam', (ctx) => GroupGamesHandler.handleTeamCommand(ctx));
bot.command('gteams', (ctx) => GroupGamesHandler.handleTeamsCommand(ctx));
bot.command('gtour', (ctx) => GroupGamesHandler.handleTournamentCommand(ctx));
bot.command('g', (ctx) => GroupGamesHandler.handleQuickStart(ctx));
bot.command('tcreate', (ctx) => TournamentChallengeHandler.handleCreateTournamentCommand(ctx));
bot.command('taddq', (ctx) => TournamentChallengeHandler.handleAddQuestionsCommand(ctx));
bot.command('tdelq', (ctx) => TournamentChallengeHandler.handleDeleteQuestionsCommand(ctx));
bot.command('ttournaments', (ctx) => TournamentChallengeHandler.handleListTournaments(ctx));
bot.command('tjoined', (ctx) => TournamentChallengeHandler.handleTournamentJoinedGroups(ctx));

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
  const ownerIds = parseOwnerIds();

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
  const ownerIds = parseOwnerIds();

  if (ownerIds.includes(ctx.from.id)) {
    const report = healthMonitor.getFullReport();
    await ctx.reply(report, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ ليس لديك صلاحية لهذا الأمر');
  }
});

bot.command('myid', async (ctx) => {
  const ownerIds = parseOwnerIds();
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
  const ownerIds = parseOwnerIds();

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
  const ownerIds = parseOwnerIds();

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
bot.action('owner:chats', (ctx) => CommandHandler.handleOwnerChats(ctx));
bot.action('owner:broadcast', (ctx) => CommandHandler.handleOwnerBroadcast(ctx));
bot.action('owner:economy', (ctx) => CommandHandler.handleOwnerEconomy(ctx));
bot.action('owner:database', (ctx) => CommandHandler.handleOwnerDatabase(ctx));
bot.action('owner:logs', (ctx) => CommandHandler.handleOwnerLogs(ctx));
bot.action('owner:viewall', (ctx) => CommandHandler.handleOwnerViewAllUsers(ctx));
bot.action('owner:givecoins', (ctx) => CommandHandler.handleOwnerGiveCoins(ctx));

const getActiveUsersQuery = () => ({
  $and: [
    { $or: [{ isBanned: { $exists: false } }, { isBanned: false }] },
    { $or: [{ banned: { $exists: false } }, { banned: false }] }
  ]
});

const getBannedUsersQuery = () => ({
  $or: [{ isBanned: true }, { banned: true }]
});

const ensureOwner = async (ctx) => {
  const UIManager = require('./ui/keyboards');
  if (!UIManager.isOwner(ctx.from.id)) {
    await ctx.answerCbQuery('❌ غير مصرح');
    return false;
  }
  return true;
};

const editOrReplyHtml = async (ctx, message, keyboard = null) => {
  const options = {
    parse_mode: 'HTML'
  };
  if (keyboard?.reply_markup) {
    options.reply_markup = keyboard.reply_markup;
  }
  try {
    await ctx.editMessageText(message, options);
  } catch (_error) {
    await ctx.reply(message, options);
  }
};

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parsePositiveInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isCancelInput = (value) => String(value || '').trim().toLowerCase() === '/cancel';

const escapeRegex = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Owner - Maintenance
bot.action('owner:maintenance', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;

    const message =
      '🔧 <b>وضع الصيانة</b>\n\n' +
      'اختر العملية المطلوبة:\n' +
      '• تنظيف سريع للبيانات\n' +
      '• فحص الأداء\n' +
      '• نسخ احتياطي يدوي\n' +
      '• مسح الكاش\n' +
      '• إعادة تشغيل الخدمة';

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🧹 تنظيف سريع', 'owner:dbclean'),
        Markup.button.callback('📊 الأداء', 'owner:performance')
      ],
      [
        Markup.button.callback('💾 نسخ احتياطي', 'owner:backup'),
        Markup.button.callback('⚡ مسح الكاش', 'owner:cacheclear')
      ],
      [
        Markup.button.callback('🔄 إعادة تشغيل', 'owner:restart'),
        Markup.button.callback('⬅️ رجوع', 'owner:panel')
      ]
    ]);

    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner maintenance error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:cacheclear', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    if (global.cache && typeof global.cache.flush === 'function') {
      global.cache.flush();
    }
    await ctx.answerCbQuery('✅ تم');
    await ctx.reply('✅ تم مسح الكاش بنجاح');
  } catch (error) {
    console.error('Owner cache clear error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Games Management
bot.action('owner:games', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const { GameStats } = require('./database/models');

    const totalRecords = await GameStats.countDocuments();
    const totals = await GameStats.aggregate([
      {
        $group: {
          _id: null,
          played: { $sum: '$played' },
          won: { $sum: '$won' },
          lost: { $sum: '$lost' },
          coinsEarned: { $sum: '$coinsEarned' }
        }
      }
    ]);

    const byGame = await GameStats.aggregate([
      {
        $group: {
          _id: '$gameName',
          played: { $sum: '$played' },
          won: { $sum: '$won' }
        }
      },
      { $sort: { played: -1 } },
      { $limit: 8 }
    ]);

    const stats = totals[0] || { played: 0, won: 0, lost: 0, coinsEarned: 0 };
    let message =
      '🎮 <b>إدارة الألعاب</b>\n\n' +
      `📊 سجلات الألعاب: ${totalRecords}\n` +
      `🕹️ إجمالي اللعب: ${stats.played}\n` +
      `🏆 إجمالي الفوز: ${stats.won}\n` +
      `💸 إجمالي الخسارة: ${stats.lost}\n` +
      `💰 العملات المكتسبة: ${stats.coinsEarned}\n\n` +
      '<b>الألعاب الأكثر لعبًا:</b>\n';

    if (byGame.length === 0) {
      message += 'لا توجد بيانات ألعاب بعد.';
    } else {
      byGame.forEach((game, index) => {
        message += `${index + 1}. ${game._id} — لعب: ${game.played} | فوز: ${game.won}\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:panel')]]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner games error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Content Management
bot.action('owner:content', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const { Content } = require('./database/models');

    const total = await Content.countDocuments();
    const active = await Content.countDocuments({ isActive: true });
    const byType = await Content.aggregate([
      {
        $group: {
          _id: '$contentType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    let message =
      '📚 <b>إدارة المحتوى</b>\n\n' +
      `📦 إجمالي العناصر: ${total}\n` +
      `✅ العناصر النشطة: ${active}\n` +
      `⛔ العناصر غير النشطة: ${Math.max(total - active, 0)}\n\n` +
      '<b>التصنيفات:</b>\n';

    if (byType.length === 0) {
      message += 'لا يوجد محتوى مسجل حالياً.';
    } else {
      byType.forEach((item, index) => {
        message += `${index + 1}. ${item._id || 'غير مصنف'}: ${item.count}\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✏️ إدارة من الإعدادات', 'settings:content')],
      [Markup.button.callback('⬅️ رجوع', 'owner:panel')]
    ]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner content error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Restart
bot.action('owner:restart', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ نعم، أعد التشغيل', 'owner:restart:confirm'),
        Markup.button.callback('❌ إلغاء', 'owner:panel')
      ]
    ]);
    await editOrReplyHtml(
      ctx,
      '🔄 <b>تأكيد إعادة التشغيل</b>\n\nسيتم إيقاف العملية الحالية ليقوم السيرفر بإعادة تشغيلها تلقائياً.',
      keyboard
    );
  } catch (error) {
    console.error('Owner restart prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:restart:confirm', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    await ctx.answerCbQuery('✅ جاري التنفيذ');
    await ctx.reply('🛑 جاري إعادة التشغيل... سيتم تشغيل البوت تلقائياً خلال ثوانٍ.');
    setTimeout(() => process.exit(0), 1200);
  } catch (error) {
    console.error('Owner restart confirm error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Users quick actions
bot.action('owner:search', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'searchUser' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('🔍 أرسل ID المستخدم أو الاسم للبحث.');
  } catch (error) {
    console.error('Owner search error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:ban', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'banUser' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('🚫 أرسل: ID سبب_اختياري\nمثال: 123456789 إساءة متكررة');
  } catch (error) {
    console.error('Owner ban prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:unban', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'unbanUser' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('✅ أرسل ID المستخدم لفك الحظر.');
  } catch (error) {
    console.error('Owner unban prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:givexp', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'giveXp' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('⭐ أرسل: ID المبلغ\nمثال: 123456789 500');
  } catch (error) {
    console.error('Owner givexp prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:reset', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'resetUser' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('🔄 أرسل ID المستخدم لإعادة تعيين بياناته الأساسية.');
  } catch (error) {
    console.error('Owner reset prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:delete', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'deleteUser' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('🗑️ أرسل: ID CONFIRM\nمثال: 123456789 CONFIRM');
  } catch (error) {
    console.error('Owner delete prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Economy details
bot.action('owner:ecostats', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const { User, Transaction } = require('./database/models');

    const userCount = await User.countDocuments();
    const totals = await User.aggregate([
      {
        $group: {
          _id: null,
          coins: { $sum: '$coins' },
          xp: { $sum: '$xp' },
          totalEarnings: { $sum: '$totalEarnings' },
          totalSpending: { $sum: '$totalSpending' }
        }
      }
    ]);

    const txCount = await Transaction.countDocuments();
    const transferCount = await Transaction.countDocuments({ type: 'transfer' });

    const values = totals[0] || { coins: 0, xp: 0, totalEarnings: 0, totalSpending: 0 };
    const avgCoins = userCount > 0 ? Math.round(values.coins / userCount) : 0;

    const message =
      '📊 <b>إحصائيات الاقتصاد</b>\n\n' +
      `👥 المستخدمون: ${userCount}\n` +
      `💰 إجمالي العملات: ${values.coins}\n` +
      `⭐ إجمالي XP: ${values.xp}\n` +
      `📥 إجمالي الأرباح: ${values.totalEarnings}\n` +
      `📤 إجمالي المصروف: ${values.totalSpending}\n` +
      `💵 متوسط العملات/مستخدم: ${avgCoins}\n` +
      `🧾 إجمالي المعاملات: ${txCount}\n` +
      `🔁 التحويلات: ${transferCount}`;

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:economy')]]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner ecostats error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:taxall', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'taxall' };
    await ctx.answerCbQuery('✅');
    await ctx.reply('💸 أرسل قيمة الخصم من كل مستخدم.\nمثال: 25');
  } catch (error) {
    console.error('Owner taxall prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:shop', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const ShopSystem = require('./features/shopSystem');
    const items = ShopSystem.getAllShopItems();
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const avgPrice = items.length ? Math.round(totalValue / items.length) : 0;

    const message =
      '🛒 <b>إدارة متجر الميزات</b>\n\n' +
      `📦 عدد العناصر: ${items.length}\n` +
      `💰 مجموع أسعار العناصر: ${totalValue}\n` +
      `📊 متوسط السعر: ${avgPrice}\n\n` +
      'استخدم "العناصر" لعرض التفاصيل.';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📦 العناصر', 'owner:items')],
      [Markup.button.callback('⬅️ رجوع', 'owner:economy')]
    ]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner shop error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:items', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const ShopSystem = require('./features/shopSystem');
    const items = ShopSystem.getAllShopItems();

    let message = '📦 <b>عناصر المتجر</b>\n\n';
    if (items.length === 0) {
      message += 'لا توجد عناصر متجر حالياً.';
    } else {
      items.forEach((item, index) => {
        message += `${index + 1}. ${item.emoji} <b>${item.name}</b>\n`;
        message += `🔑 <code>${item.key}</code>\n`;
        message += `💰 ${item.price} | 🏷️ ${item.type}\n\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:shop')]]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner items error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - DB tools
bot.action('owner:backup', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const BackupSystem = require('./utils/backupSystem');
    const backup = new BackupSystem();
    const result = await backup.fullBackup(true);

    if (!result.success) {
      return ctx.reply(`❌ فشل النسخ الاحتياطي: ${result.error || 'خطأ غير معروف'}`);
    }

    return ctx.reply(
      '✅ <b>تم إنشاء نسخة احتياطية</b>\n\n' +
        `📄 الملف: <code>${result.filename}</code>\n` +
        `📊 الحجم: ${result.size}\n` +
        `👥 المستخدمون: ${result.statistics?.totalUsers || 0}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Owner backup error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:restore', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const BackupSystem = require('./utils/backupSystem');
    const backup = new BackupSystem();
    const backups = backup.listBackups().slice(0, 5);

    let message =
      '🔄 <b>استرجاع نسخة احتياطية</b>\n\n' +
      'أرسل اسم الملف لعمل معاينة آمنة (بدون استرجاع فعلي).\n\n';

    if (backups.length > 0) {
      message += '<b>آخر النسخ:</b>\n';
      backups.forEach((item, index) => {
        message += `${index + 1}. <code>${item.filename}</code>\n`;
      });
    } else {
      message += 'لا توجد نسخ احتياطية متاحة.';
    }

    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'restorePreview' };

    await ctx.answerCbQuery('✅');
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Owner restore prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:dbclean', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const { User } = require('./database/models');
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const notificationsCleanup = await User.updateMany(
      {},
      { $pull: { notificationsLog: { timestamp: { $lt: cutoff } } } }
    );

    const boostsCleanup = await User.updateMany(
      {},
      { $pull: { activeBoosts: { endDate: { $lt: now } } } }
    );

    const BackupSystem = require('./utils/backupSystem');
    const backup = new BackupSystem();
    const oldBackups = backup.deleteOldBackups(30);

    const message =
      '🧹 <b>نتيجة التنظيف</b>\n\n' +
      `🔔 تنظيف سجل الإشعارات: ${notificationsCleanup.modifiedCount || 0} مستخدم\n` +
      `⚡ تنظيف المعززات المنتهية: ${boostsCleanup.modifiedCount || 0} مستخدم\n` +
      `💾 حذف النسخ القديمة: ${oldBackups.deleted || 0}`;

    await ctx.answerCbQuery('✅ تم');
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Owner dbclean error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:performance', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    const mongoose = require('mongoose');
    const dbStats = await mongoose.connection.db.stats();
    const mem = process.memoryUsage();
    const cacheStats = global.cache?.getStats?.() || null;
    const limiterStats = global.rateLimiter?.getStats?.() || null;

    const message =
      '⚡ <b>تقرير الأداء</b>\n\n' +
      `🕒 Uptime: ${Math.floor(process.uptime() / 60)} دقيقة\n` +
      `💾 Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
      `💾 Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
      `📦 RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB\n` +
      `🗄️ DB Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB\n` +
      `📄 DB Objects: ${dbStats.objects}\n` +
      `⚙️ Cache Keys: ${cacheStats?.keyCount || 0}\n` +
      `🛡️ Blocked Users: ${limiterStats?.blockedUsers || 0}`;

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'owner:database')]]);
    await editOrReplyHtml(ctx, message, keyboard);
  } catch (error) {
    console.error('Owner performance error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

bot.action('owner:query', async (ctx) => {
  try {
    if (!(await ensureOwner(ctx))) return;
    ctx.session = ctx.session || {};
    ctx.session.ownerAwait = { type: 'dbQuery' };
    await ctx.answerCbQuery('✅');
    await ctx.reply(
      '🔍 أرسل صيغة الاستعلام:\n' +
        '<code>collection limit</code>\n\n' +
        'المتاح: users, transactions, games, content\n' +
        'مثال: <code>users 5</code>',
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Owner query prompt error:', error);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// Owner - Banned Users List
bot.action('owner:banned', async (ctx) => {
  try {
    const UIManager = require('./ui/keyboards');
    if (!UIManager.isOwner(ctx.from.id)) {
      return ctx.answerCbQuery('❌ غير مصرح');
    }

    const { User } = require('./database/models');
    const banned = await User.find(getBannedUsersQuery()).limit(20);

    let message = `🚫 <b>المستخدمون المحظورون (${banned.length})</b>\n\n`;

    if (banned.length === 0) {
      message += 'لا يوجد مستخدمون محظورون حالياً';
    } else {
      banned.forEach((u, i) => {
        message += `${i + 1}. ${u.firstName || 'مستخدم'}\n`;
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
    const inactivityQuery = {
      $or: [
        { lastActive: { $lt: ninetyDaysAgo } },
        { updatedAt: { $lt: ninetyDaysAgo } },
        { createdAt: { $lt: ninetyDaysAgo } }
      ]
    };
    const inactiveCount = await User.countDocuments(inactivityQuery);

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
      $or: [
        { lastActive: { $lt: ninetyDaysAgo } },
        { updatedAt: { $lt: ninetyDaysAgo } },
        { createdAt: { $lt: ninetyDaysAgo } }
      ]
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
bot.action(/^group:mcq:([a-z0-9]+):(\d+)$/i, (ctx) => GroupGamesHandler.handleMcqCallback(ctx, ctx.match[1], ctx.match[2]));
bot.action(/^group:vote:([a-z0-9]+):(\d+)$/i, (ctx) => GroupGamesHandler.handleVoteCallback(ctx, ctx.match[1], ctx.match[2]));
bot.action(/^group:duel:(accept|decline):([a-z0-9]+)$/i, (ctx) => GroupGamesHandler.handleDuelAction(ctx, ctx.match[1], ctx.match[2]));
bot.action(/^group:confess:(end):([a-z0-9]+)$/i, (ctx) => GroupGamesHandler.handleConfessionAction(ctx, ctx.match[1].toLowerCase(), ctx.match[2]));
bot.action(/^group:games:(gquiz|gmath|gword|gwho|griddle|gtype|gduel|gchance|gdaily|gmcq|gvote|gleader|gweekly|gmonth|glevels|glounge|gconfess|gconfess_end)$/i, (ctx) => GroupGamesHandler.handleGamesMenuAction(ctx, ctx.match[1].toLowerCase()));
bot.action(/^group:help:page:(\d+)$/i, (ctx) => GroupGamesHandler.handleGamesHelpPageAction(ctx, Number(ctx.match[1] || 0)));
bot.action(/^group:help:noop$/i, (ctx) => ctx.answerCbQuery().catch(() => {}));
bot.action(/^group:quick:(quiz|who|riddle|typing|duel|chance|profile|leader|levels|store|gifts|assets|lounge|supplies|help)$/i, (ctx) => GroupGamesHandler.handleQuickAction(ctx, ctx.match[1]));
bot.action(/^group:levels:(bronze|silver|gold|platinum|diamond)$/i, (ctx) => GroupGamesHandler.handleLevelsAction(ctx, ctx.match[1]));
bot.action(/^group:(?!whisper:).+$/, (ctx) => GroupAdminHandler.handleGroupCallback(ctx));
bot.on('poll_answer', (ctx) => GroupGamesHandler.handlePollAnswer(ctx));
bot.on('chat_member', (ctx) => GroupAdminHandler.handleChatMemberUpdate(ctx));
bot.on('edited_message', (ctx) => GroupAdminHandler.handleEditedMessage(ctx));
bot.on('photo', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
    const handledTemplate = await GroupAdminHandler.handlePrivateTemplatePhoto(ctx);
    if (handledTemplate) return;
  } catch (error) {
    logger.error('Photo handler error:', error.message);
  }
});
bot.on('video', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Video handler error:', error.message);
  }
});
bot.on('animation', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Animation handler error:', error.message);
  }
});
bot.on('voice', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Voice handler error:', error.message);
  }
});
bot.on('audio', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Audio handler error:', error.message);
  }
});
bot.on('document', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Document handler error:', error.message);
  }
});
bot.on('sticker', async (ctx) => {
  try {
    const handledSpecialFaq = await GroupAdminHandler.handleSpecialFaqMedia(ctx);
    if (handledSpecialFaq) return;
    const handledGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqMedia(ctx);
    if (handledGlobalSpecialFaq) return;
  } catch (error) {
    logger.error('Sticker handler error:', error.message);
  }
});
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

const renderShopCategory = async (ctx, category) => {
  const ShopSystem = require('./features/shopSystem');
  const { User } = require('./database/models');

  try {
    await ctx.answerCbQuery();
  } catch (_error) {
    // Ignore callback answer failures for old/expired queries.
  }

  const user = await User.findOne({ userId: ctx.from.id });
  const balance = user?.coins || 0;
  const items =
    category === 'all'
      ? ShopSystem.getAllShopItems()
      : ShopSystem.getShopItemsByCategory(category);
  const categoryLabel = ShopSystem.getShopCategoryLabel(category);

  let message = `🛍️ <b>${categoryLabel}</b>\n\n💰 <b>رصيدك:</b> ${balance} عملة\n\n`;

  if (items.length === 0) {
    message += 'لا توجد عناصر متاحة حالياً في هذه الفئة.';
  } else {
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.emoji} <b>${item.name}</b>\n`;
      message += `💰 السعر: ${item.price} عملة\n`;
      message += `📝 ${item.description}\n\n`;
    });
  }

  const rows = items.map((item) => [
    Markup.button.callback(`🛒 شراء ${item.emoji} ${item.name}`, `shop:buykey:${item.key}`)
  ]);
  rows.push([
    Markup.button.callback('🎒 حقيبتي', 'shop:inventory'),
    Markup.button.callback('⬅️ رجوع', 'new:shop')
  ]);

  const keyboard = Markup.inlineKeyboard(rows);
  try {
    await ctx.editMessageText(message.trim(), {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    });
  } catch (_error) {
    await ctx.reply(message.trim(), {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    });
  }
};

bot.action('shop:all', async (ctx) => {
  await renderShopCategory(ctx, 'all');
});

bot.action('shop:badges', async (ctx) => {
  await renderShopCategory(ctx, 'badges');
});

bot.action('shop:boosts', async (ctx) => {
  await renderShopCategory(ctx, 'boosts');
});

bot.action('shop:rewards', async (ctx) => {
  await renderShopCategory(ctx, 'rewards');
});

bot.action('shop:weapons', async (ctx) => {
  await renderShopCategory(ctx, 'weapons');
});

bot.action('shop:inventory', async (ctx) => {
  const ShopSystem = require('./features/shopSystem');
  const summary = await ShopSystem.getUserInventorySummary(ctx.from.id);

  try {
    await ctx.answerCbQuery();
  } catch (_error) {
    // Ignore callback answer failures for old/expired queries.
  }

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛍️ المتجر', 'new:shop'),
      Markup.button.callback('⬅️ رجوع', 'new:shop')
    ]
  ]);

  try {
    await ctx.editMessageText(summary, {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    });
  } catch (_error) {
    await ctx.reply(summary, {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    });
  }
});

bot.action(/shop:buykey:([a-zA-Z0-9_]+)/, async (ctx) => {
  const ShopSystem = require('./features/shopSystem');
  const itemKey = ctx.match[1];
  const result = await ShopSystem.buyItem(ctx.from.id, itemKey);

  try {
    await ctx.answerCbQuery(result.success ? '✅ تم الشراء' : '❌ تعذر الشراء', {
      show_alert: !result.success
    });
  } catch (_error) {
    // Ignore callback answer failures for old/expired queries.
  }

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🛍️ متابعة التسوق', 'new:shop'),
      Markup.button.callback('🎒 حقيبتي', 'shop:inventory')
    ]
  ]);

  await ctx.reply(result.message, {
    parse_mode: 'HTML',
    reply_markup: keyboard.reply_markup
  });
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
const showSingleLibraryFromCategory = async (ctx, category) => {
  const IslamicLibrary = require('./features/islamicLibrary');
  const collection = IslamicLibrary.getCollection(category);

  if (!collection) {
    await ctx.answerCbQuery('❌ الفئة غير موجودة');
    return;
  }

  const item = IslamicLibrary.getRandomLibraryItem(category);
  if (!item) {
    await ctx.answerCbQuery('❌ لا يوجد محتوى في هذه الفئة');
    return;
  }

  const stats = IslamicLibrary.getLibraryStats();
  const count = stats.byCategory[category] || 0;
  const contentType = category === 'stories' ? 'stories' : category;
  const content = IslamicLibrary.formatLibraryContent(contentType, item);

  const message =
    `${collection.icon} <b>${collection.name}</b>\n` +
    `📚 <b>عدد العناصر في الفئة:</b> ${count}\n\n` +
    `${content}`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('🆕 عنصر آخر', `library:next:${category}`)],
    [Markup.button.callback('📂 أقسام المكتبة', 'library:menu'), Markup.button.callback('⬅️ الرئيسية', 'menu:main')]
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

bot.action(/^library:(tafsir|hadith|fiqh|stories|sahabi|awrad)$/, async (ctx) => {
  const category = ctx.match[1];
  await showSingleLibraryFromCategory(ctx, category);
  await ctx.answerCbQuery('📚 تم عرض عنصر');
});

bot.action(/^library:next:(tafsir|hadith|fiqh|stories|sahabi|awrad)$/, async (ctx) => {
  const category = ctx.match[1];
  await showSingleLibraryFromCategory(ctx, category);
  await ctx.answerCbQuery('🆕 عنصر جديد');
});

bot.action('library:menu', (ctx) => CommandHandler.handleLibrary(ctx));

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
    if (!(await ensureOwner(ctx))) return;
    const userId = parseInt(ctx.match[1]);
    const { User } = require('./database/models');
    const userToBan = await User.findOne({ userId });

    if (!userToBan) {
      return ctx.answerCbQuery('❌ لم يتم العثور على المستخدم');
    }

    userToBan.isBanned = true;
    userToBan.banned = true;
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
    if (!(await ensureOwner(ctx))) return;
    const userId = parseInt(ctx.match[1]);
    const { User } = require('./database/models');
    const userToUnban = await User.findOne({ userId });

    if (!userToUnban) {
      return ctx.answerCbQuery('❌ لم يتم العثور على المستخدم');
    }

    userToUnban.isBanned = false;
    userToUnban.banned = false;
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
bot.action(/^bank:create:(visa|mastercard|payoneer)$/i, (ctx) => BankGameHandler.handleCreateAccountCard(ctx, ctx.match[1].toLowerCase()));

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
bot.action('game:xo', (ctx) => ChatGamesUtilityHandler.handleXoStart(ctx));
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
bot.action('game:bomb', (ctx) => NewGamesHandler.handleBombDefuse(ctx));
bot.action(/game:bomb:ans:(\d+)/, (ctx) => {
  const answerIndex = parseInt(ctx.match[1], 10);
  NewGamesHandler.handleBombAnswer(ctx, answerIndex);
});
bot.action('game:cardbattle', (ctx) => NewGamesHandler.handleCardBattle(ctx));
bot.action(/game:card:pick:(\d+)/, (ctx) => {
  const cardIndex = parseInt(ctx.match[1], 10);
  NewGamesHandler.handleCardPick(ctx, cardIndex);
});
bot.action('game:mind', (ctx) => NewGamesHandler.handleMindPuzzle(ctx));
bot.action(/game:mind:ans:(\d+)/, (ctx) => {
  const answerIndex = parseInt(ctx.match[1], 10);
  NewGamesHandler.handleMindAnswer(ctx, answerIndex);
});

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
bot.hears('🌤️ الطقس', (ctx) => ChatGamesUtilityHandler.handleWeatherText(ctx, ''));
bot.hears('🕌 الأذان', (ctx) => ChatGamesUtilityHandler.handleAdhanText(ctx, ''));
bot.hears(/^اكس\s*اوه$/i, (ctx) => ChatGamesUtilityHandler.handleXoStart(ctx));
bot.hears(/^طقس(?:\s+(.+))?$/i, (ctx) => ChatGamesUtilityHandler.handleWeatherText(ctx, ctx.match[1]));
bot.hears(/^(?:اذان|أذان)(?:\s+(.+))?$/i, (ctx) => ChatGamesUtilityHandler.handleAdhanText(ctx, ctx.match[1]));
// Group Bank Game commands
bot.hears(/^انشاء\s*حساب\s*بنكي$/i, (ctx) => BankGameHandler.handleCreateAccount(ctx));
bot.hears(/^حسابي$/i, (ctx) => BankGameHandler.handleAccountInfo(ctx));
bot.hears(/^راتب$/i, (ctx) => BankGameHandler.handleSalary(ctx));
bot.hears(/^بخشيش$/i, (ctx) => BankGameHandler.handleTip(ctx));
bot.hears(/^زرف$/i, (ctx) => BankGameHandler.handleSteal(ctx));
bot.hears(/^مضاربه(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleSpeculate(ctx));
bot.hears(/^العجله$/i, (ctx) => BankGameHandler.handleWheel(ctx));
bot.hears(/^سعر\s*الاسهم$/i, (ctx) => BankGameHandler.handleStocksPrice(ctx));
bot.hears(/^شراء\s*اسهم(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleBuyStocks(ctx));
bot.hears(/^بيع\s*اسهم(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleSellStocks(ctx));
bot.hears(/^قرض$/i, (ctx) => BankGameHandler.handleLoan(ctx));
bot.hears(/^سجني$/i, (ctx) => BankGameHandler.handlePrisonStatus(ctx));
bot.hears(/^ديوني$/i, (ctx) => BankGameHandler.handleMyDebts(ctx));
bot.hears(/^ديونه$/i, (ctx) => BankGameHandler.handleTargetDebts(ctx));
bot.hears(/^سداد\s*ديوني$/i, (ctx) => BankGameHandler.handleRepayMine(ctx));
bot.hears(/^سداد\s*ديونه$/i, (ctx) => BankGameHandler.handleRepayTarget(ctx));
bot.hears(/^زواج\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleMarriage(ctx));
bot.hears(/^طلاق\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i, (ctx) => BankGameHandler.handleDivorce(ctx));
bot.hears(/^طلاق\s*زوجاتي$/i, (ctx) => BankGameHandler.handleDivorceAll(ctx));
bot.hears(/^(?:خلع|خلع\s*زوجي)$/i, (ctx) => BankGameHandler.handleKhula(ctx));
bot.hears(/^زواجي$/i, (ctx) => BankGameHandler.handleMarriageInfo(ctx));
bot.hears(/^زوجاتي$/i, (ctx) => BankGameHandler.handleWivesList(ctx));
bot.hears(/^زوجتي\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i, (ctx) => BankGameHandler.handleSpecificWife(ctx));
bot.hears(/^توب\s*المتزوجين$/i, (ctx) => BankGameHandler.handleTopMarried(ctx));
bot.hears(/^حذف\s*المتزوجين$/i, (ctx) => BankGameHandler.handleDeleteMarried(ctx));
bot.hears(/^انشاء\s*بطوله$/i, (ctx) => TournamentChallengeHandler.handleCreateTournamentCommand(ctx));
bot.hears(/^اضف\s*اسئله\s*البطوله$/i, (ctx) => TournamentChallengeHandler.handleAddQuestionsCommand(ctx));
bot.hears(/^حذف\s*اسئله\s*البطوله$/i, (ctx) => TournamentChallengeHandler.handleDeleteQuestionsCommand(ctx));
bot.hears(/^منضمين\s*البطوله$/i, (ctx) => TournamentChallengeHandler.handleTournamentJoinedGroups(ctx));
bot.hears(/^البطولات$/i, (ctx) => TournamentChallengeHandler.handleListTournaments(ctx));
bot.hears(/^الانضمام\s*للبطوله$/i, (ctx) => TournamentChallengeHandler.handleGroupJoinTournament(ctx));
bot.hears(/^انا$/i, (ctx) => TournamentChallengeHandler.handleParticipantJoin(ctx));
bot.hears(/^تفعيل\s*البطوله$/i, (ctx) => TournamentChallengeHandler.handleGroupTournamentToggle(ctx, true));
bot.hears(/^تعطيل\s*البطوله$/i, (ctx) => TournamentChallengeHandler.handleGroupTournamentToggle(ctx, false));
bot.hears(/^توب\s*القروبات$/i, (ctx) => BankGameHandler.handleTopGroups(ctx));
bot.hears(/^(?:توب\s*المتفاعلين|الاكثر\s*تفاعلا|الأكثر\s*تفاعلا)$/i, (ctx) => BankGameHandler.handleTopActiveInGroup(ctx));
// Group Arabic aliases (without slash)
bot.hears(/^العاب\s*الجروب$/i, (ctx) => GroupGamesHandler.handleGamesHelp(ctx));
bot.hears(/^(?:الالعاب|الألعاب)$/i, (ctx) => GroupGamesHandler.handleGamesListCommand(ctx));
bot.hears(/^مين\s*انا$/i, (ctx) => GroupGamesHandler.handleWhoAmICommand(ctx));
bot.hears(/^(?:الغاز|ألغاز|لغز)$/i, (ctx) => GroupGamesHandler.handleRiddleCommand(ctx));
bot.hears(/^سرعة\s*الكتابة$/i, (ctx) => GroupGamesHandler.handleTypingCommand(ctx));
bot.hears(/^روليت$/i, (ctx) => GroupGamesHandler.handleChanceCommand(ctx));
bot.hears(/^كرسي\s*الاعتراف$/i, (ctx) => GroupGamesHandler.handleConfessionStart(ctx));
bot.hears(/^انهاء\s*كرسي\s*الاعتراف$/i, (ctx) => GroupGamesHandler.handleConfessionEnd(ctx));
bot.hears(/^(?:لاونج|كافيتيريا|كافتيريا)$/i, (ctx) => GroupGamesHandler.handleLoungeMenuCommand(ctx));
bot.hears(/^قائمة\s*(?:الكافيتيريا|كافيتيريا)$/i, (ctx) => GroupGamesHandler.handleLoungeMenuCommand(ctx));
bot.hears(/^(?:مستلزماتي|مستلزماتي\s*باللاونج)$/i, (ctx) => GroupGamesHandler.handleLoungeSuppliesCommand(ctx));
bot.hears(/^اشتغل\s*بالكافيتيريا$/i, (ctx) => GroupGamesHandler.handleCafeWorkCommand(ctx));
bot.hears(/^طلب\s*كافيتيريا$/i, (ctx) => GroupGamesHandler.handleCafeRequestCommand(ctx));
bot.hears(/^سلم\s*الطلب$/i, (ctx) => GroupGamesHandler.handleCafeDeliverCommand(ctx));
bot.hears(/^مزاجي$/i, (ctx) => GroupGamesHandler.handleMoodCommand(ctx));
bot.hears(/^(?:اشرب\s*.+|اكل\s*.+|كول\s*.+|البس\s*.+|قهوة|شاي|نسكفيه|نسكافيه|كابتشينو|شاي\s*لاتيه|هوت\s*شوكليت|ماء|مي|مية|حليب|لبن|عصير|موهيتو|برتقال|ليمون|فواكه|موز|افوكادو|فراولة|مانجا|سفن\s*اب|سڤن\s*اب|كوكاكولا|كوكا\s*كولا|ماريندا|تمر|خبز|حلويات|شاورما|وجبة\s*شاورما|دجاجة\s*مشوية|دجاج\s*مشوي|فروج\s*مشوي|كباب|وجبة\s*كباب|مشاوي\s*مشكل|مشاوي\s*مشكلة|ملابس\s*حريمي|ملابس\s*رجالي|ملابس\s*اطفال|ملابس\s*أطفال|ملابس\s*صبايا)$/i, (ctx) => GroupGamesHandler.handleCafeConsumeCommand(ctx));
bot.hears(/^(?:البس|إلبس|لبس)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleWearCommand(ctx));
bot.hears(/^توب\s*الكافيتيريا$/i, (ctx) => GroupGamesHandler.handleCafeTopCommand(ctx));
bot.hears(/^توب\s*لاونج$/i, (ctx) => GroupGamesHandler.handleCafeTopCommand(ctx));
bot.hears(/^توب\s*نفس\s*ارجيلة$/i, (ctx) => GroupGamesHandler.handleHookahPuffsTopCommand(ctx));
bot.hears(/^توب\s*الدخان$/i, (ctx) => GroupGamesHandler.handleSmokePuffsTopCommand(ctx));
bot.hears(/^افتح\s*جلسة\s*ارجيلة$/i, (ctx) => GroupGamesHandler.handleHookahSessionOpen(ctx));
bot.hears(/^انضم$/i, (ctx) => GroupGamesHandler.handleHookahSessionJoin(ctx));
bot.hears(/^(?:ولع\s*سيجارة|توليع\s*سيجارة|اشعل\s*سيجارة|ولع\s*دخان|ولع\s*سيجار|توليع\s*سيجار|اشعل\s*سيجار|شغل\s*فيب|ابدأ\s*فيب|جهز\s*ارجيلة|جهز\s*أرجيلة|تجهيز\s*ارجيلة|شغل\s*ارجيلة|شغل\s*أرجيلة)$/i, (ctx) => GroupGamesHandler.handleLoungeIgniteCommand(ctx));
bot.hears(/^(?:هف|هفف|هففف|هفففف|هففففف|فيب|نفخة\s*سيجار|نفس\s*ارجيلة|نفس\s*أرجيلة|نفس\s*دخان)$/i, (ctx) => GroupGamesHandler.handleLoungePuffCommand(ctx));
bot.hears(/^تحدي(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleDuelCommand(ctx));
bot.hears(/^متجر\s*الجروب$/i, (ctx) => GroupGamesHandler.handleStoreCommand(ctx));
bot.hears(/^شراء\s*هد(?:ي|ي)ة(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleBuyGiftForSelfCommand(ctx));
bot.hears(/^بيع\s*هد(?:ي|ي)ة(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleSellGiftCommand(ctx));
bot.hears(/^كشط(?:\s+\d+)?$/i, (ctx) => GroupGamesHandler.handleScratchCommand(ctx));
bot.hears(/^(?:احصائيات|إحصائيات)\s*الكشط$/i, (ctx) => GroupGamesHandler.handleScratchStatsCommand(ctx));
bot.hears(/^بيع(?:\s+.+)?$/i, async (ctx) => {
  const handledLounge = await GroupGamesHandler.handleLoungeSellCommand(ctx);
  if (handledLounge) return;
  const handled = await BankGameHandler.handleAssetSellText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleSimpleSellCommand(ctx);
  }
});
bot.hears(/^شراء(?!\s*موارد)(?!\s*جيش)(?:\s+.+)?$/i, async (ctx) => {
  const handledLounge = await GroupGamesHandler.handleLoungeBuyCommand(ctx);
  if (handledLounge) return;
  const handled = await BankGameHandler.handleAssetBuyText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleSimpleBuyCommand(ctx);
  }
});
bot.hears(/^(?:الهدايا|هدايا)$/i, (ctx) => GroupGamesHandler.handleGiftCatalogCommand(ctx));
bot.hears(/^(?:ممتلكاتي|ممتلكاتي\s*بالجروب|املاكي|أملاكي)$/i, (ctx) => GroupGamesHandler.handleAssetsCommand(ctx));
bot.hears(/^(?:اغنى\s*ممتلكات|أغنى\s*ممتلكات|لوحة\s*الممتلكات)$/i, (ctx) => GroupGamesHandler.handleWealthCommand(ctx));
bot.hears(/^اهداء(?:\s+.+)?$/i, async (ctx) => {
  const handled = await BankGameHandler.handleAssetGiftText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleGiftCommand(ctx);
  }
});
bot.hears(/^ارسال(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGiftCommand(ctx));
bot.hears(/^(?:ملفي|حسابي\s*بالجروب)$/i, (ctx) => GroupGamesHandler.handleGroupProfileCommand(ctx));
bot.hears(/^(?:نقاطي|فلوسي|رصيدي)$/i, (ctx) => GroupGamesHandler.handleMyMoneyCommand(ctx));
bot.hears(/^(?:همس[هة])(?:\s+.+)?$/i, (ctx) => WhisperHandler.handleWhisperCommand(ctx));
bot.hears(/^(?:منح|اعطاء|إعطاء)\s*فلوس(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleOwnerGrantMoneyCommand(ctx));
bot.hears(/^(?:سحب|خصم)\s*فلوس(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleOwnerTakeMoneyCommand(ctx));
bot.hears(/^تحديد\s*جنسي\s*(?:ولد|بنت)$/i, (ctx) => GroupGamesHandler.handleSetGenderCommand(ctx));
bot.hears(/^حذف\s*جنسي$/i, (ctx) => GroupGamesHandler.handleDeleteGenderCommand(ctx));
bot.hears(/^جنسي$/i, (ctx) => GroupGamesHandler.handleMyGenderCommand(ctx));
bot.hears(/^جنسه(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleTargetGenderCommand(ctx));
bot.hears(/^الدخول\s*لفريق\s*العيال$/i, (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'boys'));
bot.hears(/^الدخول\s*لفريق\s*البنات$/i, (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'girls'));
bot.hears(/^الخروج\s*من\s*فريق(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleLeaveCompetitionTeamCommand(ctx));
bot.hears(/^فريقي$/i, (ctx) => GroupGamesHandler.handleMyCompetitionTeamCommand(ctx));
bot.hears(/^توب\s*التنافس$/i, (ctx) => GroupGamesHandler.handleCompetitionTopCommand(ctx));
bot.hears(/^عدد\s*البنات$/i, (ctx) => GroupGamesHandler.handleGenderCountCommand(ctx, 'girls'));
bot.hears(/^عدد\s*العيال$/i, (ctx) => GroupGamesHandler.handleGenderCountCommand(ctx, 'boys'));
bot.hears(/^اضف\s*كلمات\s*بنات(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'add_girls'));
bot.hears(/^اضف\s*كلمات\s*عيال(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'add_boys'));
bot.hears(/^حذف\s*كلمات\s*البنات$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'clear_girls'));
bot.hears(/^حذف\s*كلمات\s*العيال$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'clear_boys'));
bot.hears(/^حذف\s*كلمه\s*بنات(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'remove_girls'));
bot.hears(/^حذف\s*كلمه\s*عيال(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'remove_boys'));
bot.hears(/^كلمات\s*البنات$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'list_girls'));
bot.hears(/^كلمات\s*العيال$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'list_boys'));
bot.hears(/^اضف\s*رد\s*للبنات(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'add_girls'));
bot.hears(/^اضف\s*رد\s*للعيال(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'add_boys'));
bot.hears(/^حذف\s*رد\s*للبنات(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'remove_girls'));
bot.hears(/^حذف\s*رد\s*للعيال(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'remove_boys'));
bot.hears(/^مسح\s*ردود\s*البنات$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'clear_girls'));
bot.hears(/^مسح\s*ردود\s*العيال$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'clear_boys'));
bot.hears(/^ردود\s*البنات$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'list_girls'));
bot.hears(/^ردود\s*العيال$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'list_boys'));
bot.hears(/^سوالفكم$/i, (ctx) => GroupGamesHandler.handleStoryTalkStart(ctx));
bot.hears(/^(?:انهاء|إنهاء)\s*سوالفكم$/i, (ctx) => GroupGamesHandler.handleStoryTalkEnd(ctx));
bot.hears(/^استثمار\s*فلوسي$/i, (ctx) => GroupGamesHandler.handleInvestAllCommand(ctx));
bot.hears(/^حظ(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleLuckCommand(ctx));
bot.hears(/^(?:احصائيات|إحصائيات)\s*الحظ$/i, (ctx) => GroupGamesHandler.handleLuckStatsCommand(ctx));
bot.hears(/^حظر(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleBanCommand(ctx));
bot.hears(/^انشاء\s*قلع[هة]$/i, (ctx) => GroupGamesHandler.handleCreateCastleCommand(ctx));
bot.hears(/^قلعتي$/i, (ctx) => GroupGamesHandler.handleMyCastleCommand(ctx));
bot.hears(/^متجر\s*الموارد$/i, (ctx) => GroupGamesHandler.handleResourceStoreCommand(ctx));
bot.hears(/^شراء\s*موارد(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleBuyResourcesCommand(ctx));
bot.hears(/^مواردي$/i, (ctx) => GroupGamesHandler.handleMyResourcesCommand(ctx));
bot.hears(/^تطوير\s*قلعتي$/i, (ctx) => GroupGamesHandler.handleUpgradeCastleCommand(ctx));
bot.hears(/^انشاء\s*مع(?:ك|س)كر$/i, (ctx) => GroupGamesHandler.handleCreateBarracksCommand(ctx));
bot.hears(/^شراء\s*جيش(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleBuyArmyCommand(ctx));
bot.hears(/^تطوير\s*الجيش$/i, (ctx) => GroupGamesHandler.handleUpgradeArmyCommand(ctx));
bot.hears(/^بحث\s*الكنز$/i, (ctx) => GroupGamesHandler.handleTreasureSearchCommand(ctx));
bot.hears(/^(?:تفعيل|تعطيل)\s*الحصانه$/i, (ctx) => GroupGamesHandler.handleShieldToggleCommand(ctx));
bot.hears(/^حصانتي$/i, (ctx) => GroupGamesHandler.handleMyShieldCommand(ctx));
bot.hears(/^مبارزه$/i, (ctx) => GroupGamesHandler.handleCastleDuelCommand(ctx));
bot.hears(/^الانضمام\s*للمبارزه$/i, (ctx) => GroupGamesHandler.handleArenaJoinCommand(ctx));
bot.hears(/^المبارزين$/i, (ctx) => GroupGamesHandler.handleArenaListCommand(ctx));
bot.hears(/^توب\s*الحكام$/i, (ctx) => GroupGamesHandler.handleTopRulersCommand(ctx));
bot.hears(/^تحالف(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleAllianceRequestCommand(ctx));
bot.hears(/^طلبات\s*التحالف$/i, (ctx) => GroupGamesHandler.handleAllianceRequestsCommand(ctx));
bot.hears(/^قبول\s*تحالف$/i, (ctx) => GroupGamesHandler.handleAllianceDecisionCommand(ctx, 'accept'));
bot.hears(/^رفض\s*تحالف$/i, (ctx) => GroupGamesHandler.handleAllianceDecisionCommand(ctx, 'reject'));
bot.hears(/^(?:متصدرين\s*الشهر|سباق\s*الشهر)$/i, (ctx) => GroupGamesHandler.handleMonthlyBoardCommand(ctx));
bot.hears(/^(?:المستويات|لوحة\s*المستويات)$/i, (ctx) => GroupGamesHandler.handleLevelsCommand(ctx));
bot.hears(/^مكافا(?:ة|ه)\s*شهرية$/i, (ctx) => GroupGamesHandler.handleMonthlyRewardCommand(ctx));
bot.hears(/^مكافا(?:ت|ة)\s*المستوى(?:\s+\d+\s+\d+\s+\d+\s+\d+)?$/i, (ctx) => GroupGamesHandler.handleTierRewardsCommand(ctx));
bot.hears(/^(?:لعب|ابدأ|ابدا|القائمة|قائمة|العاب)$/i, (ctx) => GroupGamesHandler.handleQuickStart(ctx));
bot.hears(/^(?:مساعدة|ساعدني|الاوامر)$/i, (ctx) => GroupGamesHandler.handleGamesHelp(ctx));
bot.hears(/^➡️\s*الصفحة\s*التالية$/i, (ctx) => GroupGamesHandler.handleHelpKeyboardNavigation(ctx, 1));
bot.hears(/^⬅️\s*الصفحة\s*السابقة$/i, (ctx) => GroupGamesHandler.handleHelpKeyboardNavigation(ctx, -1));
bot.hears(/^(?:اخفاء\s*كيبورد|إخفاء\s*كيبورد)$/i, (ctx) => ctx.reply('✅ تم إخفاء لوحة المفاتيح.', Markup.removeKeyboard()));
bot.hears(/^(?:متجر|المتجر)$/i, (ctx) => GroupGamesHandler.handleStoreCommand(ctx));
bot.hears(/^(?:هدايا|هدية)$/i, (ctx) => GroupGamesHandler.handleGiftCatalogCommand(ctx));
bot.hears(/^متصدرين$/i, (ctx) => GroupGamesHandler.handleLeaderCommand(ctx));
bot.hears(/^ملفي$/i, (ctx) => GroupGamesHandler.handleGroupProfileCommand(ctx));
bot.hears(/^(?:سؤال\s*سريع|كويز)$/i, (ctx) => GroupGamesHandler.handleQuizCommand(ctx));
bot.hears(/^(?:حساب\s*ذهني|مسألة)$/i, (ctx) => GroupGamesHandler.handleMathCommand(ctx));
bot.hears(/^(?:ترتيب\s*كلمة|رتب\s*كلمة)$/i, (ctx) => GroupGamesHandler.handleWordCommand(ctx));
bot.hears(/^(?:تحدي\s*يومي|اليومي)$/i, (ctx) => GroupGamesHandler.handleDailyCommand(ctx));
bot.hears(/^(?:اختيارات|اختبار)$/i, (ctx) => GroupGamesHandler.handleMcqCommand(ctx));
bot.hears(/^ديني(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleReligiousMcqCommand(ctx));
bot.hears(/^علمي(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleScienceMcqCommand(ctx));
bot.hears(/^تاريخي(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleHistoryMcqCommand(ctx));
bot.hears(/^فقهي(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleFiqhMcqCommand(ctx));
bot.hears(/^جغرافي(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGeographyMcqCommand(ctx));
bot.hears(/^(?:فيزياء|فيزيائي)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handlePhysicsMcqCommand(ctx));
bot.hears(/^(?:حسابات|حسابي)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleCalculationsMcqCommand(ctx));
bot.hears(/^(?:تصويت|صوت)$/i, (ctx) => GroupGamesHandler.handleVoteCommand(ctx));
bot.hears(/^(?:متصدرين|الترتيب)$/i, (ctx) => GroupGamesHandler.handleLeaderCommand(ctx));
bot.hears(/^(?:اسبوعي|سباق\s*الأسبوع|سباق\s*الاسبوع)$/i, (ctx) => GroupGamesHandler.handleWeeklyCommand(ctx));
// Group Arabic slash aliases
bot.hears(/^\/(?:انشاء_حساب_بنكي|حساب_بنكي|gbank)$/i, (ctx) => BankGameHandler.handleCreateAccount(ctx));
bot.hears(/^\/(?:رتبتي|gmyrank)$/i, (ctx) => GroupAdminHandler.handleMyRankCommand(ctx));
bot.hears(/^\/(?:فحص|ginspect)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleInspectCommand(ctx));
bot.hears(/^\/(?:راتب|gsalary)$/i, (ctx) => BankGameHandler.handleSalary(ctx));
bot.hears(/^\/(?:حسابي|gaccount)$/i, (ctx) => BankGameHandler.handleAccountInfo(ctx));
bot.hears(/^\/(?:بخشيش|gtip)$/i, (ctx) => BankGameHandler.handleTip(ctx));
bot.hears(/^\/(?:زرف|gsteal)$/i, (ctx) => BankGameHandler.handleSteal(ctx));
bot.hears(/^\/(?:مضاربه|مضاربة|gspec)(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleSpeculate(ctx));
bot.hears(/^\/(?:العجله|العجلة|gwheel)$/i, (ctx) => BankGameHandler.handleWheel(ctx));
bot.hears(/^\/(?:سعر_الاسهم|سعرالاسهم|gstockprice)$/i, (ctx) => BankGameHandler.handleStocksPrice(ctx));
bot.hears(/^\/(?:شراء_اسهم|شراءاسهم|gbuystock)(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleBuyStocks(ctx));
bot.hears(/^\/(?:بيع_اسهم|بيعاسهم|gsellstock)(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleSellStocks(ctx));
bot.hears(/^\/(?:قرض|gloan)$/i, (ctx) => BankGameHandler.handleLoan(ctx));
bot.hears(/^\/(?:سجني|gjail)$/i, (ctx) => BankGameHandler.handlePrisonStatus(ctx));
bot.hears(/^\/(?:ديوني|gdebts)$/i, (ctx) => BankGameHandler.handleMyDebts(ctx));
bot.hears(/^\/(?:ديونه|gdebt_him)$/i, (ctx) => BankGameHandler.handleTargetDebts(ctx));
bot.hears(/^\/(?:سداد_ديوني|سدادديوني|grepay)$/i, (ctx) => BankGameHandler.handleRepayMine(ctx));
bot.hears(/^\/(?:سداد_ديونه|سدادديونه|grepay_him)$/i, (ctx) => BankGameHandler.handleRepayTarget(ctx));
bot.hears(/^\/(?:كتم|gmute)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleMuteCommand(ctx));
bot.hears(/^\/(?:الغاء_الكتم|إلغاء_الكتم|فك_الكتم|gunmute)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleUnmuteCommand(ctx));
bot.hears(/^\/(?:تقييد|grestrict)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleRestrictCommand(ctx));
bot.hears(/^\/(?:الغاء_التقييد|إلغاء_التقييد|فك_التقييد|gunrestrict)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleUnrestrictCommand(ctx));
bot.hears(/^\/(?:زواج|gmarry)\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])(?:\s+\d+)?$/i, (ctx) => BankGameHandler.handleMarriage(ctx));
bot.hears(/^\/(?:طلاق|gdivorce)\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i, (ctx) => BankGameHandler.handleDivorce(ctx));
bot.hears(/^\/(?:طلاق_زوجاتي|طلاقزوجاتي|gdivorce_all)$/i, (ctx) => BankGameHandler.handleDivorceAll(ctx));
bot.hears(/^\/(?:خلع|gkhula|خلع_زوجي)$/i, (ctx) => BankGameHandler.handleKhula(ctx));
bot.hears(/^\/(?:زواجي|gmarriage)$/i, (ctx) => BankGameHandler.handleMarriageInfo(ctx));
bot.hears(/^\/(?:زوجاتي|gwives)$/i, (ctx) => BankGameHandler.handleWivesList(ctx));
bot.hears(/^\/(?:زوجتي|gwife)\s+(?:الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i, (ctx) => BankGameHandler.handleSpecificWife(ctx));
bot.hears(/^\/(?:توب_المتزوجين|topmarried)$/i, (ctx) => BankGameHandler.handleTopMarried(ctx));
bot.hears(/^\/(?:حذف_المتزوجين|delmarried)$/i, (ctx) => BankGameHandler.handleDeleteMarried(ctx));
bot.hears(/^\/(?:انشاء_بطوله|tcreate)$/i, (ctx) => TournamentChallengeHandler.handleCreateTournamentCommand(ctx));
bot.hears(/^\/(?:اضف_اسئله_البطوله|taddq)$/i, (ctx) => TournamentChallengeHandler.handleAddQuestionsCommand(ctx));
bot.hears(/^\/(?:حذف_اسئله_البطوله|tdelq)$/i, (ctx) => TournamentChallengeHandler.handleDeleteQuestionsCommand(ctx));
bot.hears(/^\/(?:منضمين_البطوله|tjoined)$/i, (ctx) => TournamentChallengeHandler.handleTournamentJoinedGroups(ctx));
bot.hears(/^\/(?:البطولات|ttournaments)$/i, (ctx) => TournamentChallengeHandler.handleListTournaments(ctx));
bot.hears(/^\/(?:الانضمام_للبطوله|tjoin)$/i, (ctx) => TournamentChallengeHandler.handleGroupJoinTournament(ctx));
bot.hears(/^\/(?:انا|tme)$/i, (ctx) => TournamentChallengeHandler.handleParticipantJoin(ctx));
bot.hears(/^\/(?:تفعيل_البطوله|tenable)$/i, (ctx) => TournamentChallengeHandler.handleGroupTournamentToggle(ctx, true));
bot.hears(/^\/(?:تعطيل_البطوله|tdisable)$/i, (ctx) => TournamentChallengeHandler.handleGroupTournamentToggle(ctx, false));
bot.hears(/^\/(?:توب_القروبات|topgroups)$/i, (ctx) => BankGameHandler.handleTopGroups(ctx));
bot.hears(/^\/(?:توب_المتفاعلين|topactive)$/i, (ctx) => BankGameHandler.handleTopActiveInGroup(ctx));
bot.hears(/^\/(?:مين_انا|مينانا)$/i, (ctx) => GroupGamesHandler.handleWhoAmICommand(ctx));
bot.hears(/^\/(?:الغاز|الغاز_ذكية|لغز)$/i, (ctx) => GroupGamesHandler.handleRiddleCommand(ctx));
bot.hears(/^\/(?:سرعة_الكتابة|سرعة)$/i, (ctx) => GroupGamesHandler.handleTypingCommand(ctx));
bot.hears(/^\/(?:روليت|chance_ar)$/i, (ctx) => GroupGamesHandler.handleChanceCommand(ctx));
bot.hears(/^\/(?:كرسي_الاعتراف|gconfess)$/i, (ctx) => GroupGamesHandler.handleConfessionStart(ctx));
bot.hears(/^\/(?:انهاء_كرسي_الاعتراف|gconfessend)$/i, (ctx) => GroupGamesHandler.handleConfessionEnd(ctx));
bot.hears(/^\/(?:لاونج|glounge)$/i, (ctx) => GroupGamesHandler.handleLoungeMenuCommand(ctx));
bot.hears(/^\/(?:مستلزماتي|supplies)$/i, (ctx) => GroupGamesHandler.handleLoungeSuppliesCommand(ctx));
bot.hears(/^\/(?:اشتغل_بالكافيتيريا|gcafework)$/i, (ctx) => GroupGamesHandler.handleCafeWorkCommand(ctx));
bot.hears(/^\/(?:طلب_كافيتيريا|gcafereq)$/i, (ctx) => GroupGamesHandler.handleCafeRequestCommand(ctx));
bot.hears(/^\/(?:سلم_الطلب|gcafedeliver)$/i, (ctx) => GroupGamesHandler.handleCafeDeliverCommand(ctx));
bot.hears(/^\/(?:مزاجي|gmood)$/i, (ctx) => GroupGamesHandler.handleMoodCommand(ctx));
bot.hears(/^\/(?:اشرب_قهوة|اشرب_شاي|اشرب_نسكفيه|اشرب_كابتشينو|اشرب_شاي_لاتيه|اشرب_هوت_شوكليت|اشرب_ماء|اشرب_حليب|اشرب_لبن|اشرب_عصير|اشرب_موهيتو|اشرب_برتقال|اشرب_ليمون|اشرب_فواكه|اشرب_موز|اشرب_افوكادو|اشرب_فراولة|اشرب_مانجا|اشرب_سفن_اب|اشرب_كوكاكولا|اشرب_ماريندا|اكل_شاورما|اكل_دجاجة_مشوية|اكل_كباب|اكل_مشاوي_مشكل|كول_شاورما|كول_كباب|كول_مشاوي_مشكل|كول_تمر|كول_خبز|كول_حلويات|البس_ملابس_حريمي|البس_ملابس_رجالي|البس_ملابس_اطفال|البس_ملابس_صبايا|drink|eat|wear)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleCafeConsumeCommand(ctx));
bot.hears(/^\/(?:البس|إلبس|لبس)(?:@\w+)?(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleWearCommand(ctx));
bot.hears(/^\/(?:توب_الكافيتيريا|gtopcafe)$/i, (ctx) => GroupGamesHandler.handleCafeTopCommand(ctx));
bot.hears(/^\/(?:توب_لاونج|toplounge)$/i, (ctx) => GroupGamesHandler.handleCafeTopCommand(ctx));
bot.hears(/^\/(?:توب_نفس_ارجيلة|gtophookah)$/i, (ctx) => GroupGamesHandler.handleHookahPuffsTopCommand(ctx));
bot.hears(/^\/(?:توب_الدخان|gtopsmoke)$/i, (ctx) => GroupGamesHandler.handleSmokePuffsTopCommand(ctx));
bot.hears(/^\/(?:افتح_جلسة_ارجيلة|ghookahsession)$/i, (ctx) => GroupGamesHandler.handleHookahSessionOpen(ctx));
bot.hears(/^\/(?:انضم|gjoin)$/i, (ctx) => GroupGamesHandler.handleHookahSessionJoin(ctx));
bot.hears(/^\/(?:ولع_سيجارة|ولع_دخان|ولع_سيجار|شغل_فيب|جهز_ارجيلة|ignite)$/i, (ctx) => GroupGamesHandler.handleLoungeIgniteCommand(ctx));
bot.hears(/^\/(?:هف|huff|puff)$/i, (ctx) => GroupGamesHandler.handleLoungePuffCommand(ctx));
bot.hears(/^\/(?:تحدي)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleDuelCommand(ctx));
bot.hears(/^\/(?:متجر_الجروب|المتجر)$/i, (ctx) => GroupGamesHandler.handleStoreCommand(ctx));
bot.hears(/^\/(?:شراء_هدية|شراءهدية|شراء_هديه|شراءهديه)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleBuyGiftForSelfCommand(ctx));
bot.hears(/^\/(?:بيع_هدية|بيعهدية|بيع_هديه|بيعهديه)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleSellGiftCommand(ctx));
bot.hears(/^\/(?:كشط|كشط_اكواد|كشطاكواد)(?:\s+\d+)?$/i, (ctx) => GroupGamesHandler.handleScratchCommand(ctx));
bot.hears(/^\/(?:احصائيات_الكشط|إحصائيات_الكشط|احصائياتالكشط|إحصائياتالكشط)$/i, (ctx) => GroupGamesHandler.handleScratchStatsCommand(ctx));
bot.hears(/^\/(?:بيع)(?:\s+.+)?$/i, async (ctx) => {
  const handledLounge = await GroupGamesHandler.handleLoungeSellCommand(ctx);
  if (handledLounge) return;
  const handled = await BankGameHandler.handleAssetSellText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleSimpleSellCommand(ctx);
  }
});
bot.hears(/^\/(?:شراء)(?!\s*موارد)(?!\s*جيش)(?:\s+.+)?$/i, async (ctx) => {
  const handledLounge = await GroupGamesHandler.handleLoungeBuyCommand(ctx);
  if (handledLounge) return;
  const handled = await BankGameHandler.handleAssetBuyText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleSimpleBuyCommand(ctx);
  }
});
bot.hears(/^\/(?:هدايا|الهدايا)$/i, (ctx) => GroupGamesHandler.handleGiftCatalogCommand(ctx));
bot.hears(/^\/(?:ممتلكاتي|املاكي|أملاكي)$/i, (ctx) => GroupGamesHandler.handleAssetsCommand(ctx));
bot.hears(/^\/(?:اغنى_ممتلكات|أغنى_ممتلكات|لوحة_الممتلكات)$/i, (ctx) => GroupGamesHandler.handleWealthCommand(ctx));
bot.hears(/^\/(?:اهداء)(?:\s+.+)?$/i, async (ctx) => {
  const handled = await BankGameHandler.handleAssetGiftText(ctx);
  if (!handled) {
    return GroupGamesHandler.handleGiftCommand(ctx);
  }
});
bot.hears(/^\/(?:ارسال)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGiftCommand(ctx));
bot.hears(/^\/(?:ملفي|ملفي_بالجروب)$/i, (ctx) => GroupGamesHandler.handleGroupProfileCommand(ctx));
bot.hears(/^\/(?:نقاطي|فلوسي|رصيدي)$/i, (ctx) => GroupGamesHandler.handleMyMoneyCommand(ctx));
bot.hears(/^\/(?:همسه|همسة|whisper)(?:\s+.+)?$/i, (ctx) => WhisperHandler.handleWhisperCommand(ctx));
bot.hears(/^\/(?:منح_فلوس|اعطاء_فلوس|إعطاء_فلوس|ggrantmoney)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleOwnerGrantMoneyCommand(ctx));
bot.hears(/^\/(?:سحب_فلوس|خصم_فلوس|gtakemoney)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleOwnerTakeMoneyCommand(ctx));
bot.hears(/^\/(?:تحديد_جنسي|gsetgender)\s+(?:ولد|بنت)$/i, (ctx) => GroupGamesHandler.handleSetGenderCommand(ctx));
bot.hears(/^\/(?:حذف_جنسي|gdelgender)$/i, (ctx) => GroupGamesHandler.handleDeleteGenderCommand(ctx));
bot.hears(/^\/(?:جنسي|ggender)$/i, (ctx) => GroupGamesHandler.handleMyGenderCommand(ctx));
bot.hears(/^\/(?:جنسه|ggenderof)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleTargetGenderCommand(ctx));
bot.hears(/^\/(?:gjoinboys|الدخول_لفريق_العيال)$/i, (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'boys'));
bot.hears(/^\/(?:gjoingirls|الدخول_لفريق_البنات)$/i, (ctx) => GroupGamesHandler.handleJoinCompetitionTeamCommand(ctx, 'girls'));
bot.hears(/^\/(?:gleaveteam|الخروج_من_فريق)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleLeaveCompetitionTeamCommand(ctx));
bot.hears(/^\/(?:gmyteam|فريقي)$/i, (ctx) => GroupGamesHandler.handleMyCompetitionTeamCommand(ctx));
bot.hears(/^\/(?:gteamtop|توب_التنافس)$/i, (ctx) => GroupGamesHandler.handleCompetitionTopCommand(ctx));
bot.hears(/^\/(?:عدد_البنات)$/i, (ctx) => GroupGamesHandler.handleGenderCountCommand(ctx, 'girls'));
bot.hears(/^\/(?:عدد_العيال)$/i, (ctx) => GroupGamesHandler.handleGenderCountCommand(ctx, 'boys'));
bot.hears(/^\/(?:اضف_كلمات_بنات|gaddgirlwords)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'add_girls'));
bot.hears(/^\/(?:اضف_كلمات_عيال|gaddboywords)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'add_boys'));
bot.hears(/^\/(?:حذف_كلمات_البنات)$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'clear_girls'));
bot.hears(/^\/(?:حذف_كلمات_العيال)$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'clear_boys'));
bot.hears(/^\/(?:حذف_كلمه_بنات|gdelgirlword)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'remove_girls'));
bot.hears(/^\/(?:حذف_كلمه_عيال|gdelboyword)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'remove_boys'));
bot.hears(/^\/(?:كلمات_البنات)$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'list_girls'));
bot.hears(/^\/(?:كلمات_العيال)$/i, (ctx) => GroupGamesHandler.handleGenderWordsCommand(ctx, 'list_boys'));
bot.hears(/^\/(?:اضف_رد_للبنات|gaddgirlreply)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'add_girls'));
bot.hears(/^\/(?:اضف_رد_للعيال|gaddboyreply)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'add_boys'));
bot.hears(/^\/(?:حذف_رد_للبنات|gdelgirlreply)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'remove_girls'));
bot.hears(/^\/(?:حذف_رد_للعيال|gdelboyreply)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'remove_boys'));
bot.hears(/^\/(?:مسح_ردود_البنات)$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'clear_girls'));
bot.hears(/^\/(?:مسح_ردود_العيال)$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'clear_boys'));
bot.hears(/^\/(?:ردود_البنات)$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'list_girls'));
bot.hears(/^\/(?:ردود_العيال)$/i, (ctx) => GroupGamesHandler.handleGenderRepliesCommand(ctx, 'list_boys'));
bot.hears(/^\/(?:سوالفكم|gstories)$/i, (ctx) => GroupGamesHandler.handleStoryTalkStart(ctx));
bot.hears(/^\/(?:(?:انهاء|إنهاء)_سوالفكم|gendstories)$/i, (ctx) => GroupGamesHandler.handleStoryTalkEnd(ctx));
bot.hears(/^\/(?:استثمار_فلوسي|استثمار)$/i, (ctx) => GroupGamesHandler.handleInvestAllCommand(ctx));
bot.hears(/^\/(?:حظ|gluck)(?:\s+.+)?$/i, (ctx) => GroupGamesHandler.handleLuckCommand(ctx));
bot.hears(/^\/(?:احصائيات_الحظ|إحصائيات_الحظ|احصائياتالحظ|إحصائياتالحظ|gluckstats)$/i, (ctx) => GroupGamesHandler.handleLuckStatsCommand(ctx));
bot.hears(/^\/(?:حظر)(?:\s+.+)?$/i, (ctx) => GroupAdminHandler.handleBanCommand(ctx));
bot.hears(/^\/(?:متصدرين_الشهر|سباق_الشهر)$/i, (ctx) => GroupGamesHandler.handleMonthlyBoardCommand(ctx));
bot.hears(/^\/(?:المستويات|لوحة_المستويات)$/i, (ctx) => GroupGamesHandler.handleLevelsCommand(ctx));
bot.hears(/^\/(?:مكافاة_شهرية|مكافاه_شهرية)$/i, (ctx) => GroupGamesHandler.handleMonthlyRewardCommand(ctx));
bot.hears(/^\/(?:مكافات_المستوى|مكافآت_المستوى)(?:\s+\d+\s+\d+\s+\d+\s+\d+)?$/i, (ctx) => GroupGamesHandler.handleTierRewardsCommand(ctx));
bot.hears(/^\/(?:لعب|قائمة|ابدأ)$/i, (ctx) => GroupGamesHandler.handleQuickStart(ctx));
bot.hears(/^\/(?:مساعدة|الاوامر)$/i, (ctx) => GroupGamesHandler.handleGamesHelp(ctx));
bot.hears(/^(?:اخفاء كيبورد|إخفاء كيبورد)$/i, (ctx) => ctx.reply('✅ تم إخفاء لوحة المفاتيح.', Markup.removeKeyboard()));
bot.hears(/^\/(?:اخفاء_كيبورد|إخفاء_كيبورد|hide_keyboard)$/i, (ctx) => ctx.reply('✅ تم إخفاء لوحة المفاتيح.', Markup.removeKeyboard()));
bot.hears(/^\/(?:متجر|المتجر)$/i, (ctx) => GroupGamesHandler.handleStoreCommand(ctx));
bot.hears(/^\/(?:هدايا|هدية)$/i, (ctx) => GroupGamesHandler.handleGiftCatalogCommand(ctx));
bot.hears(/^\/(?:متصدرين)$/i, (ctx) => GroupGamesHandler.handleLeaderCommand(ctx));
bot.hears(/^\/(?:ملفي)$/i, (ctx) => GroupGamesHandler.handleGroupProfileCommand(ctx));

bot.action(/^xo:move:([a-z0-9]+):([0-8])$/i, (ctx) => ChatGamesUtilityHandler.handleXoAction(ctx));
bot.action(/^xo:challenge:(accept|decline):([a-z0-9]+)$/i, (ctx) => ChatGamesUtilityHandler.handleXoChallengeAction(ctx));
bot.action(/^group:whisper:open:([a-z0-9]+)$/i, (ctx) => WhisperHandler.handleWhisperOpen(ctx, ctx.match[1]));

bot.on('location', (ctx) => ChatGamesUtilityHandler.handleLocationMessage(ctx));

// --- TEXT HANDLER FOR IMAGE GENERATION AND QURANIC GAMES ---
bot.on('text', async (ctx, next) => {
  // Check if user is waiting for image prompt using the new Set system
  if (ctx.from && imageHandler.isWaitingForImagePrompt(ctx.from.id)) {
    const handled = await imageHandler.handleTextMessage(ctx);
    if (handled) return;
  }

  // Handle whisper compose in private only.
  if (await WhisperHandler.handlePrivateText(ctx)) {
    return;
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

    const shareMessage = `🌟 اقتباس من البوت الإسلامي الذكي 🤖\n\n${quote}\n\n✨ <i>شارك هذا الاقتباس مع أصدقائك!</i>`;

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

    if (GroupAdminHandler.isGroupChat(ctx)) {
      const handledTournament = await TournamentChallengeHandler.handleGroupText(ctx, message);
      if (handledTournament) return;
      const handledGame = await GroupGamesHandler.handleIncomingGroupText(ctx, message);
      if (handledGame) return;
      const wasModerated = await GroupAdminHandler.processGroupMessage(ctx);
      if (wasModerated) return;
      // Keep group chats isolated from private feature flows.
      return;
    }

    // ⭐ CHECK GUESS GAME INPUT FIRST (before all other handlers)
    const GuessNumberGame = require('./games/guessNumberGame');
    if (GuessNumberGame.isGameActive(ctx)) {
      console.log('🎮 اللعبة نشطة - معالجة التخمين');
      await GuessNumberGame.processGuess(ctx, message);
      return;
    }

    logger.info(`TEXT_RECEIVED: ${String(message).substring(0, 30)}`);

    const handledTemplateText = await GroupAdminHandler.handlePrivateTemplateText(ctx, message);
    if (handledTemplateText) return;

    const handledTournamentPrivate = await TournamentChallengeHandler.handlePrivateText(ctx, message);
    if (handledTournamentPrivate) return;

    const handledOwnerGlobalSpecialFaq = await GroupAdminHandler.handleOwnerPrivateSpecialFaqText(ctx, message);
    if (handledOwnerGlobalSpecialFaq) return;

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
            const searchRegex = new RegExp(escapeRegex(message.trim()), 'i');
            foundUser = await User.findOne({
              $or: [{ firstName: searchRegex }, { username: searchRegex }]
            });
          }

          ctx.session.adminAwait = null;

          if (!foundUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          const userInfo =
            '👤 <b>معلومات المستخدم</b>\n\n' +
            `👤 الاسم: ${escapeHtml(foundUser.firstName || 'مستخدم')}\n` +
            `🆔 ID: ${foundUser.userId}\n` +
            `⭐ النقاط: ${foundUser.xp || 0}\n` +
            `🎖️ المستوى: ${foundUser.level || 1}\n` +
            `💰 العملات: ${foundUser.coins || 0}\n` +
            `🚫 الحالة: ${foundUser.isBanned || foundUser.banned ? 'محظور' : 'نشط'}\n` +
            `📅 تاريخ الانضمام: ${new Date(foundUser.joinDate).toLocaleDateString('ar')}`;

          const buttons = Markup.inlineKeyboard([
            [Markup.button.callback('🚫 حظر', `admin:ban:${foundUser.userId}`)],
            [Markup.button.callback('✅ السماح', `admin:unban:${foundUser.userId}`)],
            [Markup.button.callback('⬅️ رجوع', 'settings:users')]
          ]);

          return ctx.reply(userInfo, { parse_mode: 'HTML', reply_markup: buttons.reply_markup });
        }

        if (awaiting.type === 'broadcast') {
          // Handle broadcast message
          if (message.toLowerCase() === '/cancel') {
            ctx.session.adminAwait = null;
            return ctx.reply('❌ تم الإلغاء');
          }

          const allUsers = await User.find(getActiveUsersQuery());
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
      const { User, Transaction, GameStats, Content } = require('./database/models');
      const UIManager = require('./ui/keyboards');

      if (!UIManager.isOwner(ctx.from.id)) {
        ctx.session.ownerAwait = null;
        return ctx.reply('❌ غير مصرح');
      }

      try {
        const input = message.trim();

        if (isCancelInput(input)) {
          ctx.session.ownerAwait = null;
          return ctx.reply('❌ تم الإلغاء');
        }

        if (awaiting.type === 'broadcast') {
          const allUsers = await User.find(getActiveUsersQuery());
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
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(`✅ <b>تم الإرسال</b>\n\n✅ نجح: ${sent}\n❌ فشل: ${failed}`, {
            parse_mode: 'HTML'
          });
        }

        if (awaiting.type === 'givecoins') {
          const parts = input.split(/\s+/);
          if (parts.length !== 2) {
            return ctx.reply('❌ الصيغة غير صحيحة\nأرسل: ID المبلغ\nمثال: 123456789 1000');
          }

          const userId = parsePositiveInt(parts[0]);
          const amount = parsePositiveInt(parts[1]);

          if (!userId || !amount) {
            return ctx.reply('❌ القيم غير صحيحة');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.coins = (targetUser.coins || 0) + amount;
          targetUser.totalEarnings = (targetUser.totalEarnings || 0) + amount;
          await targetUser.save();

          ctx.session.ownerAwait = null;

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
              `المستخدم: ${escapeHtml(targetUser.firstName || 'مستخدم')}\n` +
              `المبلغ: ${amount} عملة\n` +
              `الرصيد الجديد: ${targetUser.coins} عملة`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'rewardall') {
          const amount = parsePositiveInt(input);
          if (!amount) {
            return ctx.reply('❌ المبلغ غير صحيح');
          }

          const allUsers = await User.find(getActiveUsersQuery());
          let updated = 0;

          await ctx.reply(`⏳ جاري توزيع ${amount} عملة لـ ${allUsers.length} مستخدم...`);

          for (const user of allUsers) {
            user.coins = (user.coins || 0) + amount;
            user.totalEarnings = (user.totalEarnings || 0) + amount;
            await user.save();
            updated++;

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

        if (awaiting.type === 'searchUser') {
          let foundUser = null;
          const numericId = parsePositiveInt(input);
          if (numericId) {
            foundUser = await User.findOne({ userId: numericId });
          } else {
            const searchRegex = new RegExp(escapeRegex(input), 'i');
            foundUser = await User.findOne({
              $or: [{ firstName: searchRegex }, { username: searchRegex }]
            });
          }

          ctx.session.ownerAwait = null;

          if (!foundUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          const isBanned = Boolean(foundUser.isBanned || foundUser.banned);
          const joinDate = foundUser.joinDate || foundUser.createdAt || new Date();

          const messageText =
            '👤 <b>نتيجة البحث</b>\n\n' +
            `👤 الاسم: ${escapeHtml(foundUser.firstName || 'مستخدم')}\n` +
            `📛 اليوزر: ${escapeHtml(foundUser.username || 'بدون')}\n` +
            `🆔 ID: <code>${foundUser.userId}</code>\n` +
            `💰 العملات: ${foundUser.coins || 0}\n` +
            `⭐ XP: ${foundUser.xp || 0}\n` +
            `🎖️ المستوى: ${foundUser.level || 1}\n` +
            `🚫 الحالة: ${isBanned ? 'محظور' : 'نشط'}\n` +
            `📅 الانضمام: ${new Date(joinDate).toLocaleDateString('ar')}`;

          const keyboard = Markup.inlineKeyboard([
            [
              isBanned
                ? Markup.button.callback('✅ إلغاء الحظر', `admin:unban:${foundUser.userId}`)
                : Markup.button.callback('🚫 حظر المستخدم', `admin:ban:${foundUser.userId}`)
            ],
            [Markup.button.callback('⬅️ رجوع', 'owner:users')]
          ]);

          return ctx.reply(messageText, {
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup
          });
        }

        if (awaiting.type === 'banUser') {
          const parts = input.split(/\s+/);
          const userId = parsePositiveInt(parts[0]);
          const reason = parts.slice(1).join(' ').trim() || 'تم الحظر من قبل المالك';

          if (!userId) {
            return ctx.reply('❌ الصيغة غير صحيحة. أرسل: ID سبب_اختياري');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.isBanned = true;
          targetUser.banned = true;
          targetUser.bannedAt = new Date();
          targetUser.banReason = reason;
          await targetUser.save();

          ctx.session.ownerAwait = null;

          try {
            await ctx.telegram.sendMessage(
              targetUser.userId,
              `🚫 <b>تم حظرك من البوت</b>\n\nالسبب: ${escapeHtml(reason)}`,
              { parse_mode: 'HTML' }
            );
          } catch (e) {
            // User blocked bot
          }

          return ctx.reply(
            `✅ تم حظر المستخدم <b>${escapeHtml(targetUser.firstName || 'مستخدم')}</b> بنجاح.`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'unbanUser') {
          const userId = parsePositiveInt(input);
          if (!userId) {
            return ctx.reply('❌ الصيغة غير صحيحة. أرسل ID المستخدم.');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.isBanned = false;
          targetUser.banned = false;
          targetUser.bannedAt = null;
          targetUser.banReason = null;
          await targetUser.save();

          ctx.session.ownerAwait = null;
          return ctx.reply(
            `✅ تم إلغاء حظر المستخدم <b>${escapeHtml(targetUser.firstName || 'مستخدم')}</b>.`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'giveXp') {
          const parts = input.split(/\s+/);
          if (parts.length !== 2) {
            return ctx.reply('❌ الصيغة غير صحيحة. أرسل: ID المبلغ');
          }

          const userId = parsePositiveInt(parts[0]);
          const amount = parsePositiveInt(parts[1]);
          if (!userId || !amount) {
            return ctx.reply('❌ القيم غير صحيحة');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.xp = (targetUser.xp || 0) + amount;
          targetUser.level = Math.max(targetUser.level || 1, Math.floor((targetUser.xp || 0) / 100) + 1);
          await targetUser.save();

          ctx.session.ownerAwait = null;
          return ctx.reply(
            '✅ تم إضافة XP بنجاح\n' +
              `👤 المستخدم: ${escapeHtml(targetUser.firstName || 'مستخدم')}\n` +
              `⭐ المضاف: ${amount}\n` +
              `📈 XP الحالي: ${targetUser.xp}`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'resetUser') {
          const userId = parsePositiveInt(input);
          if (!userId) {
            return ctx.reply('❌ الصيغة غير صحيحة. أرسل ID المستخدم.');
          }

          const targetUser = await User.findOne({ userId });
          if (!targetUser) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          targetUser.level = 1;
          targetUser.xp = 0;
          targetUser.coins = 100;
          targetUser.totalEarnings = 100;
          targetUser.totalSpending = 0;
          targetUser.dailyReward = { streak: 0 };
          targetUser.gamesPlayed = { total: 0, wins: 0 };
          targetUser.inventory = [];
          targetUser.activeBoosts = [];
          targetUser.badges = [];
          targetUser.badgeDetails = [];
          targetUser.achievements = [];
          targetUser.savedKhatmas = [];
          targetUser.notificationsLog = [];
          targetUser.transfersCount = 0;
          targetUser.receivedTransfers = 0;
          targetUser.totalTransferred = 0;
          targetUser.totalReceived = 0;
          targetUser.banned = false;
          targetUser.isBanned = false;
          targetUser.banReason = null;
          targetUser.bannedAt = null;
          await targetUser.save();

          ctx.session.ownerAwait = null;
          return ctx.reply(
            `✅ تم إعادة تعيين بيانات المستخدم <b>${escapeHtml(targetUser.firstName || 'مستخدم')}</b>.`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'deleteUser') {
          const parts = input.split(/\s+/);
          const userId = parsePositiveInt(parts[0]);
          const confirm = (parts[1] || '').toUpperCase();

          if (!userId || confirm !== 'CONFIRM') {
            return ctx.reply('❌ الصيغة غير صحيحة. أرسل: ID CONFIRM');
          }

          const deleted = await User.findOneAndDelete({ userId });
          if (!deleted) {
            return ctx.reply('❌ لم يتم العثور على المستخدم');
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(`✅ تم حذف المستخدم <code>${userId}</code> نهائياً.`, {
            parse_mode: 'HTML'
          });
        }

        if (awaiting.type === 'taxall') {
          const amount = parsePositiveInt(input);
          if (!amount) {
            return ctx.reply('❌ قيمة الخصم غير صحيحة');
          }

          const allUsers = await User.find(getActiveUsersQuery());
          let affected = 0;
          let totalDeducted = 0;

          for (const user of allUsers) {
            const currentCoins = Math.max(user.coins || 0, 0);
            const deduction = Math.min(currentCoins, amount);
            if (deduction <= 0) continue;

            user.coins = currentCoins - deduction;
            user.totalSpending = (user.totalSpending || 0) + deduction;
            await user.save();
            affected++;
            totalDeducted += deduction;
          }

          ctx.session.ownerAwait = null;
          return ctx.reply(
            '✅ تم تنفيذ الخصم الجماعي\n' +
              `👥 المستخدمون المتأثرون: ${affected}\n` +
              `💸 مجموع المخصوم: ${totalDeducted}`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'restorePreview') {
          const BackupSystem = require('./utils/backupSystem');
          const backup = new BackupSystem();
          const result = await backup.restoreFromBackup(input, { dryRun: true });

          if (!result.success) {
            return ctx.reply(`❌ فشل قراءة النسخة الاحتياطية: ${escapeHtml(result.error || 'خطأ غير معروف')}`, {
              parse_mode: 'HTML'
            });
          }

          ctx.session.ownerAwait = null;

          const stats = result.statistics || {};
          return ctx.reply(
            '🔎 <b>معاينة النسخة الاحتياطية</b>\n\n' +
              `✅ الحالة: ${escapeHtml(result.message || 'جاهزة')}\n` +
              `👥 المستخدمون: ${stats.totalUsers || stats.users || 0}\n` +
              `💬 المجموعات: ${stats.totalGroups || stats.groups || 0}\n` +
              `🧾 المعاملات: ${stats.totalTransactions || stats.transactions || 0}\n` +
              `🎮 الألعاب: ${stats.totalGameStats || stats.gameStats || 0}`,
            { parse_mode: 'HTML' }
          );
        }

        if (awaiting.type === 'dbQuery') {
          const [collectionInput, limitInput] = input.split(/\s+/);
          const collection = (collectionInput || '').toLowerCase();
          const limit = Math.max(1, Math.min(parsePositiveInt(limitInput) || 5, 20));

          const queryMap = {
            users: {
              model: User,
              title: 'المستخدمون',
              formatter: (doc) =>
                `👤 ${escapeHtml(doc.firstName || 'مستخدم')} | ID: <code>${doc.userId}</code>\n` +
                `💰 ${doc.coins || 0} | ⭐ ${doc.xp || 0} | 🚫 ${doc.isBanned || doc.banned ? 'محظور' : 'نشط'}`
            },
            transactions: {
              model: Transaction,
              title: 'المعاملات',
              formatter: (doc) =>
                `🧾 <code>${doc._id}</code>\n` +
                `👤 ${doc.userId} | النوع: ${escapeHtml(doc.type)} | المبلغ: ${doc.amount}\n` +
                `📅 ${new Date(doc.createdAt || Date.now()).toLocaleString('ar')}`
            },
            games: {
              model: GameStats,
              title: 'إحصائيات الألعاب',
              formatter: (doc) =>
                `🎮 ${escapeHtml(doc.gameName || 'غير معروف')} | ID: <code>${doc.userId}</code>\n` +
                `▶️ ${doc.played || 0} | 🏆 ${doc.won || 0} | 💥 ${doc.lost || 0}`
            },
            content: {
              model: Content,
              title: 'المحتوى',
              formatter: (doc) =>
                `📚 ${escapeHtml(doc.contentType || 'غير معروف')}\n` +
                `🏷️ ${escapeHtml(doc.category || 'بدون')} | ✅ ${doc.isActive ? 'نشط' : 'متوقف'}\n` +
                `<code>${doc._id}</code>`
            }
          };

          const queryConfig = queryMap[collection];
          if (!queryConfig) {
            return ctx.reply(
              '❌ مجموعة غير مدعومة.\nاستخدم: users أو transactions أو games أو content'
            );
          }

          const docs = await queryConfig.model.find({}).sort({ createdAt: -1 }).limit(limit).lean();
          ctx.session.ownerAwait = null;

          if (docs.length === 0) {
            return ctx.reply(`ℹ️ لا توجد بيانات في مجموعة ${queryConfig.title}.`);
          }

          let response = `🔍 <b>نتيجة الاستعلام: ${queryConfig.title}</b>\n`;
          response += `📦 العدد: ${docs.length}\n\n`;
          docs.forEach((doc, index) => {
            response += `<b>${index + 1})</b>\n${queryConfig.formatter(doc)}\n\n`;
          });

          return ctx.reply(response.trim(), { parse_mode: 'HTML' });
        }

        ctx.session.ownerAwait = null;
        return ctx.reply('❌ نوع العملية غير معروف. أعد المحاولة من لوحة المالك.');
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

    // Default response for unrecognized messages (private chats only)
    if (ctx.chat?.type === 'private') {
      await ctx.reply('❓ لم أفهم رسالتك. يرجى استخدام الأوامر المتاحة أو الأزرار في القائمة الرئيسية.', { parse_mode: 'HTML' });
    }
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

      // Launch bot with explicit update types so quiz poll answers are always received.
      bot
        .launch({
          allowedUpdates: ['message', 'edited_message', 'callback_query', 'inline_query', 'poll_answer', 'chat_member']
        })
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
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));

const parseRewardUserId = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const raw =
    body.user_id ||
    body.userId ||
    body.tg_id ||
    body.telegram_id ||
    query.user_id ||
    query.userId ||
    query.tg_id ||
    query.telegram_id ||
    query.uid;
  const n = parseInt(String(raw || '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const hasValidAdsgramSecret = (req) => {
  const expected = String(process.env.ADSGRAM_REWARD_SECRET || '').trim();
  if (!expected) return true; // optional for quick setup, recommended to set in production
  const provided =
    String(req.query?.secret || '').trim() ||
    String(req.headers['x-adsgram-secret'] || '').trim() ||
    String(req.body?.secret || '').trim();
  return provided === expected;
};

app.all('/adsgram/reward', async (req, res) => {
  try {
    if (!hasValidAdsgramSecret(req)) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const userId = parseRewardUserId(req);
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'missing_user_id' });
    }

    const rewardCoins = Math.max(1, parseInt(process.env.ADSGRAM_REWARD_COINS || '5', 10) || 5);
    const EconomyManager = require('./economy/economyManager');
    const newBalance = await EconomyManager.addCoins(userId, rewardCoins, 'adsgram_reward');
    if (newBalance === null) {
      return res.status(500).json({ ok: false, error: 'reward_failed' });
    }

    try {
      await bot.telegram.sendMessage(
        userId,
        `🎁 مكافأة إعلان\n\nتم إضافة ${rewardCoins} عملة إلى رصيدك.\n💰 رصيدك الحالي: ${newBalance}`
      );
    } catch (_notifyError) {
      // user may block bot; ignore
    }

    logger.info(`✅ AdsGram reward applied: user=${userId}, coins=${rewardCoins}`);
    return res.status(200).json({ ok: true, userId, rewardCoins, balance: newBalance });
  } catch (error) {
    logger.error('❌ AdsGram reward endpoint error:', error.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

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
