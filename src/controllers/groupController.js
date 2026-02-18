/**
 * نظام التحكم في المجموعات من الدردشة الخاصة
 * Group Control System from Private Chat
 */
const GroupProtection = require('../database/models/GroupProtection');

/**
 * التحقق من أن المستخدم مالك البوت
 */
function isBotOwner(userId) {
  const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(Number);
  return ownerIds.includes(userId);
}

/**
 * التحقق من أن المستخدم أدمن في الجروب
 */
async function isGroupAdmin(bot, groupId, userId) {
  try {
    const chatMember = await bot.telegram.getChatMember(groupId, userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    console.error('Error checking admin:', error);
    return false;
  }
}

/**
 * التحقق من أن المستخدم مالك الجروب
 */
async function isGroupOwner(bot, groupId, userId) {
  try {
    const chatMember = await bot.telegram.getChatMember(groupId, userId);
    return chatMember.status === 'creator';
  } catch (error) {
    console.error('Error checking owner:', error);
    return false;
  }
}

/**
 * التحقق من أن الأوامر تُنفذ من الدردشة الخاصة فقط
 */
function isPrivateChat(ctx) {
  return ctx.chat && ctx.chat.type === 'private';
}

/**
 * إرسال رسالة للأدمن بالنتيجة
 */
async function notifyAdmin(ctx, message, success = true) {
  const emoji = success ? '✅' : '❌';
  await ctx.reply(`${emoji} ${message}`, { parse_mode: 'HTML' });
}

/**
 * إرسال إشعار للمستخدم المتأثر
 */
async function notifyUser(ctx, bot, userId, message) {
  try {
    await bot.telegram.sendMessage(userId, message, { parse_mode: 'HTML' });
    return true;
  } catch (error) {
    console.error('Error notifying user:', error);
    return false;
  }
}

/**
 * الحصول على معرف المستخدم من الأمر
 */
function extractUserId(args) {
  if (!args || args.length === 0) return null;

  const arg = args[0];

  // إذا كان معرف رقمي
  if (/^\d+$/.test(arg)) {
    return parseInt(arg, 10);
  }

  // إذا كان يوزر (@username)
  if (arg.startsWith('@')) {
    // يتطلب البحث في قاعدة البيانات أو استخدام resolveUsername
    return arg;
  }

  return null;
}

/**
 * أمر حظر مستخدم من الجروب
 */
async function handleBan(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة مع البوت');
  }

  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);
  const targetUserId = extractUserId(args);

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /ban [معرف_المستخدم]\nمثال: /ban 123456789');
  }

  // التحقق من الصلاحيات
  const isOwner = isBotOwner(userId);
  if (!isOwner) {
    return ctx.reply('❌ هذا الأمر للمالك فقط');
  }

  try {
    // طلب معرف الجروب
    await ctx.reply('📌 أرسل معرف الجروب الذي تريد حظر المستخدم منه:');

    // تخزين الأمر في الذاكرة المؤقتة
    ctx.session.pendingCommand = {
      type: 'ban',
      targetUserId
    };

    return true;
  } catch (error) {
    console.error('Ban error:', error);
    return notifyAdmin(ctx, 'فشل في تنفيذ أمر الحظر');
  }
}

/**
 * تنفيذ أمر الحظر
 */
async function executeBan(bot, groupId, targetUserId, adminId) {
  try {
    await bot.telegram.banChatMember(groupId, targetUserId);
    return { success: true, message: `✅ تم حظر المستخدم ${targetUserId} من الجروب` };
  } catch (error) {
    console.error('Ban execute error:', error);
    return { success: false, message: `❌ فشل في حظر المستخدم: ${error.message}` };
  }
}

/**
 * أمر إلغاء حظر مستخدم
 */
async function handleUnban(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة مع البوت');
  }

  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);
  const targetUserId = extractUserId(args);

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /unban [معرف_المستخدم]\nمثال: /unban 123456789');
  }

  const isOwner = isBotOwner(userId);
  if (!isOwner) {
    return ctx.reply('❌ هذا الأمر للمالك فقط');
  }

  try {
    await ctx.reply('📌 أرسل معرف الجروب:');

    ctx.session.pendingCommand = {
      type: 'unban',
      targetUserId
    };

    return true;
  } catch (error) {
    console.error('Unban error:', error);
    return notifyAdmin(ctx, 'فشل في إلغاء الحظر');
  }
}

