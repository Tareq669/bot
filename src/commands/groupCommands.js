/**
 * أوامر إدارة المجموعات
 * Group management commands
 */
const { GroupSettings, GroupMember, GroupStats } = require('../database/models/GroupManagement');
const groupHandlers = require('../handlers/groupHandlers');
const { isGroup, isAdmin, sendPrivateChatError, sendNotAdminError, updateGroupAdmins } = require('../utils/groupHelper');

/**
 * تسجيل أوامر المجموعات
 * @param {Object} bot - نسخة البوت
 */
function registerGroupCommands(bot) {
  // أوامر الإدارة الأساسية
  bot.command('رفع', handlePromote);
  bot.command('تنزيل', handleDemote);
  bot.command('طرد', handleKick);
  bot.command('حظر', handleBan);
  bot.command('الغاء_حظر', handleUnban);
  bot.command('كتم', handleMute);
  bot.command('الغاء_الكتم', handleUnmute);

  // أوامر المعلومات
  bot.command('معلومات_المجموعة', handleGroupInfo);
  bot.command('الاعضاء', handleMembers);
  bot.command('الادمنز', handleAdmins);
  bot.command('المشرفين', handleModerators);

  // أوامر الإعدادات
  bot.command('اعدادات', handleSettings);
  bot.command('ترحيب', handleWelcome);
  bot.command('وداع', handleFarewell);
  bot.command('قواعد', handleRules);

  // أوامر الحماية
  bot.command('حماية', handleProtection);
  bot.command('فلترة_روابط', handleLinkFilter);
  bot.command('منع_سبام', handleSpamFilter);
  bot.command('مضاد_Flood', handleAntiFlood);

  // أوامر الإحصائيات
  bot.command('احصائيات', handleStats);
  bot.command('ترتيب', handleLeaderboard);
  bot.command('نقاطي', handleMyPoints);

  // أوامر الأتمتة
  bot.command('اوامر_التكرار', handleAutoReply);
  bot.command('رد_الود', handleAutoResponse);

  // أوامر خاصة
  bot.command('رتب', handleRank);
  bot.command('عاقب', handlePenalty);
  bot.command('حظر_autan', handleFakeBan);

  // ============ أوامر الإحصائيات الجديدة ============
  // أوامر الإحصائيات اليومية
  bot.command('daily', handleDailyStats);
  bot.command('اليوم', handleDailyStats);

  // قائمة الأعضاء
  bot.command('members', handleGroupMembersList);
  bot.command('قائمة_الاعضاء', handleGroupMembersList);

  // جدول الترتيب
  bot.command('leaderboard', handleLeaderboard);
  bot.command('الترتيب', handleLeaderboard);
  bot.command('leaderboard_daily', (ctx) => handleLeaderboard(ctx, 'daily'));
  bot.command('leaderboard_weekly', (ctx) => handleLeaderboard(ctx, 'weekly'));
  bot.command('leaderboard_monthly', (ctx) => handleLeaderboard(ctx, 'monthly'));
  bot.command('ترتيب_يومي', (ctx) => handleLeaderboard(ctx, 'daily'));
  bot.command('ترتيب_أسبوعي', (ctx) => handleLeaderboard(ctx, 'weekly'));
  bot.command('ترتيب_شهري', (ctx) => handleLeaderboard(ctx, 'monthly'));

  // الملف الشخصي
  bot.command('myprofile', handleMyProfile);
  bot.command('ملفي', handleMyProfile);
}

/**
 * رفع مستخدم إلى مشرف
 */
async function handlePromote(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  const success = await groupHandlers.promoteUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم رفع المستخدم إلى مشرف بنجاح');
  } else {
    await ctx.reply('❌ فشل في رفع المستخدم');
  }
}

/**
 * تنزيل مستخدم من مشرف
 */
async function handleDemote(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  const success = await groupHandlers.demoteUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم تنزيل المستخدم من مشرف بنجاح');
  } else {
    await ctx.reply('❌ فشل في تنزيل المستخدم');
  }
}

/**
 * طرد مستخدم
 */
async function handleKick(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  const success = await groupHandlers.kickUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم طرد المستخدم بنجاح');
  } else {
    await ctx.reply('❌ فشل في طرد المستخدم');
  }
}

/**
 * حظر مستخدم
 */
async function handleBan(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  const success = await groupHandlers.banUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم حظر المستخدم بنجاح');
  } else {
    await ctx.reply('❌ فشل في حظر المستخدم');
  }
}

