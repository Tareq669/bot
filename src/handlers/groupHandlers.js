/**
 * معالج إدارة المجموعات
 * Handles group management events and commands
 */
const { GroupSettings, GroupMember, GroupStats } = require('../database/models/GroupManagement');

/**
 * تهيئة معالج المجموعات
 * @param {Object} bot - نسخة البوت
 */
function initGroupHandlers(bot) {
  // معالج انضمام عضو جديد للمجموعة
  bot.on('new_chat_members', async (ctx) => {
    await handleNewMembers(ctx, bot);
  });

  // معالج مغادرة عضو للمجموعة
  bot.on('left_chat_member', async (ctx) => {
    await handleMemberLeft(ctx, bot);
  });

  // معالج رسالة جديدة
  bot.on('message', async (ctx) => {
    if (ctx.message && ctx.message.text) {
      await handleGroupMessage(ctx, bot);
    }
  });
}

/**
 * معالجة انضمام أعضاء جدد
 */
async function handleNewMembers(ctx, bot) {
  const chat = ctx.chat;
  const newMembers = ctx.message.new_chat_members;

  if (!chat || !newMembers || chat.type === 'private') return;

  const groupId = chat.id;

  // البحث عن إعدادات المجموعة أو إنشاؤها
  let settings = await GroupSettings.findOne({ groupId });
  if (!settings) {
    settings = new GroupSettings({
      groupId,
      title: chat.title,
      type: chat.type,
      owner: { userId: chat.all_administrators()[0]?.user.id }
    });
    await settings.save();
  }

  // التحقق من حماية الحسابات المزيفة
  if (settings.protection.fakeAccountProtection?.enabled) {
    for (const member of newMembers) {
      const isFake = await checkFakeAccount(member, settings.protection.fakeAccountProtection);
      if (isFake) {
        try {
          await bot.kickChatMember(groupId, member.id);
          if (settings.protection.fakeAccountProtection.notifyAdmins) {
            await notifyAdmins(groupId, bot, `تم طرد حساب مزيف: ${member.id}`);
          }
          continue;
        } catch (error) {
          console.error('خطأ في طرد الحساب المزيف:', error);
        }
      }
    }
  }

  // إرسال رسالة الترحيب
  if (settings.welcome?.enabled && newMembers.length > 0) {
    const member = newMembers[0];
    await sendWelcomeMessage(ctx, settings, member);
  }

  // إضافة الأعضاء الجدد لقاعدة البيانات
  for (const member of newMembers) {
    await addOrUpdateMember(groupId, member, 'member');
  }

  // تحديث الإحصائيات
  await updateGroupStats(groupId, 'memberJoined');
}

/**
 * معالجة مغادرة عضو
 */
async function handleMemberLeft(ctx) {
  const chat = ctx.chat;
  const leftMember = ctx.message.left_chat_member;

  if (!chat || !leftMember || chat.type === 'private') return;

  const groupId = chat.id;
  const userId = leftMember.id;

  // تحديث بيانات العضو
  await GroupMember.findOneAndUpdate(
    { userId, groupId },
    {
      leftAt: new Date(),
      isActive: false
    }
  );

  // إرسال رسالة الوداع
  const settings = await GroupSettings.findOne({ groupId });
  if (settings?.farewell?.enabled) {
    const farewellText = settings.farewell.message
      .replace('{username}', leftMember.first_name)
      .replace('{title}', chat.title);

    await ctx.reply(farewellText, { parse_mode: 'HTML' });
  }

  // تحديث الإحصائيات
  await updateGroupStats(groupId, 'memberLeft');
}

/**
 * معالجة رسالة في المجموعة
 */
