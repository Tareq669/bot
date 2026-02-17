const { Markup } = require('telegraf');
const { User } = require('../database/models');

class NotificationsHandler {
  /**
   * عرض قائمة إعدادات الإشعارات الشاملة
   */
  static async handleNotificationsMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return ctx.reply('❌ لم يتم العثور على ملفك');
      }

      // تهيئة الإعدادات الافتراضية
      user.notifications = user.notifications || {
        enabled: true,
        timezone: 'Asia/Riyadh',
        adhkarMorningTime: '06:00',
        adhkarEveningTime: '21:00',
        adhkarReminder: false,
        quranReminder: false,
        quranReminderTime: '05:00',
        khatmaReminder: false,
        khatmaReminderInterval: 5,
        gameNotifications: {
          guessNumber: { enabled: false, time: '10:00' },
          quiz: { enabled: false, time: '14:00' },
          memory: { enabled: false, time: '18:00' },
          math: { enabled: false, time: '20:00' },
          word: { enabled: false, time: '22:00' }
        },
        auctionNotifications: {
          enabled: false,
          startAlert: true,
          endAlert: true,
          hourlyUpdate: true
        }
      };

      await user.save();

      const message = `🔔 <b>إعدادات الإشعارات الشاملة</b>

${user.notifications.enabled ? '✅ الإشعارات مفعلة' : '❌ الإشعارات معطلة'}

اختر القسم الذي تريد إعداده:`;

      const keyboard = Markup.inlineKeyboard([
        // الإشعارات العامة
        [
          Markup.button.callback(
            user.notifications.enabled ? '🔕 إ关闭 الإشعارات' : '🔔开启 الإشعارات',
            'notify:toggle:main'
          )
        ],
        [
          Markup.button.callback('🌍 التوقيت والمنطقة', 'notify:settings:timezone')
        ],

        // الأذكار
        [
          Markup.button.callback(
            `📿 الأذكار ${user.notifications.adhkarReminder ? '✅' : '❌'}`,
            'notify:menu:adhkar'
          )
        ],

        // القرآن
        [
          Markup.button.callback(
            `📖 القرآن ${user.notifications.quranReminder ? '✅' : '❌'}`,
            'notify:menu:quran'
          )
        ],

        // الختمة
        [
          Markup.button.callback(
            `🕋 الختمة ${user.notifications.khatmaReminder ? '✅' : '❌'}`,
            'notify:menu:khatma'
          )
        ],

        // الألعاب
        [
          Markup.button.callback(
            `🎮 الألعاب ${Object.values(user.notifications.gameNotifications || {}).some(g => g.enabled) ? '✅' : '❌'}`,
            'notify:menu:games'
          )
        ],

        // المزاد
        [
          Markup.button.callback(
            `🏷️ المزاد ${user.notifications.auctionNotifications?.enabled ? '✅' : '❌'}`,
            'notify:menu:auction'
          )
        ],

        // السجل
        [
          Markup.button.callback('📋 سجل الإشعارات', 'notify:logs')
        ],

        // العودة
        [
          Markup.button.callback('⬅️ رجوع', 'menu:settings')
        ]
      ]);

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
   * عرض قائمة أذكار الإشعارات
   */
  static async handleAdhkarMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};
      user.notifications.adhkarReminder = user.notifications.adhkarReminder || false;
      user.notifications.adhkarMorningTime = user.notifications.adhkarMorningTime || '06:00';
      user.notifications.adhkarEveningTime = user.notifications.adhkarEveningTime || '21:00';

      const message = `📿 <b>إعدادات أذكار الإشعارات</b>

${user.notifications.adhkarReminder ? '✅ مفعل' : '❌ معطل'}

🌅 صباحاً: ${user.notifications.adhkarMorningTime}
🌙 مساءً: ${user.notifications.adhkarEveningTime}`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            user.notifications.adhkarReminder ? '❌关闭' : '🔔开启',
            'notify:toggle:adhkar'
          )
        ],
        [
          Markup.button.callback('⏰ تغيير وقت الصباح', 'notify:set:morning')
        ],
        [
          Markup.button.callback('⏰ تغيير وقت المساء', 'notify:set:evening')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'notify:menu')
        ]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleAdhkarMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض قائمة القرآن
   */
  static async handleQuranMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};
      user.notifications.quranReminder = user.notifications.quranReminder || false;
      user.notifications.quranReminderTime = user.notifications.quranReminderTime || '05:00';

      const message = `📖 <b>إشعارات القرآن الكريم</b>

${user.notifications.quranReminder ? '✅ مفعل' : '❌ معطل'}

الوقت: ${user.notifications.quranReminderTime}`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            user.notifications.quranReminder ? '❌关闭' : '🔔开启',
            'notify:toggle:quran'
          )
        ],
        [
          Markup.button.callback('⏰ تغيير الوقت', 'notify:set:quranTime')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'notify:menu')
        ]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleQuranMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض قائمة الختمة
   */
  static async handleKhatmaMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};
      user.notifications.khatmaReminder = user.notifications.khatmaReminder || false;
      user.notifications.khatmaReminderInterval = user.notifications.khatmaReminderInterval || 5;

      const progress = user.khatmaProgress || {};
      const currentPage = progress.currentPage || 1;
      const percent = ((currentPage / 604) * 100).toFixed(1);

      const message = `🕋 <b>إشعارات الختمة القرآنية</b>

${user.notifications.khatmaReminder ? '✅ مفعل' : '❌ معطل'}

التذكير كل: ${user.notifications.khatmaReminderInterval} ساعات
التقدم: ${currentPage} صفحة (${percent}%)`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            user.notifications.khatmaReminder ? '❌关闭' : '🔔开启',
            'notify:toggle:khatma'
          )
        ],
        [
          Markup.button.callback('⏰ تغيير الفترة', 'notify:set:khatmaInterval')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'notify:menu')
        ]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleKhatmaMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض قائمة الألعاب
   */
  static async handleGamesMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};
      user.notifications.gameNotifications = user.notifications.gameNotifications || {
        guessNumber: { enabled: false, time: '10:00' },
        quiz: { enabled: false, time: '14:00' },
        memory: { enabled: false, time: '18:00' },
        math: { enabled: false, time: '20:00' },
        word: { enabled: false, time: '22:00' }
      };

      const games = user.notifications.gameNotifications;
      const enabledCount = Object.values(games).filter(g => g.enabled).length;

      const message = `🎮 <b>إشعارات الألعاب</b>

${enabledCount} ${enabledCount > 0 ? 'ألعاب مفعلة' : 'لا توجد ألعاب مفعلة'}

اختر اللعبة:`;

      const buttons = [];
      const gameNames = {
        guessNumber: '🎯 تخمين الرقم',
        quiz: '🧠 مسابقة',
        memory: '🧩 ذاكرة',
        math: '🔢 رياضيات',
        word: '🔤 كلمات'
      };

      for (const [gameId, settings] of Object.entries(games)) {
        buttons.push([
          Markup.button.callback(
            `${settings.enabled ? '✅' : '❌'} ${gameNames[gameId] || gameId} - ${settings.time}`,
            `notify:toggle:game:${gameId}`
          )
        ]);
      }

      buttons.push([Markup.button.callback('⬅️ رجوع', 'notify:menu')]);

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleGamesMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض قائمة المزاد
   */
  static async handleAuctionMenu(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};
      user.notifications.auctionNotifications = user.notifications.auctionNotifications || {
        enabled: false,
        startAlert: true,
        endAlert: true,
        hourlyUpdate: true
      };

      const auction = user.notifications.auctionNotifications;

      const message = `🏷️ <b>إشعارات المزاد</b>

${auction.enabled ? '✅ مفعل' : '❌ معطل'}

${auction.startAlert ? '✅' : '❌'} إشعار عند بدء المزاد
${auction.endAlert ? '✅' : '❌'} إشعار عند انتهاء المزاد
${auction.hourlyUpdate ? '✅' : '❌'} تحديث كل ساعة`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            auction.enabled ? '❌关闭' : '🔔开启',
            'notify:toggle:auction'
          )
        ],
        [
          Markup.button.callback(
            auction.startAlert ? '✅ إشعار البدء' : '❌ إشعار البدء',
            'notify:toggle:auctionStart'
          )
        ],
        [
          Markup.button.callback(
            auction.endAlert ? '✅ إشعار الانتهاء' : '❌ إشعار الانتهاء',
            'notify:toggle:auctionEnd'
          )
        ],
        [
          Markup.button.callback(
            auction.hourlyUpdate ? '✅ التحديث كل ساعة' : '❌ التحديث كل ساعة',
            'notify:toggle:auctionHourly'
          )
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'notify:menu')
        ]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in handleAuctionMenu:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * تبديل الإشعار
   */
  static async handleToggleNotification(ctx, type) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};

      let message = '';

      switch (type) {
        case 'main':
          user.notifications.enabled = !user.notifications.enabled;
          message = user.notifications.enabled ? '✅ تم تفعيل الإشعارات' : '❌ تم تعطيل الإشعارات';
          break;

        case 'adhkar':
          user.notifications.adhkarReminder = !user.notifications.adhkarReminder;
          message = user.notifications.adhkarReminder ? '✅ تم تفعيل أذكار الإشعارات' : '❌ تم تعطيل أذكار الإشعارات';
          break;

        case 'quran':
          user.notifications.quranReminder = !user.notifications.quranReminder;
          message = user.notifications.quranReminder ? '✅ تم تفعيل إشعارات القرآن' : '❌ تم تعطيل إشعارات القرآن';
          break;

        case 'khatma':
          user.notifications.khatmaReminder = !user.notifications.khatmaReminder;
          message = user.notifications.khatmaReminder ? '✅ تم تفعيل تذكير الختمة' : '❌ تم تعطيل تذكير الختمة';
          break;

        case 'auction':
          user.notifications.auctionNotifications = user.notifications.auctionNotifications || {
            enabled: false,
            startAlert: true,
            endAlert: true,
            hourlyUpdate: true
          };
          user.notifications.auctionNotifications.enabled = !user.notifications.auctionNotifications.enabled;
          message = user.notifications.auctionNotifications.enabled ? '✅ تم تفعيل إشعارات المزاد' : '❌ تم تعطيل إشعارات المزاد';
          break;

        case 'auctionStart':
          user.notifications.auctionNotifications = user.notifications.auctionNotifications || {
            enabled: true,
            startAlert: true,
            endAlert: true,
            hourlyUpdate: true
          };
          user.notifications.auctionNotifications.startAlert = !user.notifications.auctionNotifications.startAlert;
          message = user.notifications.auctionNotifications.startAlert ? '✅ تم تفعيل إشعار بدء المزاد' : '❌ تم تعطيل إشعار بدء المزاد';
          break;

        case 'auctionEnd':
          user.notifications.auctionNotifications = user.notifications.auctionNotifications || {
            enabled: true,
            startAlert: true,
            endAlert: true,
            hourlyUpdate: true
          };
          user.notifications.auctionNotifications.endAlert = !user.notifications.auctionNotifications.endAlert;
          message = user.notifications.auctionNotifications.endAlert ? '✅ تم تفعيل إشعار انتهاء المزاد' : '❌ تم تعطيل إشعار انتهاء المزاد';
          break;

        case 'auctionHourly':
          user.notifications.auctionNotifications = user.notifications.auctionNotifications || {
            enabled: true,
            startAlert: true,
            endAlert: true,
            hourlyUpdate: true
          };
          user.notifications.auctionNotifications.hourlyUpdate = !user.notifications.auctionNotifications.hourlyUpdate;
          message = user.notifications.auctionNotifications.hourlyUpdate ? '✅ تم تفعيل التحديث كل ساعة' : '❌ تم تعطيل التحديث كل ساعة';
          break;

        default:
          // Handle game toggles
          if (type.startsWith('game:')) {
            const gameId = type.replace('game:', '');
            user.notifications.gameNotifications = user.notifications.gameNotifications || {
              guessNumber: { enabled: false, time: '10:00' },
              quiz: { enabled: false, time: '14:00' },
              memory: { enabled: false, time: '18:00' },
              math: { enabled: false, time: '20:00' },
              word: { enabled: false, time: '22:00' }
            };

            if (!user.notifications.gameNotifications[gameId]) {
              user.notifications.gameNotifications[gameId] = { enabled: false, time: '10:00' };
            }

            user.notifications.gameNotifications[gameId].enabled = !user.notifications.gameNotifications[gameId].enabled;
            message = user.notifications.gameNotifications[gameId].enabled ? `✅ تم تفعيل ${gameId}` : `❌ تم تعطيل ${gameId}`;
          } else {
            await ctx.answerCbQuery('❌ نوع غير صالح');
            return;
          }
      }

      await user.save();
      await ctx.answerCbQuery(message);

      // إعادة عرض القائمة
      await this.handleNotificationsMenu(ctx);
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

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      const logs = user.notificationsLog || [];

      if (logs.length === 0) {
        await ctx.editMessageText(
          '📋 <b>سجل الإشعارات</b>\n\nلا توجد إشعارات سابقة',
          { parse_mode: 'HTML' }
        );
        await ctx.answerCbQuery();
        return;
      }

      // ترتيب من الأحدث
      const sortedLogs = logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 15);

      let message = '📋 <b>آخر الإشعارات</b>\n\n';

      for (const log of sortedLogs) {
        const date = new Date(log.timestamp).toLocaleString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short'
        });
        message += `• ${log.message}\n   📅 ${date}\n\n`;
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
   * حذف السجل
   */
  static async handleClearLogs(ctx) {
    try {
      const userId = ctx.from.id;
      await User.findOneAndUpdate(
        { userId },
        { $set: { notificationsLog: [] } }
      );

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

  /**
   * طلب وقت الإشعار من المستخدم
   */
  static async requestNotificationTime(ctx, type) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.answerCbQuery('❌ لم يتم العثور على ملفك');
        return;
      }

      const prompts = {
        morning: 'أدخل وقت أذكار الصباح (مثال: 06:00):',
        evening: 'أدخل وقت أذكار المساء (مثال: 21:00):',
        quranTime: 'أدخل وقت تذكير القرآن (مثال: 05:00):',
        khatmaInterval: 'أدخل فترة التذكير بالساعات (مثال: 5):',
        timezone: 'أدخل المنطقة الزمنية (مثال: Asia/Riyadh):'
      };

      user.awaitingInput = {
        type: `notifyTime:${type}`,
        expires: new Date(Date.now() + 5 * 60 * 1000)
      };
      await user.save();

      await ctx.editMessageText(
        `⏰ ${prompts[type] || 'أدخل الوقت:'}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('إلغاء', 'notify:menu')]
        ])
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in requestNotificationTime:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * معالجة إدخال الوقت
   */
  static async handleTimeInput(ctx, input, type) {
    try {
      const userId = ctx.from.id;
      const user = await User.findOne({ userId });

      if (!user) {
        await ctx.reply('❌ لم يتم العثور على ملفك');
        return;
      }

      user.notifications = user.notifications || {};

      let success = false;
      let message = '';

      switch (type) {
        case 'morning':
          if (/^\d{2}:\d{2}$/.test(input)) {
            user.notifications.adhkarMorningTime = input;
            success = true;
            message = `✅ تم تعيين وقت الصباح: ${input}`;
          }
          break;

        case 'evening':
          if (/^\d{2}:\d{2}$/.test(input)) {
            user.notifications.adhkarEveningTime = input;
            success = true;
            message = `✅ تم تعيين وقت المساء: ${input}`;
          }
          break;

        case 'quranTime':
          if (/^\d{2}:\d{2}$/.test(input)) {
            user.notifications.quranReminderTime = input;
            success = true;
            message = `✅ تم تعيين وقت القرآن: ${input}`;
          }
          break;

        case 'khatmaInterval': {
          const interval = parseInt(input);
          if (!isNaN(interval) && interval >= 1 && interval <= 24) {
            user.notifications.khatmaReminderInterval = interval;
            success = true;
            message = `✅ تم تعيين الفترة: كل ${interval} ساعات`;
          }
          break;
        }

        case 'timezone':
          user.notifications.timezone = input;
          success = true;
          message = `✅ تم تعيين المنطقة: ${input}`;
          break;
      }

      if (success) {
        user.awaitingInput = null;
        await user.save();
        await ctx.reply(message);
      } else {
        await ctx.reply('❌ تنسيق غير صحيح. استخدم تنسيق HH:MM (مثال: 06:00)');
      }
    } catch (error) {
      console.error('Error in handleTimeInput:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }
}

module.exports = NotificationsHandler;