/**
 * إلغاء حظر مستخدم
 */
async function handleUnban(ctx) {
  if (!ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى تحديد معرف المستخدم');
  }

  const userId = extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ معرف المستخدم غير صالح');
  }

  const success = await groupHandlers.unbanUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم إلغاء حظر المستخدم بنجاح');
  } else {
    await ctx.reply('❌ فشل في إلغاء الحظر');
  }
}

/**
 * كتم مستخدم
 */
async function handleMute(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;
  const duration = parseInt(ctx.message.text.split(' ')[2]) || 300; // 5 دقائق افتراضي

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  await groupHandlers.muteUser(groupId, userId, duration, ctx.telegram);
  await ctx.reply(`✅ تم كتم المستخدم لمدة ${duration} ثانية`);
}

/**
 * إلغاء كتم مستخدم
 */
async function handleUnmute(ctx) {
  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم أو تحديد معرفه');
  }

  const userId = ctx.message.reply_to_message?.from?.id || extractUserId(ctx.message.text);
  const groupId = ctx.chat.id;

  if (!userId) {
    return ctx.reply('⚠️ لم يتم العثور على المستخدم');
  }

  try {
    await ctx.telegram.restrictChatMember(groupId, userId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_other_messages: true
    });

    const member = await GroupMember.findOne({ userId, groupId });
    if (member) {
      member.mutedUntil = null;
      await member.save();
    }

    await ctx.reply('✅ تم إلغاء كتم المستخدم بنجاح');
  } catch (error) {
    await ctx.reply('❌ فشل في إلغاء الكتم');
  }
}

/**
 * عرض معلومات المجموعة
 */
async function handleGroupInfo(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;
  const info = await groupHandlers.getGroupInfo(groupId, ctx.telegram);

  if (!info) {
    return ctx.reply('❌ لم يتم العثور على معلومات المجموعة');
  }

  const settings = await GroupSettings.findOne({ groupId });

  const text = '📋 <b>معلومات المجموعة</b>\n\n' +
    `• <b>الاسم:</b> ${info.title}\n` +
    `• <b>النوع:</b> ${info.type}\n` +
    `• <b>الوصف:</b> ${info.description || 'لا يوجد'}\n` +
    `• <b>رابط الدعوة:</b> ${info.inviteLink || 'غير متوفر'}\n` +
    `• <b>عدد الاعضاء:</b> ${settings?.members?.length || 0}\n` +
    `• <b>عدد الادمنز:</b> ${settings?.admins?.length || 0}`;

  await ctx.reply(text, { parse_mode: 'HTML' });
}

/**
 * عرض قائمة الأعضاء
 */
async function handleMembers(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;

  const members = await GroupMember.find({ groupId, isActive: true })
    .sort({ messagesCount: -1 })
    .limit(20);

  if (members.length === 0) {
    return ctx.reply('❌ لا يوجد أعضاء مسجلين');
  }

  let text = '👥 <b>قائمة الأعضاء</b>\n\n';

  members.forEach((member, index) => {
    const roleEmoji = member.role === 'admin' ? '👮' : member.role === 'moderator' ? '👮‍♂️' : '👤';
    text += `${index + 1}. ${roleEmoji} ${member.firstName || member.username}\n`;
    text += `   └ النقاط: ${member.points} | الرسائل: ${member.messagesCount}\n`;
  });

  await ctx.reply(text, { parse_mode: 'HTML' });
}

/**
 * عرض قائمة الأدمنز
 */
