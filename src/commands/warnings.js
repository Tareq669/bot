/**
 * نظام التحذيرات والرقابة
 * Warnings and Moderation System
 */
const GroupProtection = require('../database/models/GroupProtection');
const { getGroupLanguage, t } = require('../utils/groupHelper');

/**
 * الحصول على مجموعة الحماية
 */
async function getGroupProtection(groupId) {
  let group = await GroupProtection.findOne({ groupId });
  if (!group) {
    group = new GroupProtection({ groupId });
    await group.save();
  }
  return group;
}

/**
 * إضافة تحذير للمستخدم
 */
async function warn(ctx, userId, reason) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  const warnerId = ctx.from?.id;

  // إضافة التحذير
  const warning = {
    userId,
    reason: reason || 'لم يتم تحديد السبب',
    warnedBy: warnerId,
    timestamp: new Date()
  };

  group.warnings.push(warning);
  await group.save();

  // التحقق من تجاوز الحد
  const warningCount = group.warnings.filter(w => w.userId === userId).length;

  let message = `⚠️ *${t('warning_added', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `👤 ${t('user', lang)}: \`${userId}\`\n`;
  message += `📝 ${t('reason', lang)}: ${reason || t('no_reason', lang)}\n`;
  message += `📊 ${t('warnings_count', lang)}: ${warningCount}/${group.maxWarnings}\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';

  // إرسال رسالة التحذير
  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  // تنفيذ الإجراء التلقائي إذا تم تجاوز الحد
  if (warningCount >= group.maxWarnings) {
    await executeAutoAction(ctx, userId, group.autoAction, lang);
  }

  return true;
}

/**
 * تنفيذ الإجراء التلقائي
 */
async function executeAutoAction(ctx, userId, action, lang) {
  let actionMessage = '';

  switch (action) {
    case 'mute':
      try {
        await ctx.restrictChatMember(userId, {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_other_messages: false
        });
        actionMessage = t('action_mute', lang);
      } catch (e) {
        actionMessage = t('action_mute_failed', lang);
      }
      break;

    case 'kick':
      try {
        await ctx.kickChatMember(userId);
        await ctx.unbanChatMember(userId);
        actionMessage = t('action_kick', lang);
      } catch (e) {
        actionMessage = t('action_kick_failed', lang);
      }
      break;

    case 'ban':
      try {
        await ctx.kickChatMember(userId);
        actionMessage = t('action_ban', lang);
      } catch (e) {
        actionMessage = t('action_ban_failed', lang);
      }
      break;
  }

  const notice = `⛔ *${t('auto_action_executed', lang)}*\n`;
  const noticeMessage = `${notice}📊 ${t('action_taken', lang)}: ${actionMessage}`;

  try {
    await ctx.reply(noticeMessage, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(noticeMessage.replace(/[*_`]/g, ''));
  }
}

/**
 * إزالة تحذير واحد
 */
async function removeWarning(ctx, userId, warningIndex) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  // البحث عن تحذيرات المستخدم
  const userWarnings = group.warnings.filter(w => w.userId === userId);

  if (userWarnings.length === 0) {
    return ctx.reply(`❌ ${t('no_warnings', lang)}`);
  }

  // التحقق من صحة مؤشر التحذير
  if (warningIndex < 0 || warningIndex >= userWarnings.length) {
    return ctx.reply(`❌ ${t('invalid_warning_index', lang)} (0-${userWarnings.length - 1})`);
  }

  // الحصول على التحذير المراد حذفه
  const warningToRemove = userWarnings[warningIndex];

  // حذف التحذير من المصفوفة الأصلية
  const originalIndex = group.warnings.findIndex(
    w => w.userId === warningToRemove.userId &&
    w.timestamp.getTime() === warningToRemove.timestamp.getTime()
  );

  if (originalIndex !== -1) {
    group.warnings.splice(originalIndex, 1);
    await group.save();
  }

  const remainingCount = group.warnings.filter(w => w.userId === userId).length;

  let message = `✅ *${t('warning_removed', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `👤 ${t('user', lang)}: \`${userId}\`\n`;
  message += `📊 ${t('remaining_warnings', lang)}: ${remainingCount}\n`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * عرض تحذيرات المستخدم
 */
async function getWarnings(ctx, userId) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  const userWarnings = group.warnings.filter(w => w.userId === userId);

  if (userWarnings.length === 0) {
    return ctx.reply(`✅ ${t('no_warnings_for_user', lang)}`);
  }

  let message = `⚠️ *${t('warnings_list', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `👤 ${t('user', lang)}: \`${userId}\`\n`;
  message += `📊 ${t('total_warnings', lang)}: ${userWarnings.length}/${group.maxWarnings}\n`;
  message += '━━━━━━━━━━━━━━━━━━\n\n';

  userWarnings.forEach((warning, index) => {
    const date = new Date(warning.timestamp).toLocaleDateString('ar-SA');
    const time = new Date(warning.timestamp).toLocaleTimeString('ar-SA');
    message += `*${index + 1}.* 📝 ${warning.reason}\n`;
    message += `   📅 ${date} ${time}\n`;
    message += `   👮 ${t('warned_by', lang)}: \`${warning.warnedBy}\`\n\n`;
  });

  // إضافة معلومات الإجراء التلقائي
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `⚙️ ${t('max_warnings', lang)}: ${group.maxWarnings}\n`;
  message += `🔧 ${t('auto_action', lang)}: ${group.autoAction}\n`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * مسح كل تحذيرات المستخدم
 */
