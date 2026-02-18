/**
 * إدارة الأذونات والصلاحيات
 * Permissions Management Commands
 */
const GroupProtection = require('../database/models/GroupProtection');

/**
 * قاموس أسماء الأذونات بالعربية
 */
const PERMISSIONS_NAMES = {
  // أذونات عامة
  canWarn: 'التحذير',
  canMute: 'الكتم',
  canKick: 'الطرد',
  canBan: 'الحظر',
  canDelete: 'الحذف',
  canPin: 'التثبيت',
  canChangeInfo: 'تغيير المعلومات',
  // أذونات الألعاب
  canPlayGames: 'اللعب',
  canUseCommands: 'استخدام الأوامر',
  canSendMedia: 'إرسال الوسائط',
  canSendPolls: 'إرسال الاستطلاعات',
  canSendInvites: 'إرسال الدعوات',
  // أذونات التفاعل
  canReact: 'التفاعل',
  canUseBot: 'استخدام البوت'
};

/**
 * الحصول على إعدادت الأذونات للمجموعة
 */
async function getPermissions(ctx, groupId) {
  try {
    let group = await GroupProtection.findOne({ groupId });

    if (!group) {
      group = new GroupProtection({ groupId });
      await group.save();
    }

    return group.permissions || {};
  } catch (error) {
    console.error('Error getting permissions:', error);
    return {};
  }
}

/**
 * تشغيل/إيقاف إذن محدد
 */
async function togglePermission(ctx, permission, enabled) {
  const groupId = ctx.chat.id;

  try {
    let group = await GroupProtection.findOne({ groupId });

    if (!group) {
      group = new GroupProtection({ groupId });
    }

    if (!group.permissions) {
      group.permissions = {};
    }

    // التحقق من وجود الإذن
    if (!(permission in group.permissions)) {
      return { success: false, message: `الإذن "${permission}" غير موجود` };
    }

    group.permissions[permission] = enabled;
    group.updatedAt = new Date();
    await group.save();

    const permName = PERMISSIONS_NAMES[permission] || permission;
    const status = enabled ? 'تم تشغيل' : 'تم إيقاف';

    return {
      success: true,
      message: `${status} إذن "${permName}" بنجاح`
    };
  } catch (error) {
    console.error('Error toggling permission:', error);
    return { success: false, message: 'حدث خطأ أثناء تحديث الإذن' };
  }
}

/**
 * إعادة تعيين كل الأذونات للقيم الافتراضية
 */
async function resetPermissions(ctx) {
  const groupId = ctx.chat.id;

  try {
    let group = await GroupProtection.findOne({ groupId });

    if (!group) {
      group = new GroupProtection({ groupId });
    }

    // إعادة تعيين الأذونات للقيم الافتراضية
    group.permissions = {
      // أذونات عامة
      canWarn: true,
      canMute: true,
      canKick: false,
      canBan: false,
      canDelete: true,
      canPin: false,
      canChangeInfo: false,
      // أذونات الألعاب
      canPlayGames: true,
      canUseCommands: true,
      canSendMedia: true,
      canSendPolls: true,
      canSendInvites: false,
      // أذونات التفاعل
      canReact: true,
      canUseBot: true
    };

    group.updatedAt = new Date();
    await group.save();

    return { success: true, message: 'تم إعادة تعيين كل الأذونات بنجاح' };
  } catch (error) {
    console.error('Error resetting permissions:', error);
    return { success: false, message: 'حدث خطأ أثناء إعادة تعيين الأذونات' };
  }
}

/**
 * عرض الأذونات الحالية
 */
async function getPermissionsMessage(ctx) {
  const groupId = ctx.chat.id;
  const permissions = await getPermissions(ctx, groupId);

  let message = '🔐 *الأذونات والصلاحيات الحالية:*\n\n';

  message += '*─ الأذونات العامة ─*\n';
  message += `${permissions.canWarn ? '✅' : '❌'} التحذير\n`;
  message += `${permissions.canMute ? '✅' : '❌'} الكتم\n`;
  message += `${permissions.canKick ? '✅' : '❌'} الطرد\n`;
  message += `${permissions.canBan ? '✅' : '❌'} الحظر\n`;
  message += `${permissions.canDelete ? '✅' : '❌'} الحذف\n`;
  message += `${permissions.canPin ? '✅' : '❌'} التثبيت\n`;
  message += `${permissions.canChangeInfo ? '✅' : '❌'} تغيير المعلومات\n\n`;

  message += '*─ أذونات الألعاب ─*\n';
  message += `${permissions.canPlayGames ? '✅' : '❌'} اللعب\n`;
  message += `${permissions.canUseCommands ? '✅' : '❌'} استخدام الأوامر\n`;
  message += `${permissions.canSendMedia ? '✅' : '❌'} إرسال الوسائط\n`;
  message += `${permissions.canSendPolls ? '✅' : '❌'} إرسال الاستطلاعات\n`;
  message += `${permissions.canSendInvites ? '✅' : '❌'} إرسال الدعوات\n\n`;

  message += '*─ أذونات التفاعل ─*\n';
  message += `${permissions.canReact ? '✅' : '❌'} التفاعل\n`;
  message += `${permissions.canUseBot ? '✅' : '❌'} استخدام البوت\n`;

  return message;
}