async function handleAdmins(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;

  try {
    const admins = await ctx.telegram.getChatAdministrators(groupId);

    let text = '👮 <b>قائمة الأدمنز</b>\n\n';

    for (const admin of admins) {
      const status = admin.status === 'creator' ? 'المالك 👑' : 'أدمن';
      const name = `${admin.user.first_name}${admin.user.last_name ? ` ${admin.user.last_name}` : ''}`;
      const username = admin.user.username ? `@${admin.user.username}` : 'لا يوجد يوزر';

      text += `• ${name}\n`;
      text += `   └ المستخدم: ${username}\n`;
      text += `   └ الحالة: ${status}\n\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply('❌ فشل في جلب قائمة الأدمنز');
  }
}

/**
 * عرض معلومات المالك
 */
async function handleOwner(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;

  try {
    const admins = await ctx.telegram.getChatAdministrators(groupId);
    const owner = admins.find(a => a.status === 'creator');

    if (!owner) {
      return ctx.reply('❌ لم يتم العثور على مالك المجموعة');
    }

    const text = `👑 <b>معلومات مالك المجموعة</b>\n\n• <b>الاسم:</b> ${owner.user.first_name}${owner.user.last_name ? ` ${owner.user.last_name}` : ''}\n• <b>اليوزر:</b> ${owner.user.username ? `@${owner.user.username}` : 'لا يوجد'}\n• <b>معرف:</b> \`${owner.user.id}\``;

    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.reply('❌ فشل في جلب معلومات المالك');
  }
}

/**
 * تحديث بيانات المالك والمشرفين
 */
async function handleRefreshAdmins(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;

  try {
    const result = await updateGroupAdmins(groupId, ctx.telegram);

    if (result.success) {
      const ownerName = result.owner?.firstName || 'غير معروف';
      await ctx.reply(`✅ تم تحديث بيانات المالك والمشرفين\n\n• المالك: ${ownerName}\n• عدد المشرفين: ${result.adminsCount}`);
    } else {
      await ctx.reply('❌ فشل في تحديث البيانات');
    }
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء التحديث');
  }
}

/**
 * عرض قائمة المشرفين
 */
async function handleModerators(ctx) {
  const groupId = ctx.chat.id;

  const settings = await GroupSettings.findOne({ groupId });
  const moderators = settings?.moderators || [];

  if (moderators.length === 0) {
    return ctx.reply('❌ لا يوجد مشرفين مخصصين');
  }

  let text = '👮‍♂️ <b>قائمة المشرفين</b>\n\n';

  moderators.forEach((mod, index) => {
    text += `${index + 1}. ${mod.username || mod.userId}\n`;
  });

  await ctx.reply(text, { parse_mode: 'HTML' });
}

/**
 * عرض إعدادات المجموعة
 */
async function handleSettings(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const settings = await GroupSettings.findOne({ groupId });

  if (!settings) {
    return ctx.reply('❌ لم يتم العثور على إعدادات');
  }

  const protection = settings.protection;
  const welcome = settings.welcome;

  let text = '⚙️ <b>إعدادات المجموعة</b>\n\n';

  // الحماية
  text += '<b>🛡️ الحماية:</b>\n';
  text += `• فلترة الروابط: ${protection?.linkFilter?.enabled ? '✅' : '❌'}\n`;
  text += `• منع السبام: ${protection?.spamProtection?.enabled ? '✅' : '❌'}\n`;
  text += `• مضاد Flood: ${protection?.antiFlood?.enabled ? '✅' : '❌'}\n`;
  text += `• حماية الحسابات المزيفة: ${protection?.fakeAccountProtection?.enabled ? '✅' : '❌'}\n\n`;

  // الترحيب
  text += '<b>👋 الترحيب:</b>\n';
  text += `• حالة الترحيب: ${welcome?.enabled ? '✅' : '❌'}\n`;
  text += `• رسالة الترحيب: ${welcome?.message ? 'مفعلة' : 'معطلة'}\n\n`;

  // القواعد
  text += '<b>📋 القواعد:</b>\n';
  text += `• القواعد مفعلة: ${settings.rulesEnabled ? '✅' : '❌'}\n`;
  text += `• عدد القواعد: ${settings.rules?.length || 0}`;

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: getSettingsKeyboard() });
}

/**
 * إعداد رسالة الترحيب
 */
async function handleWelcome(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    // عرض الإعدادات الحالية
    const settings = await GroupSettings.findOne({ groupId });
    const welcome = settings?.welcome || {};

    let text = '<b>👋 إعدادات الترحيب:</b>\n\n';
    text += `• مفعل: ${welcome?.enabled ? '✅' : '❌'}\n`;
    text += `• الرسالة: ${welcome?.message || 'لم يتم إعداد رسالة ترحيبية'}\n`;

    return ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'تفعيل', callback_data: 'welcome_enable' }],
          [{ text: 'تعطيل', callback_data: 'welcome_disable' }],
          [{ text: 'تعديل الرسالة', callback_data: 'welcome_edit' }]
        ]
      }
    });
  }

  // تفعيل أو تعطيل
  if (args[1] === 'تفعيل' || args[1] === 'on') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { 'welcome.enabled': true }
    );
    await ctx.reply('✅ تم تفعيل رسالة الترحيب');
  } else if (args[1] === 'تعطيل' || args[1] === 'off') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { 'welcome.enabled': false }
    );
    await ctx.reply('✅ تم تعطيل رسالة الترحيب');
  } else {
    // تعيين رسالة الترحيب
    const message = ctx.message.text.split(' ').slice(1).join(' ');
    await GroupSettings.findOneAndUpdate(
      { groupId },
      {
        'welcome.enabled': true,
        'welcome.message': message
      }
    );
    await ctx.reply('✅ تم تحديث رسالة الترحيب');
  }
}

