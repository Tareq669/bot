/**
 * أوامر إدارة نظام الترحيب والوداع
 * Welcome and Farewell Management Commands
 */
const GroupProtection = require('../database/models/GroupProtection');

/**
 * تعيين رسالة الترحيب
 */
async function setWelcomeMessage(ctx, message) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.welcome = group.welcome || {};
    group.welcome.message = message;
    group.welcome.enabled = true;
    group.updatedAt = new Date();
    await group.save();

    await ctx.reply('✅ *تم تعيين رسالة الترحيب بنجاح*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

    // إرسال معاينة
    await ctx.reply(
      `📝 *معاينة رسالة الترحيب:*\n\n${  formatWelcomeMessage(ctx.from, message)}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error in setWelcomeMessage:', error);
    await ctx.reply('❌ *حدث خطأ*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * تعيين رسالة الوداع
 */
async function setFarewellMessage(ctx, message) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.farewell = group.farewell || {};
    group.farewell.message = message;
    group.farewell.enabled = true;
    group.updatedAt = new Date();
    await group.save();

    await ctx.reply('✅ *تم تعيين رسالة الوداع بنجاح*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

  } catch (error) {
    console.error('Error in setFarewellMessage:', error);
    await ctx.reply('❌ *حدث خطأ*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * تشغيل/إيقاف الترحيب
 */
async function toggleWelcome(ctx, enabled) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.welcome = group.welcome || {};
    group.welcome.enabled = enabled;
    group.updatedAt = new Date();
    await group.save();

    const status = enabled ? '✅ *تم تفعيل نظام الترحيب*' : '❌ *تم إيقاف نظام الترحيب*';
    await ctx.reply(status, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

  } catch (error) {
    console.error('Error in toggleWelcome:', error);
    await ctx.reply('❌ *حدث خطأ*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * تشغيل/إيقاف الوداع
 */
async function toggleFarewell(ctx, enabled) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.farewell = group.farewell || {};
    group.farewell.enabled = enabled;
    group.updatedAt = new Date();
    await group.save();

    const status = enabled ? '✅ *تم تفعيل نظام الوداع*' : '❌ *تم إيقاف نظام الوداع*';
    await ctx.reply(status, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

  } catch (error) {
    console.error('Error in toggleFarewell:', error);
    await ctx.reply('❌ *حدث خطأ*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * تنسيق رسالة الترحيب
 */
function formatWelcomeMessage(user, message) {
  const formatted = message
    .replace(/{name}/g, user.first_name)
    .replace(/{username}/g, user.username ? `@${  user.username}` : 'لا يوجد')
    .replace(/{id}/g, user.id.toString())
    .replace(/{title}/g, 'المجموعة');

  return formatted;
}

/**
 * تنسيق رسالة الوداع
 */
function formatFarewellMessage(user, message) {
  const formatted = message
    .replace(/{name}/g, user.first_name)
    .replace(/{username}/g, user.username ? `@${  user.username}` : 'لا يوجد')
    .replace(/{id}/g, user.id.toString());

  return formatted;
}

/**
 * إرسال رسالة الترحيب عند دخول عضو
 */
async function sendWelcomeMessage(ctx, newMember) {
  try {
    const groupId = ctx.chat.id;
    const group = await GroupProtection.findOne({ groupId });

    if (!group || !group.welcome || !group.welcome.enabled || !group.welcome.message) {
      return null;
    }

    const message = formatWelcomeMessage(newMember, group.welcome.message);

    // إضافة معلومات الانضمام إذا كانت مفعلة
    let fullMessage = message;
    if (group.welcome.showJoinInfo) {
      const memberCount = await ctx.getChatMemberCount();
      fullMessage = `${message  }\n\n👥 *عدد الأعضاء:* ${memberCount}`;
    }

    return {
      text: fullMessage,
      parse_mode: 'Markdown'
    };

  } catch (error) {
    console.error('Error in sendWelcomeMessage:', error);
    return null;
  }
}

/**
 * إرسال رسالة الوداع عند خروج عضو
 */
async function sendFarewellMessage(ctx, leftMember) {
  try {
    const groupId = ctx.chat.id;
    const group = await GroupProtection.findOne({ groupId });

    if (!group || !group.farewell || !group.farewell.enabled || !group.farewell.message) {
      return null;
    }

    const message = formatFarewellMessage(leftMember, group.farewell.message);

    return {
      text: message,
      parse_mode: 'Markdown'
    };

  } catch (error) {
    console.error('Error in sendFarewellMessage:', error);
    return null;
  }
}

/**
 * معالجة أوامر الترحيب والوداع
 */
async function handleWelcomeFarewellCommand(ctx) {
  const command = ctx.message.text.split(' ')[0];
  const args = ctx.message.text.replace(command, '').trim();

  // التحقق من أن الأمر في مجموعة
  if (!ctx.chat.type.includes('group')) {
    await ctx.reply('⚠️ *هذا الأمر يعمل فقط في المجموعات*', {
      parse_mode: 'Markdown'
    });
    return;
  }

  // التحقق من صلاحيات المستخدم
  const userId = ctx.from.id;
  const chatMember = await ctx.bot.getChatMember(ctx.chat.id, userId);
  const isAdmin = ['creator', 'administrator'].includes(chatMember.status);

  if (!isAdmin) {
    await ctx.reply('⚠️ *لا تملك صلاحية استخدام هذا الأمر*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
    return;
  }

  // معالجة الأوامر
  if (command === '/ترحيب' || command === `/ترحيب@${  ctx.botInfo.username}`) {
    if (!args) {
      // عرض الإعدادات الحالية
      const group = await GroupProtection.findOne({ groupId: ctx.chat.id });
      if (group && group.welcome) {
        const status = group.welcome.enabled ? 'مفعّل' : 'مُعطّل';
        const message = group.welcome.message || 'لم تُحدد رسالة';
        await ctx.reply(
          '📝 *إعدادات الترحيب:*\n\n' +
          `الحالة: ${status}\n` +
          `الرسالة: ${message}\n\n` +
          '_لتعيين رسالة جديدة: /ترحيب [الرسالة]_',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply('⚠️ *لم يتم إعداد نظام الترحيب بعد*\n\n_الاستخدام: /ترحيب [الرسالة]_', {
          parse_mode: 'Markdown'
        });
      }
      return;
    }
    await setWelcomeMessage(ctx, args);

  } else if (command === '/وداع' || command === `/وداع@${  ctx.botInfo.username}`) {
    if (!args) {
      const group = await GroupProtection.findOne({ groupId: ctx.chat.id });
      if (group && group.farewell) {
        const status = group.farewell.enabled ? 'مفعّل' : 'مُعطّل';
        const message = group.farewell.message || 'لم تُحدد رسالة';
        await ctx.reply(
          '📝 *إعدادات الوداع:*\n\n' +
          `الحالة: ${status}\n` +
          `الرسالة: ${message}\n\n` +
          '_لتعيين رسالة جديدة: /وداع [الرسالة]_',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply('⚠️ *لم يتم إعداد نظام الوداع بعد*\n\n_الاستخدام: /وداع [الرسالة]_', {
          parse_mode: 'Markdown'
        });
      }
      return;
    }
    await setFarewellMessage(ctx, args);

  } else if (command === '/ترحيب_تشغيل' || command === `/ترحيب_تشغيل@${  ctx.botInfo.username}`) {
    await toggleWelcome(ctx, true);

  } else if (command === '/ترحيب_إيقاف' || command === `/ترحيب_إيقاف@${  ctx.botInfo.username}`) {
    await toggleWelcome(ctx, false);

  } else if (command === '/وداع_تشغيل' || command === `/وداع_تشغيل@${  ctx.botInfo.username}`) {
    await toggleFarewell(ctx, true);

  } else if (command === '/وداع_إيقاف' || command === `/وداع_إيقاف@${  ctx.botInfo.username}`) {
    await toggleFarewell(ctx, false);
  }
}

/**
 * تحديث إعدادات الترحيب
 */
async function updateWelcomeSettings(ctx, settings) {
  try {
    const groupId = ctx.chat.id;
    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.welcome = { ...group.welcome, ...settings };
    group.updatedAt = new Date();
    await group.save();

    return true;
  } catch (error) {
    console.error('Error in updateWelcomeSettings:', error);
    return false;
  }
}

module.exports = {
  setWelcomeMessage,
  setFarewellMessage,
  toggleWelcome,
  toggleFarewell,
  formatWelcomeMessage,
  formatFarewellMessage,
  sendWelcomeMessage,
  sendFarewellMessage,
  handleWelcomeFarewellCommand,
  updateWelcomeSettings
};
