const ScheduledMessage = require('../database/models/ScheduledMessage');

/**
 * جدولة رسالة في الجروب
 * @param {Object} ctx - سياق التلغرام
 * @param {String} time - الوقت بتنسيق HH:MM
 * @param {String} message - نص الرسالة
 * @param {String} repeatType - نوع التكرار (once, daily, weekly, monthly)
 */
async function scheduleMessage(ctx, time, message, repeatType = 'once') {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // التحقق من صحة الوقت
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      await ctx.reply('❌ تنسيق الوقت غير صحيح. استخدم تنسيق HH:MM (مثال: 14:30)');
      return null;
    }

    // حساب وقت الجدولة
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    // إذا كان الوقت المحدد قد مضى، اجعله للغد
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // إنشاء الرسالة المُجدولة
    const scheduledMsg = new ScheduledMessage({
      groupId: chatId,
      message: message,
      scheduledTime: scheduledTime,
      repeatType: repeatType,
      isActive: true,
      createdBy: userId
    });

    await scheduledMsg.save();

    // رسالة التأكيد
    const repeatText = {
      'once': 'لمرة واحدة',
      'daily': 'يومياً',
      'weekly': 'أسبوعياً',
      'monthly': 'شهرياً'
    };

    const timeStr = scheduledTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = scheduledTime.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });

    await ctx.reply(
      '✅ تم جدولة الرسالة بنجاح!\n\n' +
      `⏰ الوقت: ${timeStr}\n` +
      `📅 التاريخ: ${dateStr}\n` +
      `🔄 التكرار: ${repeatText[repeatType]}\n` +
      `💬 الرسالة: ${message}\n\n` +
      `🆔 رقم الرسالة: ${scheduledMsg._id}`
    );

    return scheduledMsg;
  } catch (error) {
    console.error('Error in scheduleMessage:', error);
    await ctx.reply('❌ حدث خطأ أثناء جدولة الرسالة');
    return null;
  }
}

/**
 * عرض الرسائل المُجدولة للجروب
 * @param {Object} ctx - سياق التلغرام
 */
async function listScheduledMessages(ctx) {
  try {
    const chatId = ctx.chat.id;

    const messages = await ScheduledMessage.find({
      groupId: chatId,
      isActive: true
    }).sort({ scheduledTime: 1 });

    if (messages.length === 0) {
      await ctx.reply('📭 لا توجد رسائل مُجدولة في هذا الجروب');
      return [];
    }

    let response = `📋 الرسائل المُجدولة (${messages.length}):\n\n`;

    messages.forEach((msg, index) => {
      const scheduledTime = new Date(msg.scheduledTime);
      const timeStr = scheduledTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = scheduledTime.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });

      const repeatEmoji = {
        'once': '📝',
        'daily': '📅',
        'weekly': '📆',
        'monthly': '🗓️'
      };

      response += `${index + 1}. ${repeatEmoji[msg.repeatType]} ${timeStr} - ${dateStr}\n`;
      response += `   💬 ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}\n`;
      response += `   🆔 ${msg._id}\n\n`;
    });

    response += '\n💡 استخدم /حذف_مجدول [الرقم] لحذف رسالة';

    await ctx.reply(response);
    return messages;
  } catch (error) {
    console.error('Error in listScheduledMessages:', error);
    await ctx.reply('❌ حدث خطأ أثناء جلب الرسائل المُجدولة');
    return [];
  }
}

/**
 * حذف رسالة مُجدولة
 * @param {Object} ctx - سياق التلغرام
 * @param {String} messageId - معرف الرسالة
 */