/**
 * إعداد رسالة الوداع
 */
async function handleFarewell(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    const settings = await GroupSettings.findOne({ groupId });
    const farewell = settings?.farewell || {};

    let text = '<b>👋 إعدادات الوداع:</b>\n\n';
    text += `• مفعل: ${farewell?.enabled ? '✅' : '❌'}\n`;
    text += `• الرسالة: ${farewell?.message || 'لم يتم إعداد رسالة وداع'}`;

    return ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'تفعيل', callback_data: 'farewell_enable' }],
          [{ text: 'تعطيل', callback_data: 'farewell_disable' }],
          [{ text: 'تعديل الرسالة', callback_data: 'farewell_edit' }]
        ]
      }
    });
  }

  if (args[1] === 'تفعيل' || args[1] === 'on') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { 'farewell.enabled': true }
    );
    await ctx.reply('✅ تم تفعيل رسالة الوداع');
  } else if (args[1] === 'تعطيل' || args[1] === 'off') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { 'farewell.enabled': false }
    );
    await ctx.reply('✅ تم تعطيل رسالة الوداع');
  } else {
    const message = ctx.message.text.split(' ').slice(1).join(' ');
    await GroupSettings.findOneAndUpdate(
      { groupId },
      {
        'farewell.enabled': true,
        'farewell.message': message
      }
    );
    await ctx.reply('✅ تم تحديث رسالة الوداع');
  }
}

/**
 * عرض وإعداد القواعد
 */
async function handleRules(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    const settings = await GroupSettings.findOne({ groupId });
    const rules = settings?.rules || [];

    if (rules.length === 0) {
      return ctx.reply('📋 لا توجد قواعد حالياً. أضف قواعد باستخدام: /قواعد اضف [القاعدة]');
    }

    let text = '📋 <b>قواعد المجموعة</b>\n\n';
    rules.forEach((rule, index) => {
      text += `${index + 1}. ${rule}\n`;
    });

    return ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة قاعدة', callback_data: 'rules_add' }],
          [{ text: '🗑️ حذف القواعد', callback_data: 'rules_clear' }]
        ]
      }
    });
  }

  if (args[1] === 'اضف' || args[1] === 'add') {
    const rule = ctx.message.text.split(' ').slice(2).join(' ');
    if (!rule) {
      return ctx.reply('⚠️ يرجى تحديد القاعدة');
    }

    await GroupSettings.findOneAndUpdate(
      { groupId },
      {
        rulesEnabled: true,
        $push: { rules: rule }
      }
    );
    await ctx.reply(`✅ تم إضافة القاعدة: ${rule}`);
  } else if (args[1] === 'حذف' || args[1] === 'clear') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { rules: [], rulesEnabled: false }
    );
    await ctx.reply('✅ تم حذف جميع القواعد');
  } else if (args[1] === 'تفعيل' || args[1] === 'on') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { rulesEnabled: true }
    );
    await ctx.reply('✅ تم تفعيل نظام القواعد');
  } else if (args[1] === 'تعطيل' || args[1] === 'off') {
    await GroupSettings.findOneAndUpdate(
      { groupId },
      { rulesEnabled: false }
    );
    await ctx.reply('✅ تم تعطيل نظام القواعد');
  }
}

/**
 * إعدادات الحماية
 */
async function handleProtection(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  // التحقق من أن المستخدم أدمن
  const adminStatus = await isAdmin(ctx, ctx.telegram);
  if (!adminStatus) {
    return sendNotAdminError(ctx);
  }

  const groupId = ctx.chat.id;
  const settings = await GroupSettings.findOne({ groupId });
  const protection = settings?.protection || {};

  let text = '🛡️ <b>إعدادات الحماية</b>\n\n';
  text += `• <b>فلترة الروابط:</b> ${protection.linkFilter?.enabled ? '✅' : '❌'}\n`;
  text += `• <b>منع السبام:</b> ${protection.spamProtection?.enabled ? '✅' : '❌'}\n`;
  text += `• <b>مضاد Flood:</b> ${protection.antiFlood?.enabled ? '✅' : '❌'}\n`;
  text += `• <b>حماية الحسابات المزيفة:</b> ${protection.fakeAccountProtection?.enabled ? '✅' : '❌'}\n\n`;
  text += '<i>استخدم الأوامر التالية لتعديل الإعدادات:</i>\n';
  text += '/فلترة_روابط [تفعيل/تعطيل]\n';
  text += '/منع_سبام [تفعيل/تعطيل]\n';
  text += '/مضاد_Flood [تفعيل/تعطيل]';

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: groupHandlers.getProtectionKeyboard()
  });
}

