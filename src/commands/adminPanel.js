/**
 * لوحة تحكم الأدمن
 * Admin Panel Commands
 */
const GroupProtection = require('../database/models/GroupProtection');
const { getPermissionsMessage, checkPermission: _checkPermission, PERMISSIONS_NAMES: _PERMISSIONS_NAMES } = require('./permissions');
const { Markup } = require('telegraf');

/**
 * لوحة تحكم الأدمن الرئيسية
 */
async function adminPanelMain(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });
    const groupTitle = group?.groupTitle || ctx.chat.title || 'المجموعة';

    const message = '*🎛️ لوحة تحكم الأدمن*\n\n';
    `المجموعة: ${groupTitle}\n`;
    'اختر القسم الذي تريد إدارته:';

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🛡️ الحماية', 'admin_protection'),
        Markup.button.callback('📜 القواعد', 'admin_rules')
      ],
      [
        Markup.button.callback('👋 الترحيب', 'admin_welcome'),
        Markup.button.callback('🔐 الأذونات', 'admin_permissions')
      ],
      [
        Markup.button.callback('⚠️ التحذيرات', 'admin_warnings'),
        Markup.button.callback('📊 الإحصائيات', 'admin_stats')
      ],
      [
        Markup.button.callback('⚙️ الإعدادات الشاملة', 'admin_settings')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing admin panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض لوحة التحكم');
  }
}

/**
 * لوحة إعدادات الحماية
 */
