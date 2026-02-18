/**
 * مسhelper للتمييز بين المجموعات والدردشات الخاصة
 * Group/Private Chat Helper
 */

/**
 * التحقق مما إذا كانت الدردشة مجموعة
 * @param {Object} ctx - سياق التلغرام
 * @returns {boolean} - true إذا كانت مجموعة
 */
function isGroup(ctx) {
  return ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup');
}

/**
 * التحقق مما إذا كانت الدردشة خاصة
 * @param {Object} ctx - سياق التلغرام
 * @returns {boolean} - true إذا كانت دردشة خاصة
 */
function isPrivate(ctx) {
  return ctx.chat && ctx.chat.type === 'private';
}

/**
 * التحقق مما إذا كان المستخدم أدمن في المجموعة
 * @param {Object} ctx - سياق التلغرام
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<boolean>} - true إذا كان المستخدم أدمن
 */
async function isAdmin(ctx, bot) {
  if (isPrivate(ctx)) return false;

  try {
    const chatMember = await bot.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    console.error('خطأ في التحقق من الأدمن:', error);
    return false;
  }
}

/**
 * التحقق مما إذا كان المستخدم مالك المجموعة
 * @param {Object} ctx - سياق التلغرام
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<boolean>} - true إذا كان المستخدم مالك
 */
async function isOwner(ctx, bot) {
  if (isPrivate(ctx)) return false;

  try {
    const chatMember = await bot.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return chatMember.status === 'creator';
  } catch (error) {
    console.error('خطأ في التحقق من المالك:', error);
    return false;
  }
}

/**
 * التحقق مما إذا كان المستخدم أدمن أو مالك
 * @param {Object} ctx - سياق التلغرام
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<boolean>} - true إذا كان أدمن أو مالك
 */
async function isAdminOrOwner(ctx, bot) {
  return isAdmin(ctx, bot) || isOwner(ctx, bot);
}

/**
 * الحصول على معلومات المالك والمشرفين من التليجرام
 * @param {number} groupId - معرف المجموعة
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<Object>} - معلومات المالك والمشرفين
 */
async function getGroupAdminsFromTelegram(groupId, bot) {
  try {
    const administrators = await bot.telegram.getChatAdministrators(groupId);

    let owner = null;
    const admins = [];

    for (const admin of administrators) {
      if (admin.status === 'creator') {
        owner = {
          userId: admin.user.id,
          firstName: admin.user.first_name,
          lastName: admin.user.last_name,
          username: admin.user.username,
          isBot: admin.user.is_bot
        };
      } else if (admin.status === 'administrator') {
        admins.push({
          userId: admin.user.id,
          firstName: admin.user.first_name,
          lastName: admin.user.last_name,
          username: admin.user.username,
          isBot: admin.user.is_bot,
          canChangeInfo: admin.can_change_info,
          canDeleteMessages: admin.can_delete_messages,
          canInviteUsers: admin.can_invite_users,
          canRestrictMembers: admin.can_restrict_members,
          canPinMessages: admin.can_pin_messages
        });
      }
    }

    return { owner, admins };
  } catch (error) {
    console.error('خطأ في جلب الأدمنز:', error);
    return { owner: null, admins: [] };
  }
}

/**
 * تحديث بيانات المالك والمشرفين في قاعدة البيانات
 * @param {number} groupId - معرف المجموعة
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<Object>} - النتيجة
 */