async function clearWarnings(ctx, userId) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  const warningsCount = group.warnings.filter(w => w.userId === userId).length;

  if (warningsCount === 0) {
    return ctx.reply(`❌ ${t('no_warnings_to_clear', lang)}`);
  }

  // حذف جميع تحذيرات المستخدم
  group.warnings = group.warnings.filter(w => w.userId !== userId);
  await group.save();

  let message = `✅ *${t('warnings_cleared', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `👤 ${t('user', lang)}: \`${userId}\`\n`;
  message += `🗑️ ${t('removed_warnings', lang)}: ${warningsCount}\n`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * تعيين الحد الأقصى للتحذيرات
 */
async function setMaxWarnings(ctx, number) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  if (number < 1 || number > 10) {
    return ctx.reply(`❌ ${t('invalid_max_warnings', lang)}`);
  }

  group.maxWarnings = number;
  await group.save();

  let message = `✅ *${t('max_warnings_set', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `📊 ${t('new_max_warnings', lang)}: ${number}\n`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * تعيين الإجراء التلقائي
 */
async function setAutoAction(ctx, action) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const lang = await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  const validActions = ['mute', 'kick', 'ban'];

  if (!validActions.includes(action)) {
    return ctx.reply(`❌ ${t('invalid_action', lang)}\n${t('valid_actions', lang)}: mute, kick, ban`);
  }

  group.autoAction = action;
  await group.save();

  let actionText = '';
  switch (action) {
    case 'mute':
      actionText = t('action_mute', lang);
      break;
    case 'kick':
      actionText = t('action_kick', lang);
      break;
    case 'ban':
      actionText = t('action_ban', lang);
      break;
  }

  let message = `✅ *${t('auto_action_set', lang)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `🔧 ${t('selected_action', lang)}: ${actionText}\n`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * معالجة أوامر التحذيرات
 */
async function handleWarningCommand(ctx, command, args) {
  const lang = await getGroupLanguage(ctx.chat?.id);

  switch (command) {
    case 'تحذير':
    case 'warn': {
      if (args.length < 2) {
        return ctx.reply(`❌ ${t('warn_usage', lang)}\n/تحذير @user السبب`);
      }
      const userId = extractUserId(args[0]);
      const reason = args.slice(1).join(' ');
      if (!userId) {
        return ctx.reply(`❌ ${t('invalid_user', lang)}`);
      }
      return warn(ctx, userId, reason);
    }
    case 'رفع_تحذير':
    case 'removewarning': {
      if (args.length < 1) {
        return ctx.reply(`❌ ${t('remove_warning_usage', lang)}\n/رفع_تحذير @user`);
      }
      const userIdRemove = extractUserId(args[0]);
      if (!userIdRemove) {
        return ctx.reply(`❌ ${t('invalid_user', lang)}`);
      }
      return removeWarning(ctx, userIdRemove, 0);
    }
    case 'تحذيراتي':
    case 'mywarnings': {
      const myId = ctx.from?.id;
      return getWarnings(ctx, myId);
    }
    case 'تحذيرات':
    case 'warnings': {
      if (args.length < 1) {
        return ctx.reply(`❌ ${t('warnings_usage', lang)}\n/تحذيرات @user`);
      }
      const userIdWarnings = extractUserId(args[0]);
      if (!userIdWarnings) {
        return ctx.reply(`❌ ${t('invalid_user', lang)}`);
      }
      return getWarnings(ctx, userIdWarnings);
    }
    case 'مسح_التحذيرات':
    case 'clearwarnings': {
      if (args.length < 1) {
        return ctx.reply(`❌ ${t('clear_warnings_usage', lang)}\n/مسح_التحذيرات @user`);
      }
      const userIdClear = extractUserId(args[0]);
      if (!userIdClear) {
        return ctx.reply(`❌ ${t('invalid_user', lang)}`);
      }
      return clearWarnings(ctx, userIdClear);
    }
    case 'حد_التحذيرات':
    case 'maxwarnings': {
      if (args.length < 1) {
        return ctx.reply(`❌ ${t('max_warnings_usage', lang)}\n/حد_التحذيرات 3`);
      }
      const maxNumber = parseInt(args[0]);
      if (isNaN(maxNumber)) {
        return ctx.reply(`❌ ${t('invalid_number', lang)}`);
      }
      return setMaxWarnings(ctx, maxNumber);
    }
    case 'اجراء_تلقائي':
    case 'autoaction': {
      if (args.length < 1) {
        return ctx.reply(`❌ ${t('auto_action_usage', lang)}\n/اجراء_تلقائي kick`);
      }
      const action = args[0].toLowerCase();
      return setAutoAction(ctx, action);
    }
    default:
      return ctx.reply(`❌ ${t('unknown_command', lang)}`);
  }
}

/**
 * استخراج معرف المستخدم من النص
 */
function extractUserId(text) {
  if (!text) return null;

  // إذا كان النص يحتوي على mention
  if (text.includes('@')) {
    // للـ mention نحتاج للبحث فيmembers
    return null; // سنحتاج لمعالجة خاصة
  }

  // إذا كان النص يحتوي على معرف رقمي
  const numericMatch = text.match(/\d+/);
  if (numericMatch) {
    return parseInt(numericMatch[0]);
  }

  return null;
}

module.exports = {
  warn,
  removeWarning,
  getWarnings,
  clearWarnings,
  setMaxWarnings,
  setAutoAction,
  handleWarningCommand,
  getGroupProtection
};