/**
 * تنفيذ إلغاء الحظر
 */
async function executeUnban(bot, groupId, targetUserId) {
  try {
    await bot.telegram.unbanChatMember(groupId, targetUserId);
    return { success: true, message: `✅ تم إلغاء حظر المستخدم ${targetUserId}` };
  } catch (error) {
    console.error('Unban execute error:', error);
    return { success: false, message: `❌ فشل في إلغاء الحظر: ${error.message}` };
  }
}

/**
 * أمر طرد مستخدم
 */
async function handleKick(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  const userId = ctx.from.id;
  const args = ctx.message.text.split(' ').slice(1);
  const targetUserId = extractUserId(args);

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /kick [معرف_المستخدم]\nمثال: /kick 123456789');
  }

  // يمكن للمالك أو الأدمن في الجروب
  // يتطلب تخزين الجروب المراد

  await ctx.reply('📌 أرسل معرف الجروب:');

  ctx.session.pendingCommand = {
    type: 'kick',
    targetUserId
  };

  return true;
}

/**
 * تنفيذ الطرد
 */
async function executeKick(bot, groupId, targetUserId) {
  try {
    await bot.telegram.kickChatMember(groupId, targetUserId);
    // إلغاء الحظر بعد الطرد للسماح بإعادة الانضمام
    setTimeout(async () => {
      try {
        await bot.telegram.unbanChatMember(groupId, targetUserId);
      } catch (e) {
        console.error('Error unbanning after kick:', e);
      }
    }, 1000);

    return { success: true, message: `✅ تم طرد المستخدم ${targetUserId} من الجروب` };
  } catch (error) {
    console.error('Kick execute error:', error);
    return { success: false, message: `❌ فشل في طرد المستخدم: ${error.message}` };
  }
}

/**
 * أمر ترقية مستخدم كمشرف
 */
async function handlePromote(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  const userId = ctx.from.id;
  const isOwner = isBotOwner(userId);

  if (!isOwner) {
    return ctx.reply('❌ هذا الأمر للمالك فقط');
  }

  const args = ctx.message.text.split(' ').slice(1);
  const targetUserId = extractUserId(args);

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /promote [معرف_المستخدم]\nمثال: /promote 123456789');
  }

  await ctx.reply('📌 أرسل معرف الجروب:');

  ctx.session.pendingCommand = {
    type: 'promote',
    targetUserId
  };

  return true;
}

/**
 * تنفيذ الترقية
 */
async function executePromote(bot, groupId, targetUserId) {
  try {
    await bot.telegram.promoteChatMember(groupId, {
      user_id: targetUserId,
      can_change_info: true,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true
    });

    return { success: true, message: `✅ تم ترقية المستخدم ${targetUserId} كمشرف` };
  } catch (error) {
    console.error('Promote error:', error);
    return { success: false, message: `❌ فشل في ترقية المستخدم: ${error.message}` };
  }
}

/**
 * أمر إزالة صلاحيات المشرف
 */
async function handleDemote(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  const userId = ctx.from.id;
  if (!isBotOwner(userId)) {
    return ctx.reply('❌ هذا الأمر للمالك فقط');
  }

  const args = ctx.message.text.split(' ').slice(1);
  const targetUserId = extractUserId(args);

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /demote [معرف_المستخدم]');
  }

  await ctx.reply('📌 أرسل معرف الجروب:');

  ctx.session.pendingCommand = {
    type: 'demote',
    targetUserId
  };

  return true;
}

/**
 * تنفيذ إزالة الصلاحيات
 */
async function executeDemote(bot, groupId, targetUserId) {
  try {
    await bot.telegram.promoteChatMember(groupId, {
      user_id: targetUserId,
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false
    });

    return { success: true, message: `✅ تم إزالة صلاحيات المشرف من المستخدم ${targetUserId}` };
  } catch (error) {
    console.error('Demote error:', error);
    return { success: false, message: `❌ فشل في إزالة الصلاحيات: ${error.message}` };
  }
}