/**
 * فلترة الروابط
 */
async function handleLinkFilter(ctx) {
  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (!args[1]) {
    return ctx.reply('⚠️ يرجى تحديد [تفعيل/تعطيل]');
  }

  const enabled = args[1] === 'تفعيل' || args[1] === 'on';

  await GroupSettings.findOneAndUpdate(
    { groupId },
    {
      'protection.linkFilter.enabled': enabled,
      'protection.linkFilter.action': 'delete'
    }
  );

  await ctx.reply(`✅ تم ${enabled ? 'تفعيل' : 'تعطيل'} فلترة الروابط`);
}

/**
 * منع السبام
 */
async function handleSpamFilter(ctx) {
  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (!args[1]) {
    return ctx.reply('⚠️ يرجى تحديد [تفعيل/تعطيل]');
  }

  const enabled = args[1] === 'تفعيل' || args[1] === 'on';

  await GroupSettings.findOneAndUpdate(
    { groupId },
    {
      'protection.spamProtection.enabled': enabled,
      'protection.spamProtection.threshold': 5,
      'protection.spamProtection.action': 'delete'
    }
  );

  await ctx.reply(`✅ تم ${enabled ? 'تفعيل' : 'تعطيل'} منع السبام`);
}

/**
 * مضاد Flood
 */
async function handleAntiFlood(ctx) {
  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (!args[1]) {
    return ctx.reply('⚠️ يرجى تحديد [تفعيل/تعطيل]');
  }

  const enabled = args[1] === 'تفعيل' || args[1] === 'on';

  await GroupSettings.findOneAndUpdate(
    { groupId },
    {
      'protection.antiFlood.enabled': enabled,
      'protection.antiFlood.threshold': 10,
      'protection.antiFlood.muteDuration': 600
    }
  );

  await ctx.reply(`✅ تم ${enabled ? 'تفعيل' : 'تعطيل'} مضاد Flood`);
}

/**
 * عرض الإحصائيات
 */
async function handleStats(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await GroupStats.findOne({ groupId, date: today });

  if (!stats) {
    return ctx.reply('📊 لا توجد إحصائيات لهذا اليوم');
  }

  const text = '📊 <b>إحصائيات المجموعة</b>\n\n' +
    '<b>📝 الرسائل:</b>\n' +
    `• الإجمالي: ${stats.messages?.totalMessages || 0}\n` +
    `• نص: ${stats.messages?.textMessages || 0}\n` +
    `• ميديا: ${stats.messages?.mediaMessages || 0}\n\n` +
    '<b>👥 الأعضاء:</b>\n' +
    `• الإجمالي: ${stats.members?.totalMembers || 0}\n` +
    `• انضموا: ${stats.members?.newMembers || 0}\n` +
    `• غادروا: ${stats.members?.leftMembers || 0}`;

  await ctx.reply(text, { parse_mode: 'HTML' });
}

/**
 * عرض قائمة المتصدرين
 * @param {Object} ctx - سياق التلجرام
 * @param {string} period - الفترة (daily, weekly, monthly, all)
 */