async function updateGroupAdmins(groupId, bot) {
  const { GroupSettings } = require('../database/models/GroupManagement');

  try {
    const { owner, admins } = await getGroupAdminsFromTelegram(groupId, bot);

    await GroupSettings.findOneAndUpdate(
      { groupId },
      {
        owner: owner,
        admins: admins.map(a => ({
          userId: a.userId,
          firstName: a.firstName,
          lastName: a.lastName,
          username: a.username,
          canChangeInfo: a.canChangeInfo,
          canDeleteMessages: a.canDeleteMessages,
          canInviteUsers: a.canInviteUsers,
          canRestrictMembers: a.canRestrictMembers,
          canPinMessages: a.canPinMessages,
          addedAt: new Date()
        })),
        lastAdminUpdate: new Date()
      },
      { upsert: true, new: true }
    );

    return { success: true, owner, adminsCount: admins.length };
  } catch (error) {
    console.error('خطأ في تحديث الأدمنز:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال رسالة خطأ للدردشة الخاصة
 * @param {Object} ctx - سياق التلغرام
 */
async function sendPrivateChatError(ctx) {
  const message = `
🚫 <b>هذا الأمر للمجموعات فقط</b>

📌 هذا الأمر يعمل فقط في المجموعات وليس في الدردشة الخاصة.

💡 للتفاعل مع البوت في المجموعات، أضف البوت إلى مجموعتك واستخدم الأمر هناك.
`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

/**
 * إرسال رسالة خطأ لعدم وجود صلاحيات
 * @param {Object} ctx - سياق التلغرام
 */
async function sendNotAdminError(ctx) {
  const message = `
🚫 <b>ليس لديك صلاحيات</b>

📌 هذا الأمر يتطلب صلاحيات الأدمن أو المالك على الأقل.

💡 يرجى التواصل مع مالك المجموعة للحصول على الصلاحيات اللازمة.
`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

/**
 * التحقق من المجموعة والأدمن معاً
 * @param {Object} ctx - سياق التلغرام
 * @param {Object} bot - نسخة البوت
 * @returns {Promise<{isGroup: boolean, isAdmin: boolean}>}
 */
async function checkGroupAndAdmin(ctx, bot) {
  return {
    isGroup: isGroup(ctx),
    isAdmin: await isAdmin(ctx, bot)
  };
}

/**
 * الحصول على معرف الدردشة
 * @param {Object} ctx - سياق التلغرام
 * @returns {number} - معرف الدردشة
 */
function getChatId(ctx) {
  return ctx.chat.id;
}

/**
 * الحصول على معرف المستخدم
 * @param {Object} ctx - سياق التلغرام
 * @returns {number} - معرف المستخدم
 */
function getUserId(ctx) {
  return ctx.from.id;
}

/**
 * الحصول على اسم المستخدم
 * @param {Object} ctx - سياق التلغرام
 * @returns {string} - اسم المستخدم
 */
function getUserName(ctx) {
  return ctx.from.first_name + (ctx.from.last_name ? ` ${  ctx.from.last_name}` : '');
}

/**
 * التحقق مما إذا كانت الرسالة رد على رسالة أخرى
 * @param {Object} ctx - سياق التلغرام
 * @returns {boolean} - true إذا كانت رد
 */
function isReply(ctx) {
  return ctx.message && ctx.message.reply_to_message;
}

/**
 * الحصول على المستخدم الذي تم الرد عليه
 * @param {Object} ctx - سياق التلغرام
 * @returns {Object|null} - بيانات المستخدم أو null
 */
function getRepliedUser(ctx) {
  if (!isReply(ctx)) return null;
  return ctx.message.reply_to_message.from;
}

/**
 * التحقق مما إذا كان المستخدم مالك البوت
 * @param {Object} ctx - سياق التلغرام
 * @param {string} ownerId - معرف مالك البوت
 * @returns {boolean} - true إذا كان مالك البوت
 */
function isBotOwner(ctx, ownerId) {
  return String(ctx.from.id) === String(ownerId);
}

module.exports = {
  isGroup,
  isPrivate,
  isAdmin,
  isOwner,
  isAdminOrOwner,
  getGroupAdminsFromTelegram,
  updateGroupAdmins,
  sendPrivateChatError,
  sendNotAdminError,
  checkGroupAndAdmin,
  getChatId,
  getUserId,
  getUserName,
  isReply,
  getRepliedUser,
  isBotOwner
};