async function handleGroupMessage(ctx, bot) {
  const chat = ctx.chat;
  const user = ctx.from;
  const message = ctx.message;

  if (!chat || chat.type === 'private') return;

  const groupId = chat.id;
  const userId = user.id;

  // البحث عن إعدادات المجموعة
  const settings = await GroupSettings.findOne({ groupId });
  if (!settings) return;

  // التحقق من الحماية
  await checkProtection(ctx, settings, bot);

  // تحديث نشاط العضو
  await updateMemberActivity(groupId, userId);

  // تحديث إحصائيات الرسائل
  await updateMessageStats(groupId, message);
}

/**
 * التحقق من حماية المجموعة
 */
async function checkProtection(ctx, settings, bot) {
  const message = ctx.message;
  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  // فحص الروابط
  if (settings.protection.linkFilter?.enabled) {
    const hasLink = detectLinks(message.text || '');
    if (hasLink && !hasPermission(userId, settings, ['admin', 'moderator'])) {
      const action = settings.protection.linkFilter.action;
      if (action === 'delete') {
        await bot.deleteMessage(groupId, message.message_id);
      } else if (action === 'warn') {
        await warnUser(groupId, userId, 'إرسال روابط', bot);
      }
    }
  }

  // فحص السبام
  if (settings.protection.spamProtection?.enabled) {
    const isSpam = await checkSpam(ctx, settings);
    if (isSpam) {
      const action = settings.protection.spamProtection.action;
      if (action === 'delete') {
        await bot.deleteMessage(groupId, message.message_id);
      } else if (action === 'mute') {
        await muteUser(groupId, userId, settings.protection.spamProtection.muteDuration || 300, bot);
      }
    }
  }

  // فحص Flood
  if (settings.protection.antiFlood?.enabled) {
    const isFlooding = await checkFlood(ctx, settings);
    if (isFlooding) {
      await muteUser(groupId, userId, settings.protection.antiFlood.muteDuration || 600, bot);
    }
  }
}

/**
 * فحص الحسابات المزيفة
 */
async function checkFakeAccount(member, options) {
  // فحص بسيط للحسابات المزيفة
  if (!member.username && options.requireUsername) return true;
  if (member.is_bot && options.blockBots) return true;

  // يمكن إضافة فحوصات إضافية هنا
  return false;
}

/**
 * إرسال رسالة ترحيبية
 */
async function sendWelcomeMessage(ctx, settings, member) {
  const welcomeText = settings.welcome.message
    .replace('{username}', member.first_name)
    .replace('{title}', ctx.chat.title)
    .replace('{rules}', settings.rulesEnabled ? '\n📋 اقرأ القواعد من القائمة.' : '');

  const options = {
    parse_mode: 'HTML',
    reply_markup: settings.rulesEnabled ? getRulesKeyboard() : undefined
  };

  await ctx.reply(welcomeText, options);
}

/**
 * إضافة أو تحديث عضو
 */
async function addOrUpdateMember(groupId, member, role = 'member') {
  let memberData = await GroupMember.findOne({ userId: member.id, groupId });

  if (!memberData) {
    memberData = new GroupMember({
      userId: member.id,
      groupId,
      username: member.username || member.first_name,
      firstName: member.first_name,
      lastName: member.last_name,
      role,
      joinedAt: new Date()
    });
  } else {
    memberData.leftAt = null;
    memberData.isActive = true;
    memberData.joinedAt = new Date();
  }

  await memberData.save();
  return memberData;
}

/**
 * تحديث نشاط العضو
 */
async function updateMemberActivity(groupId, userId) {
  await GroupMember.findOneAndUpdate(
    { userId, groupId },
    {
      lastActive: new Date(),
      $inc: { messagesCount: 1 }
    }
  );
}

/**
 * تحديث إحصائيات المجموعة
 */
async function updateGroupStats(groupId, type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const update = {};
  switch (type) {
    case 'memberJoined':
      update['members.newMembers'] = 1;
      update['members.totalMembers'] = 1;
      break;
    case 'memberLeft':
      update['members.leftMembers'] = 1;
      update['members.totalMembers'] = -1;
      break;
  }

  await GroupStats.findOneAndUpdate(
    { groupId, date: today },
    { $inc: update },
    { upsert: true }
  );
}

