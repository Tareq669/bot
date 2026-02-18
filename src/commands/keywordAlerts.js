/**
 * نظام تتبع الكلمات المفتاحية (Keyword Alerts)
 * Keyword Alerts System
 */
const GroupProtection = require('../database/models/GroupProtection');
const { getGroupLanguage, getGroupAdmins } = require('../utils/groupHelper');

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
 * إضافة كلمة مفتاحية للمراقبة
 */
async function addKeyword(ctx, keyword, action = 'notify') {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  await getGroupLanguage(groupId);
  const userId = ctx.from?.id;

  // التحقق من صلاحية المستخدم
  const admins = await getGroupAdmins(ctx);
  const isAdmin = admins.some(a => a.user.id === userId);
  if (!isAdmin) {
    return ctx.reply('❌ هذا الأمر للأدمنز فقط');
  }

  const group = await getGroupProtection(groupId);
  const normalizedKeyword = keyword.toLowerCase().trim();

  // التحقق من وجود الكلمة مسبقاً
  const existingKeyword = group.keywordAlerts.find(
    k => k.keyword.toLowerCase() === normalizedKeyword
  );

  if (existingKeyword) {
    // تحديث الإجراء existing
    existingKeyword.action = action;
    existingKeyword.addedBy = userId;
    existingKeyword.addedAt = new Date();
  } else {
    // إضافة كلمة جديدة
    group.keywordAlerts.push({
      keyword: normalizedKeyword,
      notifyAdmins: true,
      action: action,
      addedBy: userId,
      addedAt: new Date()
    });
  }

  await group.save();

  const actionText = {
    notify: '🔔 تنبيه فقط',
    delete: '🗑️ حذف الرسالة',
    warn: '⚠️ تحذير'
  };

  const message = '✅ *تمت إضافة الكلمة المفتاحية*\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    `🔑 الكلمة: \`${keyword}\`\n` +
    `⚙️ الإجراء: ${actionText[action] || '🔔 تنبيه'}\n` +
    '━━━━━━━━━━━━━━━━━━';

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * حذف كلمة مفتاحية من المراقبة
 */
async function removeKeyword(ctx, keyword) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  await getGroupLanguage(groupId);
  const userId = ctx.from?.id;

  // التحقق من صلاحية المستخدم
  const admins = await getGroupAdmins(ctx);
  const isAdmin = admins.some(a => a.user.id === userId);
  if (!isAdmin) {
    return ctx.reply('❌ هذا الأمر للأدمنز فقط');
  }

  const group = await getGroupProtection(groupId);
  const normalizedKeyword = keyword.toLowerCase().trim();

  const initialLength = group.keywordAlerts.length;
  group.keywordAlerts = group.keywordAlerts.filter(
    k => k.keyword.toLowerCase() !== normalizedKeyword
  );

  if (group.keywordAlerts.length === initialLength) {
    return ctx.reply(`❌ الكلمة "${keyword}" غير موجودة في قائمة المراقبة`);
  }

  await group.save();

  const message = '✅ *تم حذف الكلمة المفتاحية*\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    `🔑 الكلمة: \`${keyword}\`\n` +
    '━━━━━━━━━━━━━━━━━━';

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * عرض قائمة الكلمات المفتاحية
 */
async function listKeywords(ctx) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  await getGroupLanguage(groupId);
  const group = await getGroupProtection(groupId);

  if (!group.keywordAlerts || group.keywordAlerts.length === 0) {
    return ctx.reply('📝 لا توجد كلمات مفتاحية للمراقبة\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      'أستخدم /تنبيه_إضافة لإضافة كلمات');
  }

  const actionText = {
    notify: '🔔',
    delete: '🗑️',
    warn: '⚠️'
  };

  let message = '📋 *قائمة الكلمات المفتاحية*\n' +
    '━━━━━━━━━━━━━━━━━━\n';

  group.keywordAlerts.forEach((keyword, index) => {
    const action = actionText[keyword.action] || '🔔';
    message += `${index + 1}. ${action} \`${keyword.keyword}\`\n`;
  });

  message += '━━━━━━━━━━━━━━━━━━\n';
  message += `📊 الإجمالي: ${group.keywordAlerts.length} كلمة\n`;
  message += `🔔 التنبيهات: ${group.notifyOnKeywords ? 'مفعّلة' : 'مُعطّلة'}`;

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * تفعيل/تعطيل التنبيهات
 */
async function toggleKeywordAlerts(ctx, enabled) {
  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.reply('❌ خطأ في معرف المجموعة');

  const userId = ctx.from?.id;

  // التحقق من صلاحية المستخدم
  const admins = await getGroupAdmins(ctx);
  const isAdmin = admins.some(a => a.user.id === userId);
  if (!isAdmin) {
    return ctx.reply('❌ هذا الأمر للأدمنز فقط');
  }

  const group = await getGroupProtection(groupId);
  group.notifyOnKeywords = enabled;
  await group.save();

  const status = enabled ? 'مفعّلة ✅' : 'مُعطّلة ❌';

  const message = `✅ *تم ${enabled ? 'تفعيل' : 'تعطيل'} التنبيهات*\n` +
    '━━━━━━━━━━━━━━━━━━\n' +
    `🔔 الحالة: ${status}\n` +
    '━━━━━━━━━━━━━━━━━━';

  try {
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply(message.replace(/[*_`]/g, ''));
  }

  return true;
}

/**
 * التحقق من الكلمات المفتاحية في الرسالة
 */
async function checkKeywords(ctx, messageText) {
  if (!messageText) return null;

  const groupId = ctx.chat?.id;
  if (!groupId) return null;

  const group = await getGroupProtection(groupId);

  // التحقق من تفعيل النظام
  if (!group.notifyOnKeywords) return null;

  // التحقق من وجود كلمات
  if (!group.keywordAlerts || group.keywordAlerts.length === 0) return null;

  const normalizedText = messageText.toLowerCase();

  for (const keyword of group.keywordAlerts) {
    if (normalizedText.includes(keyword.keyword.toLowerCase())) {
      return {
        keyword: keyword.keyword,
        action: keyword.action,
        notifyAdmins: keyword.notifyAdmins
      };
    }
  }

  return null;
}

/**
 * إرسال تنبيه للأدمنز
 */
async function notifyAdmins(ctx, keyword, messageText) {
  const groupId = ctx.chat?.id;
  if (!groupId) return;

  await getGroupProtection(groupId);
  const admins = await getGroupAdmins(ctx);

  const user = ctx.from;
  const userName = user?.first_name || 'غير معروف';
  const userUsername = user?.username ? `@${user.username}` : '';
  const userId = user?.id || 'غير معروف';

  const actionText = {
    notify: '🔔 تنبيه',
    delete: '🗑️ حذف',
    warn: '⚠️ تحذير'
  };

  const message = '🔑 *تنبيه كلمة مفتاحية*\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    `👤 المستخدم: ${userName} ${userUsername}\n` +
    `🆔 المعرف: \`${userId}\`\n` +
    `🔑 الكلمة المفتاحية: \`${keyword}\`\n` +
    `⚙️ الإجراء: ${actionText.notify}\n` +
    '━━━━━━━━━━━━━━━━━━\n' +
    `📝 الرسالة:\n${messageText.substring(0, 200)}`;

  try {
    // إرسال لكل أدمن
    for (const admin of admins) {
      try {
        await ctx.telegram.sendMessage(
          admin.user.id,
          message,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  } catch (e) {
    console.log('Error sending keyword alert:', e);
  }
}

/**
 * التعامل مع الرسالة حسب الإجراء
 */
async function handleKeywordAction(ctx, keywordData, messageText) {
  const { keyword, action } = keywordData;

  switch (action) {
    case 'delete':
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch (e) {
        console.log('Error deleting message:', e);
      }
      break;

    case 'warn':
      // استدعاء نظام التحذير
      try {
        const warnings = require('./warnings');
        const userId = ctx.from?.id;
        await warnings.warn(ctx, userId, `استخدام كلمة مفتاحية محظورة: ${keyword}`);
      } catch (e) {
        console.log('Error warning user:', e);
      }
      break;

    case 'notify':
    default:
      // فقط إشعار الأدمنز
      break;
  }

  // إرسال تنبيه للأدمنز
  await notifyAdmins(ctx, keyword, messageText);
}

module.exports = {
  addKeyword,
  removeKeyword,
  listKeywords,
  toggleKeywordAlerts,
  checkKeywords,
  notifyAdmins,
  handleKeywordAction
};
