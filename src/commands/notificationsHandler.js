/**
 * Notifications Handler
 * معالج إعدادات الإشعارات
 */

const Markup = require('telegraf/markup');
const User = require('../database/models/User');

class NotificationsHandler {
  /**
   * عرض قائمة الإعدادات
   */
  static async handleNotificationsMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.reply('❌ لم يتم العثور على حسابك!');
        return;
      }

      const notifications = user.notifications || {};
      const keyboard = this.getNotificationsKeyboard(notifications);

      const statusText = this.getNotificationStatusText(notifications);

      await ctx.reply(
        `🔔 <b>إعدادات الإشعارات</b>\n\n${statusText}`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      );
    } catch (error) {
      console.error('Error in handleNotificationsMenu:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  /**
   * إنشاء لوحة مفاتيح الإعدادات
   */
  static getNotificationsKeyboard(notifications) {
    const enabled = notifications.enabled !== false;
    const adhkar = notifications.adhkarReminder === true;
    const prayer = notifications.prayerReminder === true;
    const events = notifications.eventReminder === true;
    const motivation = notifications.motivational === true;
    const games = notifications.gameUpdates === true;
    const rewards = notifications.rewardUpdates === true;
    const auction = notifications.auctionUpdates === true;
    const summary = notifications.dailySummary === true;

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `🔔 الإشعارات العامة: ${enabled ? '✅' : '❌'}`,
          'notify:toggle:main'
        )
      ],
      [
        Markup.button.callback(
          `📿 أذكار الصباح والمساء: ${adhkar ? '✅' : '❌'}`,
          'notify:toggle:adhkar'
        )
      ],
      [
        Markup.button.callback(
          `🕌 أوقات الصلاة: ${prayer ? '✅' : '❌'}`,
          'notify:toggle:prayer'
        )
      ],
      [
        Markup.button.callback(
          `📖 ختمة القرآن: ${events ? '✅' : '❌'}`,
          'notify:toggle:events'
        )
      ],
      [
        Markup.button.callback(
          `💪 الرسائل التحفيزية: ${motivation ? '✅' : '❌'}`,
          'notify:toggle:motivational'
        )
      ],
      [
        Markup.button.callback(
          `🎮 تحديثات الألعاب: ${games ? '✅' : '❌'}`,
          'notify:toggle:games'
        )
      ],
      [
        Markup.button.callback(
          `🎁 المكافآت: ${rewards ? '✅' : '❌'}`,
          'notify:toggle:rewards'
        )
      ],
      [
        Markup.button.callback(
          `🏷️ المزادات: ${auction ? '✅' : '❌'}`,
          'notify:toggle:auction'
        )
      ],
      [
        Markup.button.callback(
          `📊 الملخص اليومي: ${summary ? '✅' : '❌'}`,
          'notify:toggle:summary'
        )
      ],
      [
        Markup.button.callback('📜 سجل الإشعارات', 'notify:logs'),
        Markup.button.callback('❌ حذف السجل', 'notify:clear')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:settings')
      ]
    ]);
  }

  /**
   * الحصول على نص حالة الإشعارات
   */
  static getNotificationStatusText(notifications) {
    const enabled = notifications.enabled !== false;
    const text = enabled
      ? '✅ <b>الإشعارات مفعلة</b>\n\nاختر ما تريد تفعيله أو إلغاؤه:'
      : '❌ <b>الإشعارات معطلة</b>\n\nفعّل الإشعارات أولاً!';

    return text;
  }

  /**
   * تبديل إشعار معين
   */
  static async handleToggleNotification(ctx, notificationType) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على حسابك');
        return;
      }

      // Map notification types
      const typeMap = {
        main: 'enabled',
        adhkar: 'adhkarReminder',
        prayer: 'prayerReminder',
        events: 'eventReminder',
        motivational: 'motivational',
        games: 'gameUpdates',
        rewards: 'rewardUpdates',
        auction: 'auctionUpdates',
        summary: 'dailySummary'
      };

      const dbField = typeMap[notificationType];
      if (!dbField) {
        await ctx.answerCbQuery('❌ نوع الإشعار غير صحيح');
        return;
      }

      // Toggle the notification setting
      const currentValue = user.notifications?.[dbField] || false;
      const newValue = !currentValue;

      // If disabling main notifications, disable all
      if (dbField === 'enabled' && !newValue) {
        await User.findOneAndUpdate(
          { userId },
          { $set: { 'notifications.enabled': false } }
        );
        await ctx.answerCbQuery('❌ تم تعطيل جميع الإشعارات');
      } else {
        // Update the specific notification setting
        await User.findOneAndUpdate(
          { userId },
          { $set: { [`notifications.${dbField}`]: newValue } }
        );
        await ctx.answerCbQuery(newValue ? '✅ تم التفعيل' : '❌ تم التعطيل');
      }

      // Refresh the keyboard
      const updatedUser = await User.findOne({ userId });
      const keyboard = this.getNotificationsKeyboard(updatedUser.notifications);

      await ctx.editMessageReplyMarkup(keyboard.reply_markup, {
        chat_id: ctx.chat.id,
        message_id: ctx.message.message_id
      });
    } catch (error) {
      console.error('Error in handleToggleNotification:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض سجل الإشعارات
   */
  static async handleNotificationLogs(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user || !user.notificationsLog || user.notificationsLog.length === 0) {
        await ctx.reply('📭 لا يوجد سجل إشعارات');
        return;
      }

      const logs = user.notificationsLog
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      let message = '📜 <b>سجل الإشعارات</b>\n\n';

      logs.forEach((log, index) => {
        const date = new Date(log.timestamp).toLocaleString('ar-SA');
        const status = log.read ? '✅' : '🔔';
        message += `${status} <b>${index + 1}.</b> ${log.message}\n📅 ${date}\n\n`;
      });

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in handleNotificationLogs:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  /**
   * حذف سجل الإشعارات
   */
  static async handleClearLogs(ctx) {
    try {
      const userId = ctx.from.id;

      await User.findOneAndUpdate(
        { userId },
        { $set: { notificationsLog: [] } }
      );

      await ctx.answerCbQuery('✅ تم حذف السجل');
      await this.handleNotificationsMenu(ctx);
    } catch (error) {
      console.error('Error in handleClearLogs:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * إرسال إشعار تجريبي
   */
  static async sendTestNotification(ctx) {
    try {
      const message = '🧪 <b>إشعار تجريبي</b>\n\nتم استلام الإشعار بنجاح! ✅';
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in sendTestNotification:', error);
    }
  }
}

module.exports = NotificationsHandler;