async function handleLeaderboard(ctx, period = 'all') {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  // تحديد عنوان الجدول حسب الفترة
  const periodTitles = {
    daily: 'اليوم',
    weekly: 'هذا الأسبوع',
    monthly: 'هذا الشهر',
    all: 'الكل'
  };

  const title = periodTitles[period] || 'الكل';

  let members;
  let userRank = null;

  if (period === 'daily') {
    // للترتيب اليومي، نستخدم إحصائيات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await GroupStats.findOne({ groupId, date: today });

    // نستخدم قائمة topParticipants من الإحصائيات
    const topParticipants = stats?.topParticipants || [];

    // إذا لم تكن هناك بيانات، نستخدم الأعضاء النشطين
    if (topParticipants.length === 0) {
      members = await GroupMember.find({ groupId, isActive: true })
        .sort({ 'activity.messagesCount': -1 })
        .limit(10);
    } else {
      // تحويل topParticipants إلى شكل مماثل
      members = topParticipants.slice(0, 10).map(p => ({
        username: p.username,
        points: p.messageCount,
        userId: p.userId
      }));
    }

    // حساب ترتيب المستخدم
    const userIndex = topParticipants.findIndex(p => p.userId === userId);
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }
  } else if (period === 'weekly') {
    // للأسبوع، نبحث في آخر 7 أيام
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    members = await GroupMember.find({
      groupId,
      isActive: true,
      'activity.lastMessageAt': { $gte: weekAgo }
    })
      .sort({ points: -1 })
      .limit(10);

    // حساب ترتيب المستخدم
    const allMembers = await GroupMember.find({
      groupId,
      isActive: true,
      'activity.lastMessageAt': { $gte: weekAgo }
    })
      .sort({ points: -1 });

    const userIndex = allMembers.findIndex(m => m.userId === userId);
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }
  } else if (period === 'monthly') {
    // للشهر، نبحث في آخر 30 يوم
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    members = await GroupMember.find({
      groupId,
      isActive: true,
      'activity.lastMessageAt': { $gte: monthAgo }
    })
      .sort({ points: -1 })
      .limit(10);

    // حساب ترتيب المستخدم
    const allMembers = await GroupMember.find({
      groupId,
      isActive: true,
      'activity.lastMessageAt': { $gte: monthAgo }
    })
      .sort({ points: -1 });

    const userIndex = allMembers.findIndex(m => m.userId === userId);
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }
  } else {
    // للكل (الإجمالي)
    members = await GroupMember.find({ groupId, isActive: true })
      .sort({ points: -1 })
      .limit(10);

    // حساب ترتيب المستخدم
    const allMembers = await GroupMember.find({ groupId, isActive: true })
      .sort({ points: -1 });

    const userIndex = allMembers.findIndex(m => m.userId === userId);
    if (userIndex !== -1) {
      userRank = userIndex + 1;
    }
  }

  if (!members || members.length === 0) {
    return ctx.reply('❌ لا توجد بيانات للترتيب');
  }

  let text = `🏆 الترتيب العام (${title})\n\n`;

  const emojis = ['🥇', '🥈', '🥉'];

  members.forEach((member, index) => {
    const username = member.username ? `@${member.username}` : member.firstName || 'مستخدم';
    const points = member.points || 0;
    const medal = index < 3 ? emojis[index] : `${index + 1}⃣`;

    text += `${medal} ${index + 1}. ${username} - ${points} نقطة\n`;
  });

  // إضافة ترتيب المستخدم الحالي
  if (userRank && userRank > 10) {
    text += `\n📍 ترتيبك: ${userRank}`;
  }

  await ctx.reply(text);
}

/**
 * عرض نقاط المستخدم الحالي
 */
async function handleMyPoints(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const userId = ctx.from.id;
  const groupId = ctx.chat.id;

  const member = await GroupMember.findOne({ userId, groupId });

  if (!member) {
    return ctx.reply('❌ لم يتم العثور على بياناتك');
  }

  const text = '⭐ <b>ملفك الشخصي في المجموعة</b>\n\n' +
    `• <b>النقاط:</b> ${member.points}\n` +
    `• <b>المستوى:</b> ${member.level}\n` +
    `• <b>الخبرة:</b> ${member.xp}\n` +
    `• <b>الرسائل:</b> ${member.messagesCount}\n` +
    `• <b>التحذيرات:</b> ${member.warnings?.length || 0}\n` +
    `• <b>السمعة:</b> ${member.reputation}`;

  await ctx.reply(text, { parse_mode: 'HTML' });
}

/**
 * أوامر التكرار التلقائي
 */
