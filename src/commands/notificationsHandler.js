const { Markup } = require('telegraf');
const { User } = require('../database/models');

class NotificationsHandler {
  /**
   * عرض قائمة إعدادات الإشعارات
   */
  static async handleNotificationsMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      // تهيئة الإشعارات إذا لم تكن موجودة
      user.notifications = user.notifications || {
        enabled: true,
        adhkarReminder: false,
        prayerReminder: false,
        eventReminder: false,
        motivational: false,
        gameUpdates: false,
        rewardUpdates: false,
        auctionUpdates: false
      };

      const buttons = [];

      // زر تفعيل/تعطيل الإشعارات العامة
      const allEnabled = user.notifications.enabled;
      buttons.push([
        Markup.button.callback(
          allEnabled ? '🔕关闭 الإشعارات' : '🔔开启 الإشعارات',
          'notify:toggle:all'
        )
      ]);

      // أزرار الإشعارات المختلفة
      const notificationTypes = [
        { id: 'adhkar', name: '🕌 أذكار', field: 'adhkarReminder' },
        { id: 'prayer', name: '⏰ أوقات الصلاة', field: 'prayerReminder' },
        { id: 'events', name: '🔔 الأحداث', field: 'eventReminder' },
        { id: 'motivational', name: '💭 التحفيز', field: 'motivational' },
        { id: 'games', name: '🎮 الألعاب', field: 'gameUpdates' },
        { id: 'rewards', name: '💰 المكافآت', field: 'rewardUpdates' },
        { id: 'auction', name: '🏷️ المزاد', field: 'auctionUpdates' }
      ];

      for (const type of notificationTypes) {
        if (user.notifications.enabled) {
          const isEnabled = user.notifications[type.field];
          buttons.push([
            Markup.button.callback(
              `${isEnabled ? '✅' : '❌'} ${type.name}`,
              `notify:toggle:${type.id}`
            )
          ]);
        }
      }

      // زر عرض السجل
      if (user.notificationsLog && user.notificationsLog.length > 0) {
        buttons.push([
          Markup.button.callback('📋 عرض سجل الإشعارات', 'notify:logs')
        ]);
      }

      // زر العودة
      buttons.push([
        Markup.button.callback('⬅️ رجوع', 'menu:settings')
      ]);

      const keyboard = Markup.inlineKeyboard(buttons);