/**
 * أمر كتم مستخدم
 */
async function handleMute(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  const args = ctx.message.text.split(' ');
  const targetUserId = extractUserId(args.slice(1));

  // الحصول على مدة الكتم (بالدقائق)
  let duration = 60; // الافتراضي 60 دقيقة
  if (args.length > 2 && !isNaN(parseInt(args[2]))) {
    duration = parseInt(args[2]);
  }

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /mute [معرف_المستخدم] [الدقائق]\nمثال: /mute 123456789 30');
  }

  await ctx.reply('📌 أرسل معرف الجروب:');

  ctx.session.pendingCommand = {
    type: 'mute',
    targetUserId,
    duration
  };

  return true;
}

/**
 * تنفيذ الكتم
 */
async function executeMute(bot, groupId, targetUserId, duration = 60) {
  try {
    const untilDate = Math.floor(Date.now() / 1000) + (duration * 60);

    await bot.telegram.restrictChatMember(groupId, targetUserId, {
      until_date: untilDate,
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false
    });

    return {
      success: true,
      message: `✅ تم كتم المستخدم ${targetUserId} لمدة ${duration} دقيقة`
    };
  } catch (error) {
    console.error('Mute error:', error);
    return { success: false, message: `❌ فشل في كتم المستخدم: ${error.message}` };
  }
}

/**
 * أمر إلغاء كتم مستخدم
 */
async function handleUnmute(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  const args = ctx.message.text.split(' ');
  const targetUserId = extractUserId(args.slice(1));

  if (!targetUserId) {
    return ctx.reply('⚠️ usage: /unmute [معرف_المستخدم]');
  }

  await ctx.reply('📌 أرسل معرف الجروب:');

  ctx.session.pendingCommand = {
    type: 'unmute',
    targetUserId
  };

  return true;
}

/**
 * تنفيذ إلغاء الكتم
 */
async function executeUnmute(bot, groupId, targetUserId) {
  try {
    await bot.telegram.restrictChatMember(groupId, targetUserId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true
    });

    return { success: true, message: `✅ تم إلغاء كتم المستخدم ${targetUserId}` };
  } catch (error) {
    console.error('Unmute error:', error);
    return { success: false, message: `❌ فشل في إلغاء الكتم: ${error.message}` };
  }
}

/**
 * أمر عرض إعدادات الجروب
 */
async function handleSettings(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  await ctx.reply('📌 أرسل معرف الجروب لعرض الإعدادات:');

  ctx.session.pendingCommand = {
    type: 'settings'
  };

  return true;
}

/**
 * عرض إعدادات الجروب
 */
async function executeSettings(bot, groupId) {
  try {
    // جلب معلومات الجروب
    const chat = await bot.telegram.getChat(groupId);

    // جلب الإعدادات من قاعدة البيانات
    const settings = await GroupProtection.findOne({ groupId });

    let message = '⚙️ <b>إعدادات الجروب</b>\n\n';
    message += `📌 <b>الاسم:</b> ${chat.title}\n`;
    message += `🆔 <b>معرف الجروب:</b> ${groupId}\n`;

    if (chat.username) {
      message += `📝 <b>يوزر:</b> @${chat.username}\n`;
    }

    if (settings) {
      message += '\n<b>إعدادات الحماية:</b>\n';

      const locks = settings.locks || {};
      const locked = Object.entries(locks).filter(([key, val]) => val && key !== 'lockMethod');

      if (locked.length > 0) {
        locked.forEach(([key]) => {
          message += `• ${key}: 🔒\n`;
        });
      } else {
        message += '• لا توجد قيود مفعلة\n';
      }
    }

    return { success: true, message };
  } catch (error) {
    console.error('Settings error:', error);
    return { success: false, message: `❌ فشل في جلب الإعدادات: ${error.message}` };
  }
}

/**
 * أمر عرض معلومات الجروب
 */