async function handleAutoReply(ctx) {
  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (args.length < 3) {
    const settings = await GroupSettings.findOne({ groupId });
    const autoReply = settings?.automation?.autoReply || [];

    if (autoReply.length === 0) {
      return ctx.reply('❌ لا توجد أوامر مكررة. أضف باستخدام: /اوامر_التكرار اضف [كلمة] [رد]');
    }

    let text = '🔄 <b>الأوامر المكررة</b>\n\n';
    autoReply.forEach((item, index) => {
      text += `${index + 1}. ${item.trigger} → ${item.response}\n`;
    });

    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  if (args[1] === 'اضف' || args[1] === 'add') {
    const content = ctx.message.text.split(' ').slice(2).join(' ');
    const [trigger, response] = content.split('|').map(s => s.trim());

    if (!trigger || !response) {
      return ctx.reply('⚠️ الصيغة: /اوامر_التكرار اضف [كلمة] | [رد]');
    }

    await GroupSettings.findOneAndUpdate(
      { groupId },
      {
        'automation.autoReply': {
          trigger,
          response,
          enabled: true
        }
      }
    );

    await ctx.reply(`✅ تم إضافة الأمر التكراري: ${trigger} → ${response}`);
  }
}

/**
 * ردود آلية
 */
async function handleAutoResponse(ctx) {
  const groupId = ctx.chat.id;
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    return ctx.reply('⚠️ يرجى تحديد [تفعيل/تعطيل]');
  }

  const enabled = args[1] === 'تفعيل' || args[1] === 'on';

  await GroupSettings.findOneAndUpdate(
    { groupId },
    { 'automation.autoReply.enabled': enabled }
  );

  await ctx.reply(`✅ تم ${enabled ? 'تفعيل' : 'تعطيل'} الردود الآلية`);
}

/**
 * تغيير رتبة عضو
 */
async function handleRank(ctx) {
  if (!ctx.message.reply_to_message && !ctx.message.text.split(' ')[1]) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  const userId = ctx.message.reply_to_message?.from?.id;
  const groupId = ctx.chat.id;
  const newRank = ctx.message.text.split(' ')[1];

  if (!userId || !newRank) {
    return ctx.reply('⚠️ يرجى تحديد الرتبة (member/vip/moderator/admin)');
  }

  const validRanks = ['member', 'vip', 'moderator', 'admin'];
  if (!validRanks.includes(newRank)) {
    return ctx.reply('⚠️ الرتب المتاحة: member, vip, moderator, admin');
  }

  await GroupMember.findOneAndUpdate(
    { userId, groupId },
    { role: newRank }
  );

  await ctx.reply(`✅ تم تغيير الرتبة إلى: ${newRank}`);
}

/**
 * عقوبة عضو
 */
async function handlePenalty(ctx) {
  if (!ctx.message.reply_to_message) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  const userId = ctx.message.reply_to_message.from.id;
  const groupId = ctx.chat.id;
  const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'عقوبة';

  const member = await GroupMember.findOne({ userId, groupId });
  if (!member) {
    return ctx.reply('❌ لم يتم العثور على العضو');
  }

  member.addPenalty(reason);
  member.addPoints(-10);
  await member.save();

  await ctx.reply(`✅ تم تسجيل عقوبة: ${reason} (-10 نقاط)`);
}

/**
 * حظر حساب مزيف
 */
async function handleFakeBan(ctx) {
  if (!ctx.message.reply_to_message) {
    return ctx.reply('⚠️ يرجى الرد على رسالة المستخدم');
  }

  const userId = ctx.message.reply_to_message.from.id;
  const groupId = ctx.chat.id;

  const success = await groupHandlers.kickUser(groupId, userId, ctx.telegram);

  if (success) {
    await ctx.reply('✅ تم حظر الحساب المزيف');
  } else {
    await ctx.reply('❌ فشل في حظر الحساب');
  }
}

/**
 * استخراج معرف المستخدم من النص
 */
function extractUserId(text) {
  const mentionMatch = text.match(/(\d+)/);
  if (mentionMatch) {
    return parseInt(mentionMatch[1]);
  }

  const usernameMatch = text.match(/@(\w+)/);
  if (usernameMatch) {
    return usernameMatch[1];
  }

  return null;
}

// ============ دوال الإحصائيات الجديدة ============

/**
 * عرض إحصائيات اليوم
 * 📊 إحصائيات اليوم
 * • 💬 الرسائل: 150
 * • 👥 النشطون: 25
 * • ❤️ التفاعلات: 80
 * • 🕐 آخر تحديث: HH:MM
 */
async function handleDailyStats(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // جلب إحصائيات اليوم
  const stats = await GroupStats.findOne({ groupId, date: today });

  const dailyMessages = stats?.daily?.messages || 0;
  const dailyActiveUsers = stats?.daily?.activeUsers || 0;
  const dailyInteractions = stats?.daily?.interactions || 0;
  const lastUpdated = stats?.daily?.lastUpdated
    ? new Date(stats.daily.lastUpdated).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '---';

  const text = `📊 إحصائيات اليوم

• 💬 الرسائل: ${dailyMessages}
• 👥 النشطون: ${dailyActiveUsers}
• ❤️ التفاعلات: ${dailyInteractions}
• 🕐 آخر تحديث: ${lastUpdated}`;

  await ctx.reply(text);
}