async function adminProtectionPanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });
    const locks = group?.locks || {};
    const prohibited = group?.prohibited || {};

    let message = '*🛡️ إعدادات الحماية*\n\n';
    message += '*─ الحماية الأساسية ─*\n';
    message += `${locks.chat ? '🔒' : '🔓'} قفل الدردشة\n`;
    message += `${locks.photos ? '🔒' : '🔓'} قفل الصور\n`;
    message += `${locks.usernames ? '🔒' : '🔓'} قفل أسماء المستخدمين\n`;
    message += `${locks.links ? '🔒' : '🔓'} قفل الروابط\n`;
    message += `${locks.deleteLink ? '🔒' : '🔓'} حذف الروابط\n`;
    message += `${locks.games ? '🔒' : '🔓'} قفل الألعاب\n\n`;

    message += '*─ الحماية المتقدمة ─*\n';
    message += `${prohibited.links ? '✅' : '❌'} منع الروابط\n`;
    message += `${prohibited.forwarding ? '✅' : '❌'} منع التوجيه\n`;
    message += `${prohibited.bots ? '✅' : '❌'} منع البوتات\n`;
    message += `${prohibited.popcorn ? '✅' : '❌'} منع الميديا\n\n`;

    message += '*─ إعدادات إضافية ─*\n';
    message += `⚠️ الحد الأقصى للتحذيرات: ${group?.maxWarnings || 3}\n`;
    message += `🤖 الإجراء التلقائي: ${group?.autoAction || 'kick'}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔒 قفل/فتح الدردشة', 'lock_chat'),
        Markup.button.callback('🖼️ قفل/فتح الصور', 'lock_photos')
      ],
      [
        Markup.button.callback('🔗 قفل/فتح الروابط', 'lock_links'),
        Markup.button.callback('🎮 قفل/فتح الألعاب', 'lock_games')
      ],
      [
        Markup.button.callback('📊 إعدادات السبام', 'admin_antiflood'),
        Markup.button.callback('👤 حماية الحسابات الوهمية', 'admin_fakecheck')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing protection panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض إعدادات الحماية');
  }
}

/**
 * لوحة القواعد
 */
async function adminRulesPanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });
    const rules = group?.rules || '';
    const requireAccept = group?.requireAcceptRules || false;

    let message = '*📜 إدارة القواعد*\n\n';

    if (rules) {
      message += `*القواعد الحالية:*\n${rules}\n\n`;
    } else {
      message += 'لا توجد قواعد محددة حالياً.\n\n';
    }

    message += '*─ الخيارات ─*\n';
    message += `${requireAccept ? '✅' : '❌'} طلب قبول القواعد عند الانضمام`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✏️ تعيين القواعد', 'rules_set'),
        Markup.button.callback('🗑️ مسح القواعد', 'rules_clear')
      ],
      [
        Markup.button.callback(`📋 ${requireAccept ? 'إلغاء' : 'تفعيل'} طلب القبول`, 'rules_toggle_accept')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing rules panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض إعدادات القواعد');
  }
}

/**
 * لوحة الترحيب والوداع
 */
async function adminWelcomePanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });
    const welcome = group?.welcome || {};
    const farewell = group?.farewell || {};

    let message = '*👋 إعدادات الترحيب والوداع*\n\n';

    message += '*─ الترحيب ─*\n';
    message += `الحالة: ${welcome.enabled ? '✅ مفعل' : '❌ معطل'}\n`;
    if (welcome.message) {
      message += `الرسالة: ${welcome.message.substring(0, 50)}...\n`;
    }
    message += `إظهار معلومات الانضمام: ${welcome.showJoinInfo ? '✅' : '❌'}\n\n`;

    message += '*─ الوداع ─*\n';
    message += `الحالة: ${farewell.enabled ? '✅ مفعل' : '❌ معطل'}\n`;
    if (farewell.message) {
      message += `الرسالة: ${farewell.message.substring(0, 50)}...`;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ تفعيل الترحيب', 'welcome_enable'),
        Markup.button.callback('❌ إلغاء الترحيب', 'welcome_disable')
      ],
      [
        Markup.button.callback('✏️ رسالة الترحيب', 'welcome_message'),
        Markup.button.callback('👋 رسالة الوداع', 'farewell_message')
      ],
      [
        Markup.button.callback('✅ تفعيل الوداع', 'farewell_enable'),
        Markup.button.callback('❌ إلغاء الوداع', 'farewell_disable')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing welcome panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض إعدادات الترحيب');
  }
}

/**
 * لوحة الأذونات
 */
async function adminPermissionsPanel(ctx) {
  try {
    const message = await getPermissionsMessage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ تشغيل الكل', 'perm_enable_all'),
        Markup.button.callback('❌ إيقاف الكل', 'perm_disable_all')
      ],
      [
        Markup.button.callback('🔄 إعادة تعيين', 'perm_reset')
      ],
      [
        Markup.button.callback('📥 تحديث من التلجرام', 'perm_update_tg')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing permissions panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض الأذونات');
  }
}

/**
 * لوحة التحذيرات
 */
async function adminWarningsPanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });
    const warnings = group?.warnings || [];
    const maxWarnings = group?.maxWarnings || 3;
    const autoAction = group?.autoAction || 'kick';

    let message = '*⚠️ إدارة التحذيرات*\n\n';
    message += '*─ الإعدادات ─*\n';
    message += `الحد الأقصى: ${maxWarnings} تحذيرات\n`;
    message += `الإجراء التلقائي: ${autoAction === 'kick' ? '🚪 طرد' : autoAction === 'ban' ? '🚫 حظر' : '🔇 كتم'}\n\n`;
    message += '*─ التحذيرات المسجلة ─*\n';

    if (warnings.length === 0) {
      message += 'لا توجد تحذيرات مسجلة.';
    } else {
      message += `إجمالي التحذيرات: ${warnings.length}\n`;
      message += 'لعرض قائمة مفصلة، استخدم الأمر: /قائمة_التحذيرات';
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📋 عرض التحذيرات', 'warnings_list'),
        Markup.button.callback('🗑️ مسح كل التحذيرات', 'warnings_clear')
      ],
      [
        Markup.button.callback('⚙️ تغيير الحد الأقصى', 'warnings_max_change'),
        Markup.button.callback('🔄 تغيير الإجراء التلقائي', 'warnings_action_change')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing warnings panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض إعدادات التحذيرات');
  }
}

/**
 * لوحة الإحصائيات
 */
async function adminStatsPanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });

    let message = '*📊 إحصائيات المجموعة*\n\n';

    message += '*─ معلومات عامة ─*\n';
    message += `المجموعة: ${group?.groupTitle || ctx.chat.title || 'غير معروف'}\n`;
    message += `معرف المجموعة: \`${groupId}\`\n`;
    message += `تاريخ الإنشاء: ${group?.createdAt ? new Date(group.createdAt).toLocaleDateString('ar') : 'غير معروف'}\n\n`;

    message += '*─ إعدادات الأمان ─*\n';
    message += `عدد المشرفين: ${group?.admins?.length || 0}\n`;
    message += `التحذيرات: ${group?.warnings?.length || 0}\n`;
    message += `الكلمات المفتاحية: ${group?.keywordAlerts?.length || 0}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📈 إحصائيات مفصلة', 'stats_detailed'),
        Markup.button.callback('👥 قائمة الأعضاء', 'stats_members')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing stats panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض الإحصائيات');
  }
}

/**
 * لوحة الإعدادات الشاملة
 */
async function adminSettingsPanel(ctx) {
  const groupId = ctx.chat.id;

  try {
    const group = await GroupProtection.findOne({ groupId });

    let message = '*⚙️ الإعدادات الشاملة للمجموعة*\n\n';

    message += '*─ إعدادات الحماية ─*\n';
    message += `Anti-Flood: ${group?.settings?.antiFlood ? '✅' : '❌'}\n`;
    message += `حد السبام: ${group?.settings?.floodLimit || 5}\n\n`;

    message += '*─ إعدادات القفل ─*\n';
    message += `طريقة المنع: ${group?.locks?.lockMethod || 'mute'}\n`;
    message += `قفل المغادرة: ${group?.locks?.kickMe ? '✅' : '❌'}\n`;
    message += `إظهار من أضاف: ${group?.locks?.whoAdded ? '✅' : '❌'}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🛡️ إعدادات الحماية', 'admin_protection'),
        Markup.button.callback('📜 إعدادات القواعد', 'admin_rules')
      ],
      [
        Markup.button.callback('🔐 إعدادات الأذونات', 'admin_permissions'),
        Markup.button.callback('⚠️ إعدادات التحذيرات', 'admin_warnings')
      ],
      [
        Markup.button.callback('🔄 تحديث البيانات', 'settings_refresh'),
        Markup.button.callback('🗑️ حذف جميع البيانات', 'settings_delete_all')
      ],
      [
        Markup.button.callback('🔙 رجوع', 'admin_back_main')
      ]
    ]);

    await ctx.replyWithMarkdown(message, keyboard);
  } catch (error) {
    console.error('Error showing settings panel:', error);
    await ctx.reply('حدث خطأ أثناء عرض الإعدادات');
  }
}