async function deleteScheduledMessage(ctx, messageId) {
  try {
    const chatId = ctx.chat.id;

    // محاولة حذف بواسطة المعرف
    let msg = await ScheduledMessage.findOne({
      _id: messageId,
      groupId: chatId
    });

    // إذا لم يُعثر، جرب حذف بواسطة الرقم التسلسلي
    if (!msg) {
      const messages = await ScheduledMessage.find({
        groupId: chatId,
        isActive: true
      }).sort({ scheduledTime: 1 });

      const index = parseInt(messageId) - 1;
      if (index >= 0 && index < messages.length) {
        msg = messages[index];
      }
    }

    if (!msg) {
      await ctx.reply('❌ الرسالة المُجدولة غير موجودة');
      return false;
    }

    await ScheduledMessage.deleteOne({ _id: msg._id });

    await ctx.reply(`✅ تم حذف الرسالة المُجدولة بنجاح!\n\n🗑️ الرسالة: ${msg.message}`);
    return true;
  } catch (error) {
    console.error('Error in deleteScheduledMessage:', error);
    await ctx.reply('❌ حدث خطأ أثناء حذف الرسالة');
    return false;
  }
}

/**
 * إلغاء كل الرسائل المُجدولة للجروب
 * @param {Object} ctx - سياق التلغرام
 */
async function cancelAllScheduled(ctx) {
  try {
    const chatId = ctx.chat.id;

    const result = await ScheduledMessage.deleteMany({
      groupId: chatId,
      isActive: true
    });

    await ctx.reply(`✅ تم إلغاء ${result.deletedCount} رسالة مُجدولة`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error in cancelAllScheduled:', error);
    await ctx.reply('❌ حدث خطأ أثناء إلغاء الرسائل');
    return 0;
  }
}

/**
 * معالجة أمر الجدولة
 */
async function handleScheduleCommand(ctx, match, repeatType = 'once') {
  try {
    // استخراج الوقت والرسالة من النص
    const parts = match.trim().split(' ');
    if (parts.length < 2) {
      const usage = repeatType === 'once'
        ? 'ℹ️ الاستخدام: /جدولة [الوقت] [الرسالة]\nمثال: /جدولة 14:30 هل من متوضئين'
        : `ℹ️ الاستخدام: /جدولة_${repeatType === 'daily' ? 'يومي' : repeatType === 'weekly' ? 'أسبوعي' : 'شهري'} [الوقت] [الرسالة]\nمثال: /جدولة_${repeatType === 'daily' ? 'يومي' : repeatType === 'weekly' ? 'أسبوعي' : 'شهري'} 14:30 هل من متوضئين`;
      await ctx.reply(usage);
      return;
    }

    const time = parts[0];
    const message = parts.slice(1).join(' ');

    if (!message.trim()) {
      await ctx.reply('❌ يرجى إدخال نص الرسالة');
      return;
    }

    await scheduleMessage(ctx, time, message, repeatType);
  } catch (error) {
    console.error('Error in handleScheduleCommand:', error);
    await ctx.reply('❌ حدث خطأ أثناء معالجة الأمر');
  }
}

/**
 * معالج الرسائل المُجدولة (يُستدعى كل دقيقة)
 */
async function processScheduledMessages(bot) {
  try {
    const now = new Date();

    // البحث عن الرسائل النشطة التي حان وقت إرسالها
    const messages = await ScheduledMessage.find({
      isActive: true,
      scheduledTime: { $lte: now }
    });

    for (const msg of messages) {
      try {
        // إرسال الرسالة للجروب
        await bot.sendMessage(msg.groupId, msg.message);

        // معالجة التكرار
        if (msg.repeatType === 'once') {
          // حذف الرسالة إذا كانت لمرة واحدة
          await ScheduledMessage.deleteOne({ _id: msg._id });
        } else {
          // حساب وقت التكرار التالي
          const nextTime = calculateNextScheduledTime(msg.scheduledTime, msg.repeatType);
          msg.scheduledTime = nextTime;
          await msg.save();
        }

        console.log(`📤 Sent scheduled message to group ${msg.groupId}`);
      } catch (error) {
        console.error(`Error sending scheduled message ${msg._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processScheduledMessages:', error);
  }
}

/**
 * حساب وقت الجدولة التالي
 */
function calculateNextScheduledTime(currentTime, repeatType) {
  const next = new Date(currentTime);

  switch (repeatType) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }

  return next;
}

module.exports = {
  scheduleMessage,
  listScheduledMessages,
  deleteScheduledMessage,
  cancelAllScheduled,
  handleScheduleCommand,
  processScheduledMessages
};