/**
 * عرض قائمة أعضاء المجموعة
 * 👥 أعضاء المجموعة (3)
 * 1. 👤 اسم المستخدم @username
 *    نقاط: 500 | joined: 2024-01-15
 */
async function handleGroupMembersList(ctx) {
  // التحقق من أنها مجموعة
  if (!isGroup(ctx)) {
    return sendPrivateChatError(ctx);
  }

  const groupId = ctx.chat.id;

  // جلب قائمة الأعضاء مرتبة حسب النقاط
  const members = await GroupMember.find({ groupId, isActive: true })
    .sort({ points: -1 })
    .limit(20);

  if (members.length === 0) {
    return ctx.reply('❌ لا يوجد أعضاء مسجلين في هذه المجموعة');
  }

  let text = `👥 أعضاء المجموعة (${members.length})\n\n`;

  members.forEach((member, index) => {
    const username = member.username ? `@${member.username}` : 'بدون يوزر';
    const joinedDate = member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString('ar-SA')
      : 'غير معروف';

    text += `${index + 1}. 👤 ${member.firstName || 'مستخدم'} ${username}\n`;
    text += `   نقاط: ${member.points} | انضم: ${joinedDate}\n\n`;
  });

  await ctx.reply(text);
}

/**
 * عرض الملف الشخصي للمستخدم
 * 👤 ملفي الشخصي
 * • نقاطي: 500 🪙
 * • ترتيبي: 3 🥉
 * • انضممت: 2024-01-15 📅
 *
 * 📊 إحصائياتي:
 * • الرسائل: 150 💬
 * • التفاعلات: 80 ❤️
 */
async function handleMyProfile(ctx) {
  const userId = ctx.from.id;
  const groupId = ctx.chat?.id;

  // إذا لم تكن في مجموعة، اعرض رسالة خطأ
  if (!groupId) {
    return ctx.reply('⚠️ يرجى استخدام هذا الأمر في مجموعة');
  }

  // جلب بيانات المستخدم من المجموعة
  const member = await GroupMember.findOne({ userId, groupId });

  if (!member) {
    return ctx.reply('❌ لم يتم العثور على بياناتك في هذه المجموعة');
  }

  // حساب الترتيب
  const rank = await GroupMember.countDocuments({
    groupId,
    isActive: true,
    points: { $gt: member.points }
  }) + 1;

  // تنسيق التاريخ
  const joinedDate = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString('ar-SA')
    : 'غير معروف';

  // medals for rank
  const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

  const text = `👤 ملفي الشخصي

• نقاطي: ${member.points} 🪙
• ترتيبي: ${rank} ${rankMedal}
• انضممت: ${joinedDate} 📅

📊 إحصائياتي:
• الرسائل: ${member.activity?.messagesCount || 0} 💬
• الميديا: ${member.activity?.mediaCount || 0} 📷
• المستوي: ${member.level} ⭐
• الخبرة: ${member.xp} ✨`;

  await ctx.reply(text);
}

/**
 * لوحة الإعدادات
 */
function getSettingsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🛡️ الحماية', callback_data: 'settings_protection' }],
      [{ text: '👋 الترحيب', callback_data: 'settings_welcome' }],
      [{ text: '📋 القواعد', callback_data: 'settings_rules' }],
      [{ text: '📊 الإحصائيات', callback_data: 'settings_stats' }]
    ]
  };
}

module.exports = {
  registerGroupCommands,
  handleSettings,
  handleGroupInfo,
  handleMembers,
  handleAdmins,
  handleModerators,
  handleProtection,
  handleWelcome,
  handleFarewell,
  handleRules,
  handleStats,
  handleLeaderboard,
  handleMyPoints,
  handlePromote,
  handleDemote,
  handleKick,
  handleBan,
  handleUnban,
  handleMute,
  handleUnmute,
  handleLinkFilter,
  handleSpamFilter,
  handleAntiFlood,
  handleAutoReply,
  handleAutoResponse,
  handleRank,
  handlePenalty,
  handleFakeBan,
  handleOwner,
  handleRefreshAdmins,
  // دوال الإحصائيات الجديدة
  handleDailyStats,
  handleGroupMembersList,
  handleMyProfile
};