/**
 * لوحة تحكم الأدمن (اختصار)
 */
async function لوحةالتحكم(ctx) {
  await adminPanelMain(ctx);
}

/**
 * إعدادات المجموعة
 */
async function اعداداتالمجموعة(ctx) {
  await adminSettingsPanel(ctx);
}

/**
 * معالجة الأزرار
 */
async function handleAdminCallback(ctx) {
  const callbackData = ctx.callbackQuery.data;

  try {
    await ctx.answerCbQuery();

    switch (callbackData) {
      case 'admin_back_main':
        await adminPanelMain(ctx);
        break;
      case 'admin_protection':
        await adminProtectionPanel(ctx);
        break;
      case 'admin_rules':
        await adminRulesPanel(ctx);
        break;
      case 'admin_welcome':
        await adminWelcomePanel(ctx);
        break;
      case 'admin_permissions':
        await adminPermissionsPanel(ctx);
        break;
      case 'admin_warnings':
        await adminWarningsPanel(ctx);
        break;
      case 'admin_stats':
        await adminStatsPanel(ctx);
        break;
      case 'admin_settings':
        await adminSettingsPanel(ctx);
        break;
      default:
        await ctx.answerCbQuery('الخيار غير متوفر');
    }
  } catch (error) {
    console.error('Error handling admin callback:', error);
    await ctx.answerCbQuery('حدث خطأ');
  }
}

module.exports = {
  adminPanelMain,
  adminProtectionPanel,
  adminRulesPanel,
  adminWelcomePanel,
  adminPermissionsPanel,
  adminWarningsPanel,
  adminStatsPanel,
  adminSettingsPanel,
  لوحةالتحكم,
  اعداداتالمجموعة,
  handleAdminCallback
};