async function handleInfo(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  await ctx.reply('📌 أرسل معرف الجروب لعرض المعلومات:');

  ctx.session.pendingCommand = {
    type: 'info'
  };

  return true;
}

/**
 * عرض معلومات الجروب
 */
async function executeInfo(bot, groupId) {
  try {
    const chat = await bot.telegram.getChat(groupId);
    const memberCount = await bot.telegram.getChatMemberCount(groupId);

    let message = '📊 <b>معلومات الجروب</b>\n\n';
    message += `📌 <b>الاسم:</b> ${chat.title}\n`;
    message += `🆔 <b>المعرف:</b> ${groupId}\n`;

    if (chat.username) {
      message += `📝 <b>اليوزر:</b> @${chat.username}\n`;
    }

    if (chat.description) {
      message += `📃 <b>الوصف:</b>\n${chat.description}\n`;
    }

    message += `👥 <b>عدد الأعضاء:</b> ${memberCount}\n`;

    if (chat.photo) {
      message += '🖼️ <b>صورة:</b> موجودة\n';
    }

    return { success: true, message };
  } catch (error) {
    console.error('Info error:', error);
    return { success: false, message: `❌ فشل في جلب المعلومات: ${error.message}` };
  }
}

/**
 * أمر عرض إحصائيات الجروب
 */
async function handleStats(ctx, bot) {
  if (!isPrivateChat(ctx)) {
    return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
  }

  await ctx.reply('📌 أرسل معرف الجروب لعرض الإحصائيات:');

  ctx.session.pendingCommand = {
    type: 'stats'
  };

  return true;
}

/**
 * عرض إحصائيات الجروب
 */
async function executeStats(bot, groupId) {
  try {
    const memberCount = await bot.telegram.getChatMemberCount(groupId);

    // جلب إعدادات الجروب
    const settings = await GroupProtection.findOne({ groupId });

    let message = '📈 <b>إحصائيات الجروب</b>\n\n';
    message += `👥 <b>عدد الأعضاء:</b> ${memberCount}\n`;

    if (settings) {
      const locks = settings.locks || {};
      const lockedCount = Object.values(locks).filter(v => v === true).length;
      message += `🔒 <b>القيود المفعلة:</b> ${lockedCount}\n`;

      message += '\n<b>القيود:</b>\n';

      const lockNames = {
        chat: 'الدردشة',
        links: 'الروابط',
        photos: 'الصور',
        videos: 'الفيديوهات',
        documents: 'الملفات',
        games: 'الألعاب',
        forwarding: 'التوجيه'
      };

      Object.entries(locks).forEach(([key, val]) => {
        if (val && key !== 'lockMethod') {
          const name = lockNames[key] || key;
          message += `• ${name}: 🔒\n`;
        }
      });
    }

    return { success: true, message };
  } catch (error) {
    console.error('Stats error:', error);
    return { success: false, message: `❌ فشل في جلب الإحصائيات: ${error.message}` };
  }
}

/**
 * معالجة الأوامر المعلقة
 */