/**
 * تحديث إحصائيات الرسائل
 */
async function updateMessageStats(groupId, message) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const messageType = getMessageType(message);
  const update = {
    'messages.totalMessages': 1
  };
  update[`messages.${messageType}`] = 1;

  await GroupStats.findOneAndUpdate(
    { groupId, date: today },
    { $inc: update },
    { upsert: true }
  );
}

/**
 * تحديد نوع الرسالة
 */
function getMessageType(message) {
  if (message.photo) return 'mediaMessages';
  if (message.video) return 'mediaMessages';
  if (message.voice) return 'voiceMessages';
  if (message.document) return 'documents';
  return 'textMessages';
}

/**
 * فحص الروابط
 */
function detectLinks(text) {
  const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9]+\.(com|net|org|io|co))/gi;
  return linkPattern.test(text);
}

/**
 * فحص السبام
 */
async function checkSpam() {
  // تنفيذ فحص السبام
  // يمكن استخدام خوارزميات أكثر تعقيداً
  return false;
}

/**
 * فحص Flood
 */
async function checkFlood() {
  // تنفيذ فحص Flood
  // يجب تخزين عدد الرسائل مؤقتاً
  return false;
}

/**
 * التحقق من الصلاحيات
 */
function hasPermission(userId, settings) {
  const userIdStr = String(userId);

  if (settings.owner?.userId === userIdStr) return true;
  if (settings.admins?.some(a => String(a.userId) === userIdStr)) return true;
  if (settings.moderators?.some(m => String(m.userId) === userIdStr)) return true;

  return false;
}

/**
 * تحذير مستخدم
 */
async function warnUser(groupId, userId, reason, bot) {
  const member = await GroupMember.findOne({ userId, groupId });
  if (!member) return;

  member.addWarning(reason, 'System');
  await member.save();

  const settings = await GroupSettings.findOne({ groupId });
  const maxWarns = settings?.protection?.maxWarns || 3;

  if (member.warnings.length >= maxWarns) {
    await muteUser(groupId, userId, 3600, bot);
  }
}

/**
 * كتم مستخدم
 */
async function muteUser(groupId, userId, duration, bot) {
  try {
    const untilDate = Math.floor(Date.now() / 1000) + duration;
    await bot.restrictChatMember(groupId, userId, {
      until_date: untilDate,
      can_send_messages: false
    });

    const member = await GroupMember.findOne({ userId, groupId });
    if (member) {
      member.mutedUntil = new Date(untilDate * 1000);
      await member.save();
    }
  } catch (error) {
    console.error('خطأ في كتم المستخدم:', error);
  }
}

/**
 * إشعار الأدمن
 */
async function notifyAdmins(groupId, bot, text) {
  try {
    const admins = await bot.getChatAdministrators(groupId);

    for (const admin of admins) {
      if (admin.user.id !== bot.botInfo.id) {
        try {
          await bot.sendMessage(admin.user.id, text);
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }
  } catch (error) {
    console.error('خطأ في إشعار الأدمن:', error);
  }
}

/**
 * الحصول على لوحة القواعد
 */
function getRulesKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📋 قراءة القواعد', callback_data: 'show_rules' }]
    ]
  };
}

// ============ دوال عامة لإدارة المجموعة ============

/**
 * رفع مستخدم إلى أدمن
 */
async function promoteUser(groupId, userId, bot) {
  try {
    await bot.promoteChatMember(groupId, userId, {
      can_change_info: true,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true
    });

    const settings = await GroupSettings.findOne({ groupId });
    const member = await GroupMember.findOne({ userId, groupId });

    if (member) {
      member.role = 'admin';
      member.permissions = {
        canChangeInfo: true,
        canDeleteMessages: true,
        canInviteUsers: true,
        canRestrictMembers: true,
        canPinMessages: true
      };
      await member.save();
    }

    if (settings && !settings.admins.some(a => a.userId === userId)) {
      settings.admins.push({ userId, addedAt: new Date() });
      await settings.save();
    }

    return true;
  } catch (error) {
    console.error('خطأ في رفع الأدمن:', error);
    return false;
  }
}

