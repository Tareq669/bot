/**
 * أوامر حماية المجموعات
 * Group Protection Commands
 */
const { isGroup, isAdmin, sendPrivateChatError, sendNotAdminError, lockItem, unlockItem, getOrCreateGroupSettings, formatSettingsMessage } = require('../utils/groupHelper');
const groupKeyboards = require('../ui/groupKeyboards');

/**
 * عرض إعدادات الحماية
 */
async function handleProtection(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const settings = await getOrCreateGroupSettings(groupId);

  const message = formatSettingsMessage(settings);
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: groupKeyboards.protectionKeyboard()
  });
}

/**
 * قفل عنصر معين
 */
async function handleLock(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ usage: قفل + اسم_العنصر');
  }

  const item = args[1];
  const method = args.includes('بالطرد') ? 'kick' : 'mute';

  await lockItem(ctx, item, method);
  await ctx.reply(`✅ تم قفل: ${item}`);
}

/**
 * فتح عنصر معين
 */
async function handleUnlock(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ usage: فتح + اسم_العنصر');
  }

  const item = args[1];
  await unlockItem(ctx, item);
  await ctx.reply(`✅ تم فتح: ${item}`);
}

/**
 * قفل الكل
 */
async function handleLockAll(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const settings = await getOrCreateGroupSettings(groupId);

  // قفل كل العناصر
  const lockKeys = Object.keys(settings.locks);
  for (const key of lockKeys) {
    if (key !== 'lockMethod') {
      settings.locks[key] = true;
    }
  }

  settings.updatedAt = new Date();
  await settings.save();

  await ctx.reply('✅ تم قفل جميع العناصر');
}

/**
 * فتح الكل
 */
async function handleUnlockAll(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const settings = await getOrCreateGroupSettings(groupId);

  // فتح كل العناصر
  const lockKeys = Object.keys(settings.locks);
  for (const key of lockKeys) {
    settings.locks[key] = false;
  }

  settings.updatedAt = new Date();
  await settings.save();

  await ctx.reply('✅ تم فتح جميع العناصر');
}

/**
 * عرض الأوامر
 */
async function handleHelp(ctx) {
  const helpText = `
🔐 *أوامر الحماية*

قفل عنصر:
\`قفل + اسم_العنصر\`

فتح عنصر:
\`فتح + اسم_العنصر\`

قفل الكل:
\`قفل_الكل\`

فتح الكل:
\`فتح_الكل\`

*الأوامر المتاحة:*
• \`قفل روابط\` - قفل الروابط
• \`قفل توجيه\` - قفل التوجيه
• \`قفل صور\` - قفل الصور
• \`قفل ملصقات\` - قفل الملصقات
• \`قفل كل\` - قفل كل شيء
`;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}

/**
 * تسجيل أوامر الحماية
 */
function registerProtectionCommands(bot) {
  bot.command('حماية', handleProtection);
  bot.command('قفل', handleLock);
  bot.command('فتح', handleUnlock);
  bot.command('قفل_الكل', handleLockAll);
  bot.command('فتح_الكل', handleUnlockAll);
  bot.command('حماية_مساعدة', handleHelp);

  // أوامر عربية
  bot.command('protect', handleProtection);
  bot.command('lock', handleLock);
  bot.command('unlock', handleUnlock);
}

// ==================== WARNING SYSTEM ====================
const Warnings = require('./warnings');

/**
 * معالجة أمر التحذير
 */
async function handleWarn(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('⚠️_usage: /تحذير @user السبب');
  }

  // استخراج معرف المستخدم
  let userId = null;
  let reason = '';

  if (ctx.message.reply_to_message) {
    userId = ctx.message.reply_to_message.from.id;
    reason = args.join(' ');
  } else if (args[0].startsWith('@')) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو استخدام معرفه');
  } else if (args[0].match(/^\d+$/)) {
    userId = parseInt(args[0]);
    reason = args.slice(1).join(' ');
  }

  if (!userId) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو استخدام معرفه');
  }

  return Warnings.warn(ctx, userId, reason);
}

/**
 * معالجة أمر رفع التحذير
 */