      const message = `🔔 <b>إعدادات الإشعارات</b>

${user.notifications.enabled ? 'الإشعارات مفعلة ✅' : 'الإشعارات معطلة ❌'}

اختر الإشعارات التي تريد استلامها:`;

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('Error in handleNotificationsMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * تبديل إشعار محدد
   */
  static async handleToggleNotification(ctx, type) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      // تهيئة الإشعارات إذا لم تكن موجودة
      user.notifications = user.notifications || {
        enabled: true,
        adhkarReminder: false,
        prayerReminder: false,
        eventReminder: false,
        motivational: false,
        gameUpdates: false,
        rewardUpdates: false,
        auctionUpdates: false
      };

      let message = '';
      let success = true;

      // تبديل الإشعارات العامة
      if (type === 'all') {
        user.notifications.enabled = !user.notifications.enabled;
        message = user.notifications.enabled
          ? '✅ تم تفعيل الإشعارات بنجاح'
          : '❌ تم تعطيل الإشعارات';
      } else {
        // التحقق من أن الإشعارات العامة مفعلة
        if (!user.notifications.enabled) {
          await ctx.answerCbQuery('⚠️ يرجى تفعيل الإشعارات أولاً');
          return;
        }

        // تبديل الإشعار المحدد
        const fieldMap = {
          adhkar: 'adhkarReminder',
          prayer: 'prayerReminder',
          events: 'eventReminder',
          motivational: 'motivational',
          games: 'gameUpdates',
          rewards: 'rewardUpdates',
          auction: 'auctionUpdates'
        };

        const field = fieldMap[type];
        if (field) {
          user.notifications[field] = !user.notifications[field];

          const nameMap = {
            adhkar: '🕌 أذكار',
            prayer: '⏰ أوقات الصلاة',
            events: '🔔 الأحداث',
            motivational: '💭 التحفيز',
            games: '🎮 الألعاب',
            rewards: '💰 المكافآت',
            auction: '🏷️ المزاد'
          };

          const state = user.notifications[field] ? 'مفعل ✅' : 'معطل ❌';
          message = `${nameMap[type]}: ${state}`;
        } else {
          success = false;
        }
      }

      if (success) {
        await user.save();

        // عرض القائمة المحدثة
        await ctx.editMessageText(
          `🔔 <b>إعدادات الإشعارات</b>

${user.notifications.enabled ? 'الإشعارات مفعلة ✅' : 'الإشعارات معطلة ❌'}

اختر الإشعارات التي تريد استلامها:`,
          {
            parse_mode: 'HTML',
            reply_markup: this.buildNotificationKeyboard(user)
          }
        );

        await ctx.answerCbQuery(message);
      } else {
        await ctx.answerCbQuery('❌ نوع إشعار غير صالح');
      }
    } catch (error) {
      console.error('Error in handleToggleNotification:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * بناء لوحة المفاتيح للإشعارات
   */
  static buildNotificationKeyboard(user) {
    const buttons = [];

    // زر تفعيل/تعطيل الإشعارات العامة
    const allEnabled = user.notifications.enabled;
    buttons.push([
      Markup.button.callback(
        allEnabled ? '🔕关闭 الإشعارات' : '🔔开启 الإشعارات',
        'notify:toggle:all'
      )
    ]);

    // أزرار الإشعارات المختلفة
    if (user.notifications.enabled) {
      const notificationTypes = [
        { id: 'adhkar', name: '🕌 أذكار', field: 'adhkarReminder' },
        { id: 'prayer', name: '⏰ أوقات الصلاة', field: 'prayerReminder' },
        { id: 'events', name: '🔔 الأحداث', field: 'eventReminder' },
        { id: 'motivational', name: '💭 التحفيز', field: 'motivational' },
        { id: 'games', name: '🎮 الألعاب', field: 'gameUpdates' },
        { id: 'rewards', name: '💰 المكافآت', field: 'rewardUpdates' },
        { id: 'auction', name: '🏷️ المزاد', field: 'auctionUpdates' }
      ];

      for (const type of notificationTypes) {
        const isEnabled = user.notifications[type.field];
        buttons.push([
          Markup.button.callback(
            `${isEnabled ? '✅' : '❌'} ${type.name}`,
            `notify:toggle:${type.id}`
          )
        ]);
      }
    }

    // زر عرض السجل
    if (user.notificationsLog && user.notificationsLog.length > 0) {
      buttons.push([
        Markup.button.callback('📋 عرض سجل الإشعارات', 'notify:logs')
      ]);
    }

    // زر العودة
    buttons.push([
      Markup.button.callback('⬅️ رجوع', 'menu:settings')
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * عرض سجل الإشعارات
   */
  static async handleNotificationLogs(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      if (!user.notificationsLog || user.notificationsLog.length === 0) {
        await ctx.answerCbQuery('📋 لا توجد إشعارات سابقة');
        return ctx.editMessageText(
          '📋 <b>سجل الإشعارات</b>\n\nلا توجد إشعارات سابقة',
          { parse_mode: 'HTML' }
        );
      }

      // ترتيب الإشعارات من الأحدث للأقدم
      const logs = user.notificationsLog
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      let message = '📋 <b>آخر الإشعارات</b>\n\n';

      for (const log of logs) {
        const date = new Date(log.timestamp).toLocaleString('ar-SA');
        message += `• ${log.message}\n`;
        message += `  📅 ${date}\n\n`;
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ حذف السجل', 'notify:clear')],
        [Markup.button.callback('⬅️ رجوع', 'notify:menu')]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleNotificationLogs:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * حذف سجل الإشعارات
   */
  static async handleClearLogs(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notificationsLog = [];
      await user.save();

      await ctx.editMessageText(
        '✅ تم حذف سجل الإشعارات',
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ رجوع', 'notify:menu')]
        ])
      );
      await ctx.answerCbQuery('✅ تم الحذف');
    } catch (error) {
      console.error('Error in handleClearLogs:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }
}

module.exports = NotificationsHandler;
