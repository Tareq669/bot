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

module.exports = {
  registerProtectionCommands,
  handleProtection,
  handleLock,
  handleUnlock,
  handleLockAll,
  handleUnlockAll,
  handleHelp
};