async function handleRemoveWarning(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1 && !ctx.message.reply_to_message) {
    return ctx.reply('⚠️_usage: /رفع_تحذير @user');
  }

  let userId = null;

  if (ctx.message.reply_to_message) {
    userId = ctx.message.reply_to_message.from.id;
  } else if (args[0]) {
    if (args[0].match(/^\d+$/)) {
      userId = parseInt(args[0]);
    } else {
      return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
    }
  }

  if (!userId) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  return Warnings.removeWarning(ctx, userId, 0);
}

/**
 * معالجة أمر عرض تحذيرات المستخدم
 */
async function handleMyWarnings(ctx) {
  if (!isGroup(ctx)) {
    return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات');
  }

  const userId = ctx.from.id;
  return Warnings.getWarnings(ctx, userId);
}

/**
 * معالجة أمر عرض تحذيرات مستخدم آخر
 */
async function handleUserWarnings(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1 && !ctx.message.reply_to_message) {
    return ctx.reply('⚠️_usage: /تحذيرات @user');
  }

  let userId = null;

  if (ctx.message.reply_to_message) {
    userId = ctx.message.reply_to_message.from.id;
  } else if (args[0]) {
    if (args[0].match(/^\d+$/)) {
      userId = parseInt(args[0]);
    } else {
      return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
    }
  }

  if (!userId) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  return Warnings.getWarnings(ctx, userId);
}

/**
 * معالجة أمر مسح التحذيرات
 */
async function handleClearWarnings(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1 && !ctx.message.reply_to_message) {
    return ctx.reply('⚠️_usage: /مسح_التحذيرات @user');
  }

  let userId = null;

  if (ctx.message.reply_to_message) {
    userId = ctx.message.reply_to_message.from.id;
  } else if (args[0]) {
    if (args[0].match(/^\d+$/)) {
      userId = parseInt(args[0]);
    } else {
      return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
    }
  }

  if (!userId) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  return Warnings.clearWarnings(ctx, userId);
}

/**
 * معالجة أمر تعيين الحد الأقصى للتحذيرات
 */
async function handleMaxWarnings(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️_usage: /حد_التحذيرات 3');
  }

  const number = parseInt(args[1]);
  if (isNaN(number) || number < 1 || number > 10) {
    return ctx.reply('⚠️ الرجاء إدخال رقم بين 1 و 10');
  }

  return Warnings.setMaxWarnings(ctx, number);
}

/**
 * معالجة أمر تعيين الإجراء التلقائي
 */
async function handleAutoAction(ctx) {
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️_usage: /اجراء_تلقائي kick\n_الخيارات: mute, kick, ban_', { parse_mode: 'Markdown' });
  }

  const action = args[1].toLowerCase();
  const validActions = ['mute', 'kick', 'ban'];

  if (!validActions.includes(action)) {
    return ctx.reply('⚠️ الإجراء التلقائي غير صالح\n_الخيارات: mute, kick, ban_', { parse_mode: 'Markdown' });
  }

  return Warnings.setAutoAction(ctx, action);
}

/**
 * تسجيل أوامر التحذيرات
 */
function registerWarningCommands(bot) {
  // أوامر التحذير
  bot.command('تحذير', handleWarn);
  bot.command('warn', handleWarn);

  // رفع التحذير
  bot.command('رفع_تحذير', handleRemoveWarning);
  bot.command('removewarning', handleRemoveWarning);

  // عرض التحذيرات
  bot.command('تحذيراتي', handleMyWarnings);
  bot.command('mywarnings', handleMyWarnings);

  // عرض تحذيرات مستخدم آخر
  bot.command('تحذيرات', handleUserWarnings);
  bot.command('warnings', handleUserWarnings);

  // مسح التحذيرات
  bot.command('مسح_التحذيرات', handleClearWarnings);
  bot.command('clearwarnings', handleClearWarnings);

  // الحد الأقصى
  bot.command('حد_التحذيرات', handleMaxWarnings);
  bot.command('maxwarnings', handleMaxWarnings);

  // الإجراء التلقائي
  bot.command('اجراء_تلقائي', handleAutoAction);
  bot.command('autoaction', handleAutoAction);
}

module.exports = {
  registerProtectionCommands,
  registerWarningCommands,
  handleProtection,
  handleLock,
  handleUnlock,
  handleLockAll,
  handleUnlockAll,
  handleHelp
};
