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

// ==================== TRANSLATIONS ====================

/**
 * Translation strings for warnings system
 */
const translations = {
  ar: {
    warning_added: 'تمت إضافة التحذير',
    user: 'المستخدم',
    reason: 'السبب',
    no_reason: 'لم يتم تحديد السبب',
    warnings_count: 'عدد التحذيرات',
    action_mute: 'كتم',
    action_mute_failed: 'فشل الكتم',
    action_kick: 'طرد',
    action_kick_failed: 'فشل الطرد',
    action_ban: 'حظر',
    action_ban_failed: 'فشل الحظر',
    auto_action_executed: 'تم تنفيذ الإجراء التلقائي',
    action_taken: 'الإجراء',
    warning_removed: 'تمت إزالة التحذير',
    remaining_warnings: 'التحذيرات المتبقية',
    no_warnings: 'لا توجد تحذيرات لهذا المستخدم',
    invalid_warning_index: 'مؤشر التحذير غير صالح',
    no_warnings_for_user: 'لا توجد تحذيرات لهذا المستخدم',
    warnings_list: 'قائمة التحذيرات',
    total_warnings: 'إجمالي التحذيرات',
    warned_by: 'حذّره',
    max_warnings: 'الحد الأقصى',
    auto_action: 'الإجراء التلقائي',
    warnings_cleared: 'تم مسح التحذيرات',
    removed_warnings: 'التحذيرات المحذوفة',
    no_warnings_to_clear: 'لا توجد تحذيرات لمسحها',
    invalid_max_warnings: 'الحد الأقصى يجب أن يكون بين 1 و 10',
    max_warnings_set: 'تم تعيين الحد الأقصى',
    new_max_warnings: 'الحد الأقصى الجديد',
    invalid_action: 'الإجراء غير صالح',
    valid_actions: 'الإجراءات المتاحة',
    auto_action_set: 'تم تعيين الإجراء التلقائي',
    selected_action: 'الإجراء المحدد',
    warn_usage: 'Usage: /تحذير @user السبب',
    invalid_user: 'معرف المستخدم غير صالح',
    remove_warning_usage: 'Usage: /رفع_تحذير @user',
    warnings_usage: 'Usage: /تحذيرات @user',
    clear_warnings_usage: 'Usage: /مسح_التحذيرات @user',
    max_warnings_usage: 'Usage: /حد_التحذيرات 3',
    auto_action_usage: 'Usage: /اجراء_تلقائي kick',
    invalid_number: 'رقم غير صالح',
    unknown_command: 'أمر غير معروف'
  },
  en: {
    warning_added: 'Warning Added',
    user: 'User',
    reason: 'Reason',
    no_reason: 'No reason provided',
    warnings_count: 'Warnings Count',
    action_mute: 'Mute',
    action_mute_failed: 'Mute Failed',
    action_kick: 'Kick',
    action_kick_failed: 'Kick Failed',
    action_ban: 'Ban',
    action_ban_failed: 'Ban Failed',
    auto_action_executed: 'Auto Action Executed',
    action_taken: 'Action',
    warning_removed: 'Warning Removed',
    remaining_warnings: 'Remaining Warnings',
    no_warnings: 'No warnings for this user',
    invalid_warning_index: 'Invalid warning index',
    no_warnings_for_user: 'No warnings for this user',
    warnings_list: 'Warnings List',
    total_warnings: 'Total Warnings',
    warned_by: 'Warned by',
    max_warnings: 'Max Warnings',
    auto_action: 'Auto Action',
    warnings_cleared: 'Warnings Cleared',
    removed_warnings: 'Removed Warnings',
    no_warnings_to_clear: 'No warnings to clear',
    invalid_max_warnings: 'Max warnings must be between 1 and 10',
    max_warnings_set: 'Max Warnings Set',
    new_max_warnings: 'New Max Warnings',
    invalid_action: 'Invalid action',
    valid_actions: 'Valid actions',
    auto_action_set: 'Auto Action Set',
    selected_action: 'Selected Action',
    warn_usage: 'Usage: /warn @user reason',
    invalid_user: 'Invalid user ID',
    remove_warning_usage: 'Usage: /removewarning @user',
    warnings_usage: 'Usage: /warnings @user',
    clear_warnings_usage: 'Usage: /clearwarnings @user',
    max_warnings_usage: 'Usage: /maxwarnings 3',
    auto_action_usage: 'Usage: /autoaction kick',
    invalid_number: 'Invalid number',
    unknown_command: 'Unknown command'
  }
};

/**
 * Get group language (defaults to Arabic)
 */
async function getGroupLanguage(groupId) {
  // Try to get from database, default to Arabic
  try {
    const Group = require('../database/models/Group');
    const group = await Group.findOne({ groupId });
    if (group && group.language) {
      return group.language;
    }
  } catch (e) {
    // Ignore errors
  }
  return 'ar';
}

/**
 * Translate a key to the group's language
 */
function t(key, lang = 'ar') {
  const langTranslations = translations[lang] || translations.ar;
  return langTranslations[key] || translations.ar[key] || key;
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
  formatSettingsMessage,
  getGroupLanguage,
  t
};