async function handlePendingCommand(ctx, bot) {
  const pending = ctx.session.pendingCommand;
  if (!pending) return false;

  const groupId = parseInt(ctx.message.text, 10);
  if (isNaN(groupId)) {
    await ctx.reply('❌ معرف الجروب غير صالح');
    ctx.session.pendingCommand = null;
    return true;
  }

  // التحقق من أن المستخدم أدمن أو مالك في الجروب
  const userId = ctx.from.id;
  const isOwner = isBotOwner(userId);

  if (!isOwner) {
    await ctx.reply('❌ يجب أن تكون مالك البوت لتنفيذ هذا الأمر');
    ctx.session.pendingCommand = null;
    return true;
  }

  let result;

  switch (pending.type) {
    case 'ban':
      result = await executeBan(bot, groupId, pending.targetUserId);
      break;
    case 'unban':
      result = await executeUnban(bot, groupId, pending.targetUserId);
      break;
    case 'kick':
      result = await executeKick(bot, groupId, pending.targetUserId);
      break;
    case 'promote':
      result = await executePromote(bot, groupId, pending.targetUserId);
      break;
    case 'demote':
      result = await executeDemote(bot, groupId, pending.targetUserId);
      break;
    case 'mute':
      result = await executeMute(bot, groupId, pending.targetUserId, pending.duration);
      break;
    case 'unmute':
      result = await executeUnmute(bot, groupId, pending.targetUserId);
      break;
    case 'settings':
      result = await executeSettings(bot, groupId);
      break;
    case 'info':
      result = await executeInfo(bot, groupId);
      break;
    case 'stats':
      result = await executeStats(bot, groupId);
      break;
    default:
      result = { success: false, message: '❌ أمر غير معروف' };
  }

  await ctx.reply(result.message, { parse_mode: 'HTML' });

  // إرسال إشعار للمستخدم المتأثر إذا كان الأمر نجاح
  if (result.success && pending.targetUserId && typeof pending.targetUserId === 'number') {
    const notifyMessages = {
      ban: '⚠️ تم حظرك من إحدى المجموعات',
      kick: '⚠️ تم طردك من إحدى المجموعات',
      mute: '🔇 تم كتمك في إحدى المجموعات',
      promote: '🎉 تم ترقيتك كمشرف في إحدى المجموعات',
      demote: '📉 تمت إزالة صلاحياتك كمشرف في إحدى المجموعات'
    };

    if (notifyMessages[pending.type]) {
      await notifyUser(ctx, bot, pending.targetUserId, notifyMessages[pending.type]);
    }
  }

  ctx.session.pendingCommand = null;
  return true;
}

/**
 * تسجيل الأوامر في البوت
 */
function registerGroupController(bot) {
  // التحقق من الأوامر المعلقة
  bot.on('text', async (ctx) => {
    if (!isPrivateChat(ctx)) return;
    if (ctx.session.pendingCommand) {
      await handlePendingCommand(ctx, bot);
    }
  });

  // أوامر التحكم في الجروب
  bot.command('ban', async (ctx) => handleBan(ctx, bot));
  bot.command('unban', async (ctx) => handleUnban(ctx, bot));
  bot.command('kick', async (ctx) => handleKick(ctx, bot));
  bot.command('promote', async (ctx) => handlePromote(ctx, bot));
  bot.command('demote', async (ctx) => handleDemote(ctx, bot));
  bot.command('mute', async (ctx) => handleMute(ctx, bot));
  bot.command('unmute', async (ctx) => handleUnmute(ctx, bot));
  bot.command('settings', async (ctx) => handleSettings(ctx, bot));
  bot.command('info', async (ctx) => handleInfo(ctx, bot));
  bot.command('stats', async (ctx) => handleStats(ctx, bot));

  // أوامر مساعدة
  bot.command('grouphelp', async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply('❌ هذا الأمر يعمل فقط في الدردشة الخاصة');
    }

    const helpText = `
🔧 <b>أوامر التحكم في المجموعات</b>

<i>جميع الأوامر تعمل من الدردشة الخاصة</i>

<b>الحظر والطرد:</b>
/ban [معرف] - حظر مستخدم
/unban [معرف] - إلغاء حظر مستخدم
/kick [معرف] - طرد مستخدم

<b>إدارة المشرفين:</b>
/promote [معرف] - ترقيه كمشرف
/demote [معرف] - إزالة المشرف

<b>الكتم:</b>
/mute [معرف] [دقائق] - كتم مستخدم
/unmute [معرف] - إلغاء كتم مستخدم

<b>المعلومات:</b>
/settings - عرض إعدادات الجروب
/info - عرض معلومات الجروب
/stats - عرض إحصائيات الجروب

<b>مثال:</b>
/ban 123456789
/mute 123456789 30
/promote 987654321

<i>ملاحظة: بعد كل أمر، سيطلب منك معرف الجروب</i>
`;

    await ctx.reply(helpText, { parse_mode: 'HTML' });
  });
}

module.exports = {
  registerGroupController,
  handleBan,
  handleUnban,
  handleKick,
  handlePromote,
  handleDemote,
  handleMute,
  handleUnmute,
  handleSettings,
  handleInfo,
  handleStats,
  isBotOwner,
  isGroupAdmin,
  isPrivateChat
};