/**
 * تنزيل مستخدم من أدمن
 */
async function demoteUser(groupId, userId, bot) {
  try {
    await bot.promoteChatMember(groupId, userId, {
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false
    });

    const member = await GroupMember.findOne({ userId, groupId });
    if (member) {
      member.role = 'member';
      member.permissions = {};
      await member.save();
    }

    const settings = await GroupSettings.findOne({ groupId });
    if (settings) {
      settings.admins = settings.admins.filter(a => String(a.userId) !== String(userId));
      await settings.save();
    }

    return true;
  } catch (error) {
    console.error('خطأ في تنزيل الأدمن:', error);
    return false;
  }
}

/**
 * طرد مستخدم
 */
async function kickUser(groupId, userId, bot) {
  try {
    await bot.kickChatMember(groupId, userId);

    // إزالة من الأدمن أو المشرفين
    const settings = await GroupSettings.findOne({ groupId });
    if (settings) {
      settings.admins = settings.admins.filter(a => String(a.userId) !== String(userId));
      settings.moderators = settings.moderators?.filter(m => String(m.userId) !== String(userId)) || [];
      await settings.save();
    }

    const member = await GroupMember.findOne({ userId, groupId });
    if (member) {
      member.leftAt = new Date();
      member.isActive = false;
      await member.save();
    }

    return true;
  } catch (error) {
    console.error('خطأ في طرد المستخدم:', error);
    return false;
  }
}

/**
 * حظر مستخدم
 */
async function banUser(groupId, userId, bot) {
  return kickUser(groupId, userId, bot);
}

/**
 * إلغاء حظر مستخدم
 */
async function unbanUser(groupId, userId, bot) {
  try {
    await bot.unbanChatMember(groupId, userId);
    return true;
  } catch (error) {
    console.error('خطأ في إلغاء الحظر:', error);
    return false;
  }
}

/**
 * تثبيت رسالة
 */
async function pinMessage(groupId, messageId, bot) {
  try {
    await bot.pinChatMessage(groupId, messageId);
    return true;
  } catch (error) {
    console.error('خطأ في تثبيت الرسالة:', error);
    return false;
  }
}

/**
 * إلغاء تثبيت رسالة
 */
async function unpinMessage(groupId, messageId, bot) {
  try {
    await bot.unpinChatMessage(groupId, messageId);
    return true;
  } catch (error) {
    console.error('خطأ في إلغاء تثبيت الرسالة:', error);
    return false;
  }
}

/**
 * حذف رسالة
 */
async function deleteMessage(groupId, messageId, bot) {
  try {
    await bot.deleteMessage(groupId, messageId);
    return true;
  } catch (error) {
    console.error('خطأ في حذف الرسالة:', error);
    return false;
  }
}

/**
 * إرسال رسالة للمجموعة
 */
async function sendToGroup(groupId, text, bot, options = {}) {
  try {
    const message = await bot.sendMessage(groupId, text, options);
    return message;
  } catch (error) {
    console.error('خطأ في إرسال الرسالة:', error);
    return null;
  }
}

/**
 * الحصول على قائمة الأعضاء
 */
async function getGroupMembers(groupId, bot) {
  try {
    const members = await bot.getChatAdministrators(groupId);
    return members;
  } catch (error) {
    console.error('خطأ في الحصول على الأعضاء:', error);
    return [];
  }
}

/**
 * الحصول على معلومات المجموعة
 */
