/**
 * أوامر إدارة قواعد المجموعة
 * Group Rules Management Commands
 */
const GroupProtection = require('../database/models/GroupProtection');

/**
 * تعيين القواعد للمجموعة
 */
async function setRules(ctx, rules) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.rules = rules;
    group.updatedAt = new Date();
    await group.save();

    await ctx.reply('✅ *تم تعيين القواعد بنجاح*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

    // عرض القواعد
    await showRules(ctx, group);

  } catch (error) {
    console.error('Error in setRules:', error);
    await ctx.reply('❌ *حدث خطأ أثناء تعيين القواعد*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * عرض القواعد الحالية
 */
async function getRules(ctx) {
  try {
    const groupId = ctx.chat.id;
    const group = await GroupProtection.findOne({ groupId });

    if (!group || !group.rules) {
      await ctx.reply('📋 *لا توجد قواعد محددة لهذه المجموعة*', {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    await showRules(ctx, group);

  } catch (error) {
    console.error('Error in getRules:', error);
    await ctx.reply('❌ *حدث خطأ أثناء استرجاع القواعد*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * عرض القواعد بتنسيق جميل
 */
async function showRules(ctx, group) {
  const rulesText = `📋 *قواعد المجموعة*\n\n${group.rules}\n\n`;
  const statusText = group.requireAcceptRules
    ? '⚠️ *يجب قبول القواعد للانضمام*'
    : 'ℹ️ *القواعد اختيارية*';

  await ctx.reply(rulesText + statusText, {
    parse_mode: 'Markdown',
    reply_to_message_id: ctx.message?.message_id
  });
}

/**
 * حذف القواعد
 */
async function clearRules(ctx) {
  try {
    const groupId = ctx.chat.id;

    const group = await GroupProtection.findOne({ groupId });
    if (!group) {
      await ctx.reply('❌ *المجموعة غير موجودة في قاعدة البيانات*', {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    group.rules = '';
    group.requireAcceptRules = false;
    group.updatedAt = new Date();
    await group.save();

    await ctx.reply('✅ *تم حذف القواعد بنجاح*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

  } catch (error) {
    console.error('Error in clearRules:', error);
    await ctx.reply('❌ *حدث خطأ أثناء حذف القواعد*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * تشغيل/إيقاف طلب قبول القواعد
 */
async function toggleRequireAccept(ctx, required) {
  try {
    const groupId = ctx.chat.id;

    let group = await GroupProtection.findOne({ groupId });
    if (!group) {
      group = new GroupProtection({ groupId });
    }

    group.requireAcceptRules = required;
    group.updatedAt = new Date();
    await group.save();

    const status = required ? '✅' : '❌';
    const text = required
      ? '*تم تفعيل طلب قبول القواعد*\n\nسيُطلب من الأعضاء الجدد قبول القواعد للانضمام للمجموعة'
      : '*تم إلغاء طلب قبول القواعد*\n\nلن يُطلب من الأعضاء الجدد قبول القواعد';

    await ctx.reply(`${status  } ${  text}`, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

  } catch (error) {
    console.error('Error in toggleRequireAccept:', error);
    await ctx.reply('❌ *حدث خطأ*', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });
  }
}

/**
 * معالجة أمر /قواعد
 */
async function handleRulesCommand(ctx) {
  const command = ctx.message.text.split(' ')[0];

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

  const args = ctx.message.text.replace(command, '').trim();

  if (command === '/قواعد' || command === `/قواعد@${  ctx.botInfo.username}`) {
    // عرض القواعد
    await getRules(ctx);
  } else if (command === '/تعيين_قواعد' || command === `/تعيين_قواعد@${  ctx.botInfo.username}`) {
    // تعيين القواعد
    if (!args) {
      await ctx.reply('⚠️ *الاستخدام الصحيح:*\n/تعيين_قواعد [القواعد]', {
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }
    await setRules(ctx, args);
  } else if (command === '/مسح_القواعد' || command === '/مسح_قواعد' || command === `/مسح_القواعد@${  ctx.botInfo.username}` || command === `/مسح_قواعد@${  ctx.botInfo.username}`) {
    // حذف القواعد
    await clearRules(ctx);
  } else if (command === '/طلب_قبول' || command === `/طلب_قبول@${  ctx.botInfo.username}`) {
    // تبديل طلب القبول
    const group = await GroupProtection.findOne({ groupId: ctx.chat.id });
    const newStatus = !(group && group.requireAcceptRules);
    await toggleRequireAccept(ctx, newStatus);
  }
}

/**
 * معالجة رد فعل المستخدم على القواعد
 */
async function handleRulesAcceptance(ctx) {
  try {
    const groupId = ctx.chat.id;
    const group = await GroupProtection.findOne({ groupId });

    if (!group || !group.requireAcceptRules || !group.rules) {
      return;
    }

    // التحقق من أن الرسالة هي طلب قبول القواعد
    const callbackData = ctx.callbackQuery?.data;
    if (callbackData === 'accept_rules') {
      await ctx.answerCallbackQuery('✅ *تم قبول القواعد*', { show_alert: true });
      await ctx.editMessageText(`✅ *تم قبول القواعد بنجاح*\n\n${  group.rules}`, {
        parse_mode: 'Markdown'
      });
    }

  } catch (error) {
    console.error('Error in handleRulesAcceptance:', error);
  }
}

/**
 * التحقق من قبول القواعد عند الدخول
 */
async function checkRulesOnJoin(ctx, user) {
  try {
    const groupId = ctx.chat.id;
    const group = await GroupProtection.findOne({ groupId });

    if (!group || !group.requireAcceptRules || !group.rules) {
      return null;
    }

    // إرسال رسالة طلب قبول القواعد
    const keyboard = {
      inline_keyboard: [[
        { text: '✅ *أقبل القواعد*', callback_data: 'accept_rules' }
      ]]
    };

    return {
      text: `📋 *مرحباً بك يا ${  user.first_name  }!*\n\n` +
            `للمشاركة في المجموعة، يجب عليك قبول القواعد:\n\n${
              group.rules  }\n\n` +
            '*اضغط على الزر أدناه لقبول القواعد*',
      keyboard,
      parse_mode: 'Markdown'
    };

  } catch (error) {
    console.error('Error in checkRulesOnJoin:', error);
    return null;
  }
}

module.exports = {
  setRules,
  getRules,
  clearRules,
  toggleRequireAccept,
  handleRulesCommand,
  handleRulesAcceptance,
  checkRulesOnJoin
};