/**
 * تحديث الأذونات من إعدادات التلجرام
 */
async function updatePermissionsFromTelegram(ctx) {
  const groupId = ctx.chat.id;

  try {
    const chat = await ctx.telegram.getChat(groupId);
    const bot = await ctx.telegram.getMe();

    let group = await GroupProtection.findOne({ groupId });

    if (!group) {
      group = new GroupProtection({ groupId });
    }

    // تحديث معلومات المجموعة
    group.groupTitle = chat.title || '';

    // التحقق من صلاحيات البوت
    const botMember = await ctx.telegram.getChatMember(groupId, bot.id);
    const isAdmin = botMember.status === 'administrator';

    if (!isAdmin) {
      return {
        success: false,
        message: 'البوت ليس مشرفاً في المجموعة. يرجى ترقيته أولاً.'
      };
    }

    group.updatedAt = new Date();
    await group.save();

    return {
      success: true,
      message: 'تم تحديث الإذونات من إعدادات التلجرام بنجاح'
    };
  } catch (error) {
    console.error('Error updating permissions from Telegram:', error);
    return { success: false, message: 'حدث خطأ أثناء تحديث الإذونات' };
  }
}

/**
 * التحقق من إذن معين
 */
async function checkPermission(ctx, permission) {
  const groupId = ctx.chat.id;
  const permissions = await getPermissions(ctx, groupId);

  return permissions[permission] === true;
}

/**
 * أوامر الأذونات
 */
const permissionsCommands = {
  // عرض الأذونات
  async عرضالأذونات(ctx) {
    try {
      const message = await getPermissionsMessage(ctx);
      await ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Error showing permissions:', error);
      await ctx.reply('حدث خطأ أثناء عرض الأذونات');
    }
  },

  // عرض الأذونات (إنجليزي)
  async showPermissions(ctx) {
    try {
      const message = await getPermissionsMessage(ctx);
      await ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Error showing permissions:', error);
      await ctx.reply('Error showing permissions');
    }
  },

  // إعادة تعيين الأذونات
  async إعادةتعيينالأذونات(ctx) {
    try {
      const result = await resetPermissions(ctx);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error resetting permissions:', error);
      await ctx.reply('حدث خطأ أثناء إعادة تعيين الأذونات');
    }
  },

  // إعادة تعيين الأذونات (إنجليزي)
  async resetPermissionsCommand(ctx) {
    try {
      const result = await resetPermissions(ctx);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error resetting permissions:', error);
      await ctx.reply('Error resetting permissions');
    }
  },

  // تحديث الأذونات من التلجرام
  async تحديثالأذونات(ctx) {
    try {
      const result = await updatePermissionsFromTelegram(ctx);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error updating permissions:', error);
      await ctx.reply('حدث خطأ أثناء تحديث الأذونات');
    }
  },

  // تحديث الأذونات (إنجليزي)
  async updatePermissionsCommand(ctx) {
    try {
      const result = await updatePermissionsFromTelegram(ctx);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error updating permissions:', error);
      await ctx.reply('Error updating permissions');
    }
  },

  // تشغيل إذن محدد
  async تشغيل(ctx, permission) {
    try {
      if (!permission) {
        await ctx.reply('يرجى تحديد اسم الإذن');
        return;
      }

      const result = await togglePermission(ctx, permission, true);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error enabling permission:', error);
      await ctx.reply('حدث خطأ أثناء تشغيل الإذن');
    }
  },

  // إيقاف إذن محدد
  async إيقاف(ctx, permission) {
    try {
      if (!permission) {
        await ctx.reply('يرجى تحديد اسم الإذن');
        return;
      }

      const result = await togglePermission(ctx, permission, false);
      await ctx.reply(result.message);
    } catch (error) {
      console.error('Error disabling permission:', error);
      await ctx.reply('حدث خطأ أثناء إيقاف الإذن');
    }
  }
};

module.exports = {
  permissionsCommands,
  getPermissions,
  togglePermission,
  resetPermissions,
  getPermissionsMessage,
  updatePermissionsFromTelegram,
  checkPermission,
  PERMISSIONS_NAMES
};