async function getGroupInfo(groupId, bot) {
  try {
    const chat = await bot.getChat(groupId);
    return {
      id: chat.id,
      title: chat.title,
      type: chat.type,
      description: chat.description,
      inviteLink: chat.invite_link,
      photo: chat.photo
    };
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المجموعة:', error);
    return null;
  }
}

/**
 * تحديث عنوان المجموعة
 */
async function setGroupTitle(groupId, title, bot) {
  try {
    await bot.setChatTitle(groupId, title);
    await GroupSettings.findOneAndUpdate({ groupId }, { title });
    return true;
  } catch (error) {
    console.error('خطأ في تحديث العنوان:', error);
    return false;
  }
}

/**
 * تحديث وصف المجموعة
 */
async function setGroupDescription(groupId, description, bot) {
  try {
    await bot.setChatDescription(groupId, description);
    await GroupSettings.findOneAndUpdate({ groupId }, { description });
    return true;
  } catch (error) {
    console.error('خطأ في تحديث الوصف:', error);
    return false;
  }
}

/**
 * تحديث صورة المجموعة
 */
async function setGroupPhoto(groupId, photo, bot) {
  try {
    await bot.setChatPhoto(groupId, photo);
    return true;
  } catch (error) {
    console.error('خطأ في تحديث الصورة:', error);
    return false;
  }
}

/**
 * الحصول على إعدادات المجموعة
 */
async function getGroupSettings(groupId) {
  let settings = await GroupSettings.findOne({ groupId });

  if (!settings) {
    settings = new GroupSettings({
      groupId,
      type: 'supergroup'
    });
    await settings.save();
  }

  return settings;
}

/**
 * تحديث إعدادات الحماية
 */
async function updateProtectionSettings(groupId, protection) {
  return GroupSettings.findOneAndUpdate(
    { groupId },
    { protection },
    { new: true }
  );
}

/**
 * تحديث إعدادات الترحيب
 */
async function updateWelcomeSettings(groupId, welcome) {
  return GroupSettings.findOneAndUpdate(
    { groupId },
    { welcome },
    { new: true }
  );
}

/**
 * تحديث إعدادات الوداع
 */
async function updateFarewellSettings(groupId, farewell) {
  return GroupSettings.findOneAndUpdate(
    { groupId },
    { farewell },
    { new: true }
  );
}

/**
 * الحصول على لوحة المفاتيح الرئيسية للمجموعة
 */
function getGroupMainKeyboard() {
  return {
    keyboard: [
      ['👥_members', '📊_stats'],
      ['⚙️_settings', '🛡️_protection'],
      ['📋_rules', '🔧_admin']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * الحصول على لوحة إعدادات الحماية
 */
function getProtectionKeyboard() {
  return {
    keyboard: [
      ['🔗فلترة الروابط', '🚫منع السبام'],
      ['🌊مضاد Flood', '🤖حماية الحسابات'],
      ['⬅️رجوع']
    ],
    resize_keyboard: true
  };
}

/**
 * الحصول على لوحة الإعدادات
 */
function getSettingsKeyboard() {
  return {
    keyboard: [
      ['👋ترحيب', '👋وداع'],
      ['📝قواعد', '📊إحصائيات'],
      ['⚙️أتمتة', '⭐سمعة'],
      ['⬅️رجوع']
    ],
    resize_keyboard: true
  };
}

module.exports = {
  initGroupHandlers,
  handleNewMembers,
  handleMemberLeft,
  handleGroupMessage,
  promoteUser,
  demoteUser,
  kickUser,
  banUser,
  unbanUser,
  pinMessage,
  unpinMessage,
  deleteMessage,
  sendToGroup,
  getGroupMembers,
  getGroupInfo,
  setGroupTitle,
  setGroupDescription,
  setGroupPhoto,
  getGroupSettings,
  updateProtectionSettings,
  updateWelcomeSettings,
  updateFarewellSettings,
  getGroupMainKeyboard,
  getProtectionKeyboard,
  getSettingsKeyboard
};
