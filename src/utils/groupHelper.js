/**
 * دوال مساعدة لإدارة المجموعات
 * Group Helper Functions
 */
const GroupProtection = require('../database/models/GroupProtection');

/**
 * التحقق من أن المحادثة مجموعة
 */
function isGroup(ctx) {
  return ctx.chat && ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
}

/**
 * إرسال رسالة خطأ للمحادثة الخاصة
 */
async function sendPrivateChatError(ctx) {
  await ctx.reply('❌ هذا الأمر للمجموعات فقط');
}

/**
 * إرسال رسالة خطأ للمستخدم غير الأدمن
 */
async function sendNotAdminError(ctx) {
  await ctx.reply('❌ هذا الأمر للمشرفين فقط');
}

/**
 * التحقق إذا كان المستخدم أدمن في المجموعة
 */
async function isAdmin(ctx, telegram) {
  if (!isGroup(ctx)) return false;

  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const chatMember = await telegram.getChatMember(chatId, userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    console.error('Error checking admin:', error);
    return false;
  }
}

/**
 * جلب أو إنشاء إعدادات المجموعة
 */
async function getOrCreateGroupSettings(groupId) {
  let settings = await GroupProtection.findOne({ groupId });

  if (!settings) {
    settings = new GroupProtection({ groupId });
    await settings.save();
  }

  return settings;
}

/**
 * تحديث قفل معين
 */
async function toggleLock(groupId, lockName, enabled) {
  const settings = await getOrCreateGroupSettings(groupId);
  settings.locks[lockName] = enabled;
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
}

/**
 * تحديث طريقة القفل
 */
async function setLockMethod(groupId, method) {
  const settings = await getOrCreateGroupSettings(groupId);
  settings.locks.lockMethod = method;
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
}

/**
 * تحديث المحظورات
 */
async function toggleProhibited(groupId, prohibitedName, enabled) {
  const settings = await getOrCreateGroupSettings(groupId);
  settings.prohibited[prohibitedName] = enabled;
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
}

/**
 * قفل/فتح عنصر معين
 */
async function lockItem(ctx, item, method = 'mute') {
  const groupId = ctx.chat.id;

  const settings = await getOrCreateGroupSettings(groupId);
  settings.locks[item] = true;
  settings.locks.lockMethod = method;
  settings.updatedAt = new Date();
  await settings.save();

  return settings;
}

/**
 * فتح قفل عنصر معين
 */
async function unlockItem(ctx, item) {
  const groupId = ctx.chat.id;

  const settings = await getOrCreateGroupSettings(groupId);
  settings.locks[item] = false;
  settings.updatedAt = new Date();
  await settings.save();

  return settings;
}

/**
 * الحصول على رسالة القفل
 */
function getLockMessage(item, isLocked, method) {
  const itemNames = {
    chat: 'الدردشة',
    usernames: 'المعرفات',
    photos: 'الصور',
    uploading: 'الرفع',
    voice: 'الصوت',
    greeting: 'الترحيب',
    leaving: 'المغادرة',
    whispers: 'الهمسة',
    songs: 'الأغاني',
    translation: 'الترجمة',
    replies: 'الردود',
    forwarding: 'التوجيه',
    notifications: 'الإشعارات',
    tags: 'التاج',
    deleteLink: 'رابط الحذف',
    kickMe: 'اطردني',
    whoAdded: 'مين ضافني',
    games: 'الألعاب',
    stories: 'الروايات',
    horoscopes: 'الأبراج',
    nameMeanings: 'معاني الأسماء',
    welcome: 'الترحيب'
  };

  const status = isLocked ? 'مقفول' : 'مفتوح';
  const methodText = method === 'kick' ? 'بالطرد' : 'بالكتم';

  return `🔒 ${itemNames[item] || item}: ${status} ${isLocked ? methodText : ''}`;
}

/**
 * تنسيق قائمة الإعدادات
 */
function formatSettingsMessage(settings) {
  // eslint-disable-next-line no-unused-vars
  const locks = settings.locks;
  // eslint-disable-next-line no-unused-vars
  const prohibited = settings.prohibited;

  let message = '⚙️⁩ ❬ م1 ❭ اوامر حماية المجموعه ⇊\n';
  message += '════════ ××× ════════\n';

  // القفل والفتح
  message += '🔐 ╖ قفل «» فتح + الامر \n';
  message += '♻️ ╜ قفل «» فتح ❬ الكـــل ❭ \n';
  message += '════════ ××× ════════\n';

  // العناصر
  const items = [
    ['📮', 'chat', 'الدردشه'],
    ['📜', 'usernames', 'المعرفات'],
    ['📸', 'photos', 'الصور'],
    ['⏏️', 'uploading', 'الرفع'],
    ['🎧', 'voice', 'الصوت'],
    ['🔊', 'greeting', 'الترحيب'],
    ['🚫', 'leaving', 'المغادره'],
    ['🐹', 'whispers', 'الهمسه'],
    ['🎧', 'songs', 'الاغاني'],
    ['💱', 'translation', 'الترجمه'],
    ['🔄', 'replies', 'الردود'],
    ['🚿', 'forwarding', 'التوجيه'],
    ['🗳️', 'notifications', 'الاشعارات'],
    ['💳', 'tags', 'التاج'],
    ['🧾', 'deleteLink', 'رابط الحذف'],
    ['🔈', 'kickMe', 'اطردني'],
    ['🤔', 'whoAdded', 'مين ضافني'],
    ['🏓', 'games', 'الالعاب'],
    ['🎁', 'stories', 'الروايات'],
    ['🎆', 'horoscopes', 'الابراج'],
    ['🔍', 'nameMeanings', 'معاني الاسماء'],
    ['💬', 'welcome', 'الترحيب']
  ];

  for (const [emoji, _key, name] of items) {
    message += `${emoji}╖ ${name}\n`;
  }

  message += '════════ ××× ════════\n';
  message += '⚠️ ❬ بالكتم, بالطرد ❭\n';
  message += '════════ ××× ════════\n';

  // المحظورات
  const prohibitedItems = [
    ['🌐', 'links', 'الروابط'],
    ['🔄', 'forwarding', 'التوجيه'],
    ['🍿', 'popcorn', 'الفشار'],
    ['⚜️', 'bots', 'البوتات'],
    ['⚠️', 'custom', 'الممنوعه']
  ];

  for (const [emoji, _key, name] of prohibitedItems) {
    message += `${emoji}╖ ${name}\n`;
  }

  return message;
}

module.exports = {
  isGroup,
  sendPrivateChatError,
  sendNotAdminError,
  isAdmin,
  getOrCreateGroupSettings,
  toggleLock,
  setLockMethod,
  toggleProhibited,
  lockItem,
  unlockItem,
  getLockMessage,
  formatSettingsMessage
};
