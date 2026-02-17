/**
 * Automated Notification System
 * نظام الإشعارات المؤتمت الشامل لبوت تيليجرام
 */

const node_cron = require('node-cron');
const { Telegraf, Markup } = require('telegraf');
const { User } = require('../database/models');
const { logger } = require('../utils/logger');
const { getRandomAyah } = require('../content/quranProvider');
const { getAdhkar } = require('../content/adhkarProvider');

class AutomatedNotificationSystem {
  constructor(bot) {
    this.bot = bot;
    this.scheduledTasks = new Map();
  }

  /**
   * تهيئة النظام وجدولة جميع الإشعارات
   */
  async initialize() {
    logger.info('📬 تهيئة نظام الإشعارات المؤتمت...');

    // فحص وتحديث المهام كل دقيقة
    this.scheduleMinuteCheck();

    // إشعارات الأذكار الصباحية والمسائية
    this.scheduleAdhkarNotifications();

    // إشعارات تذكير الختمة
    this.scheduleKhatmaReminders();

    // إشعارات القرآن الكريم
    this.scheduleQuranReminders();

    // إشعارات الألعاب
    this.scheduleGameNotifications();

    // إشعارات المزاد
    this.scheduleAuctionNotifications();

    logger.info('✅ تم تهيئة نظام الإشعارات المؤتمت بنجاح');
  }

  /**
   * فحص دوري للتحقق من المستخدمين وجدولة الإشعارات
   */
  scheduleMinuteCheck() {
    node_cron.schedule('* * * * *', async () => {
      await this.checkAndSendScheduledNotifications();
    });
  }

  /**
   * فحص وإرسال الإشعارات المجدولة
   */
  async checkAndSendScheduledNotifications() {
    try {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      // فحص المستخدمين وإرسال الإشعارات المناسبة
      const users = await User.find({
        'notifications.enabled': true
      });

      for (const user of users) {
        const notif = user.notifications || {};

        // إشعارات الأذكار الصباحية
        if (notif.adhkarReminder && notif.adhkarMorningTime === currentTime) {
          await this.sendAdhkarMorning(user);
        }

        // إشعارات الأذكار المسائية
        if (notif.adhkarReminder && notif.adhkarEveningTime === currentTime) {
          await this.sendAdhkarEvening(user);
        }

        // إشعارات القرآن
        if (notif.quranReminder && notif.quranReminderTime === currentTime) {
          await this.sendQuranReminder(user);
        }

        // إشعارات الألعاب
        if (notif.gameNotifications) {
          for (const [game, settings] of Object.entries(notif.gameNotifications)) {
            if (settings.enabled && settings.time === currentTime) {
              await this.sendGameNotification(user, game);
            }
          }
        }
      }
    } catch (error) {
      logger.error('❌ خطأ في فحص الإشعارات:', error.message);
    }
  }

  // ==================== إشعارات الأذكار ====================

  /**
   * جدولة إشعارات الأذكار
   */
  scheduleAdhkarNotifications() {
    // إشعارات الأذكار الصباحية (كل ساعة للتأكد من الإرسال)
    node_cron.schedule('0 * * * *', async () => {
      const now = new Date();
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.adhkarReminder': true
      });

      for (const user of users) {
        const morningTime = user.notifications?.adhkarMorningTime || '06:00';
        const [targetHour] = morningTime.split(':');

        if (now.getHours() === parseInt(targetHour)) {
          await this.sendAdhkarMorning(user);
        }
      }
    });

    // إشعارات الأذكار المسائية
    node_cron.schedule('30 * * * *', async () => {
      const now = new Date();
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.adhkarReminder': true
      });

      for (const user of users) {
        const eveningTime = user.notifications?.adhkarEveningTime || '21:00';
        const [targetHour] = eveningTime.split(':');

        if (now.getHours() === parseInt(targetHour)) {
          await this.sendAdhkarEvening(user);
        }
      }
    });
  }

  /**
   * إرسال أذكار الصباح
   */
  async sendAdhkarMorning(user) {
    try {
      const adhkar = getAdhkar();
      const morningAdhkar = adhkar?.morning || [];
      const randomDhikr = morningAdhkar[Math.floor(Math.random() * morningAdhkar.length)] || {
        text: 'اللهم إني أسألك خير هذا اليوم',
        reward: 'نعيم'
      };

      const message = `🌅 <b>صباح الخير!</b>

${user.firstName ? `يا ${user.firstName}!` : 'صديقي!'}

📿 <b>أذكار الصباح</b>

"${randomDhikr.text}"

${randomDhikr.reward ? `✨ ${randomDhikr.reward}` : ''}

🌞 ابدأ يومك بالصلاة والذكر`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📿 أذكار الصباح', 'menu:adhkar')],
        [Markup.button.callback('🤲 دعاء الصباح', 'menu:dua')]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, 'أذكار الصباح', 'adhkar');
      logger.info(`✅ إرسال أذكار صباح للمستخدم ${user.userId}`);
    } catch (error) {
      logger.error(`❌ خطأ في إرسال أذكار الصباح: ${error.message}`);
    }
  }

  /**
   * إرسال أذكار المساء
   */
  async sendAdhkarEvening(user) {
    try {
      const adhkar = getAdhkar();
      const eveningAdhkar = adhkar?.evening || [];
      const randomDhikr = eveningAdhkar[Math.floor(Math.random() * eveningAdhkar.length)] || {
        text: 'اللهم إني أمسيت وأمسي الملك لك',
        reward: 'حفظ'
      };

      const message = `🌙 <b>مساء الخير!</b>

${user.firstName ? `يا ${user.firstName}!` : 'صديقي!'}

📿 <b>أذكار المساء</b>

"${randomDhikr.text}"

${randomDhikr.reward ? `✨ ${randomDhikr.reward}` : ''}

🌙 اختم يومك بالاستغفار`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📿 أذكار المساء', 'menu:adhkar')],
        [Markup.button.callback('🤲 دعاء المساء', 'menu:dua')]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, 'أذكار المساء', 'adhkar');
      logger.info(`✅ إرسال أذكار مساء للمستخدم ${user.userId}`);
    } catch (error) {
      logger.error(`❌ خطأ في إرسال أذكار المساء: ${error.message}`);
    }
  }

  // ==================== إشعارات الختمة ====================

  /**
   * جدولة تذكيرات الختمة
   */
  scheduleKhatmaReminders() {
    // تذكير كل 5 ساعات
    node_cron.schedule('0 */5 * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.khatmaReminder': true,
        'khatmaProgress.currentPage': { $gt: 0 }
      });

      for (const user of users) {
        await this.sendKhatmaReminder(user);
      }
    });
  }

  /**
   * إرسال تذكير الختمة
   */
  async sendKhatmaReminder(user) {
    try {
      const progress = user.khatmaProgress || {};
      const currentPage = progress.currentPage || 1;
      const totalPages = 604;
      const percent = ((currentPage / totalPages) * 100).toFixed(1);

      const message = `📖 <b>تذكير بالختمة القرآنية</b>

${user.firstName ? `${user.firstName}،` : 'صديقي'}

الصفحة الحالية: <b>${currentPage}</b> من 604
التقدم: <b>${percent}%</b>

${currentPage < 604 ? '🎯 هل تريد المتابعة؟' : '🎉你已经 أنهيت الختمة! Baraka Allah feek'}

عندك <b>${604 - currentPage}</b> صفحة متبقية`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('▶️ متابعة القراءة', 'khatma:read')],
        [Markup.button.callback('📊 تقدم الختمة', 'khatma:progress')],
        [Markup.button.callback('🔔 إيقاف التذكير', 'khatma:stopReminder')]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, 'تذكير بالختمة', 'khatma');
    } catch (error) {
      logger.error(`❌ خطأ في إرسال تذكير الختمة: ${error.message}`);
    }
  }

  // ==================== إشعارات القرآن ====================

  /**
   * جدولة إشعارات القرآن
   */
  scheduleQuranReminders() {
    node_cron.schedule('0 5 * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.quranReminder': true
      });

      for (const user of users) {
        const reminderTime = user.notifications?.quranReminderTime || '05:00';
        const now = new Date();
        const [targetHour] = reminderTime.split(':');

        if (now.getHours() === parseInt(targetHour)) {
          await this.sendQuranReminder(user);
        }
      }
    });
  }

  /**
   * إرسال تذكير القرآن
   */
  async sendQuranReminder(user) {
    try {
      const ayah = await getRandomAyah();

      const message = `📖 <b>آية اليوم</b>

${user.firstName ? `${user.firstName}،` : 'صديقي'}

${ayah?.text || '念在这个时代'}
${ayah?.surah ? `\n\n📜 سورة ${ayah.surah} - آية ${ayah.ayah}` : ''}

💡 فكر في هذه الآية وتدبرها`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📖 قراءة المزيد', 'menu:quran')],
        [Markup.button.callback('🎯 بدء تسميع', 'quran:startMemorization')],
        [Markup.button.callback('⏰ تغيير الوقت', 'settings:notifyTime')]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, 'آية اليوم', 'quran');
      logger.info(`✅ إرسال آية اليوم للمستخدم ${user.userId}`);
    } catch (error) {
      logger.error(`❌ خطأ في إرسال تذكير القرآن: ${error.message}`);
    }
  }

  // ==================== إشعارات الألعاب ====================

  /**
   * جدولة إشعارات الألعاب
   */
  scheduleGameNotifications() {
    // فحص كل ساعة
    node_cron.schedule('0 * * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.gameNotifications': { $exists: true }
      });

      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');

      for (const user of users) {
        const games = user.notifications?.gameNotifications || {};

        for (const [gameName, settings] of Object.entries(games)) {
          if (settings.enabled && settings.time) {
            const [targetHour] = settings.time.split(':');
            if (parseInt(targetHour) === now.getHours()) {
              await this.sendGameNotification(user, gameName);
            }
          }
        }
      }
    });
  }

  /**
   * إرسال إشعار لعبة
   */
  async sendGameNotification(user, gameName) {
    try {
      const gameMessages = {
        guessNumber: {
          title: '🎯 لعبة تخمين الرقم',
          desc: 'خمن الرقم السري واربح!'
        },
        quiz: {
          title: '🧠 مسابقة دينية',
          desc: 'اختبر معلوماتك الإسلامية'
        },
        memory: {
          title: '🧩 لعبة الذاكرة',
          desc: 'ابحث عن الأزواج المطابقة'
        },
        math: {
          title: '🔢 تحدي الرياضيات',
          desc: 'حل المسائل الحسابية'
        },
        word: {
          title: '🔤 لعبة الكلمات',
          desc: 'كون كلمات من الحروف'
        },
        quran: {
          title: '📖 ألعاب قرآنية',
          desc: 'ألعاب قرآنية ممتعة'
        }
      };

      const game = gameMessages[gameName] || { title: '🎮 لعبة', desc: 'لعب' };

      const message = `${game.title}

${user.firstName ? `${user.firstName}،` : ''}

${game.desc}

🎮 هل تريد اللعب الآن؟`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎮 играть الآن', `games:${gameName}:play`)]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, `إشعار ${gameName}`, 'games');
    } catch (error) {
      logger.error(`❌ خطأ في إرسال إشعار اللعبة: ${error.message}`);
    }
  }

  // ==================== إشعارات المزاد ====================

  /**
   * جدولة إشعارات المزاد
   */
  scheduleAuctionNotifications() {
    // فحص المزاد كل ساعة
    node_cron.schedule('0 * * * *', async () => {
      const { Auction } = require('../database/models');
      const activeAuctions = await Auction.find({
        status: 'active',
        endTime: { $gt: new Date() }
      });

      for (const auction of activeAuctions) {
        const users = await User.find({
          'notifications.enabled': true,
          'notifications.auctionNotifications.enabled': true
        });

        for (const user of users) {
          await this.sendAuctionReminder(user, auction);
        }
      }
    });
  }

  /**
   * إرسال تذكير المزاد
   */
  async sendAuctionReminder(user, auction) {
    try {
      const now = new Date();
      const endTime = new Date(auction.endTime);
      const hoursLeft = Math.floor((endTime - now) / (1000 * 60 * 60));
      const minutesLeft = Math.floor(((endTime - now) % (1000 * 60 * 60)) / (1000 * 60));

      let timeText = '';
      if (hoursLeft > 0) {
        timeText = `${hoursLeft} ساعة و ${minutesLeft} دقيقة`;
      } else if (minutesLeft > 0) {
        timeText = `${minutesLeft} دقيقة`;
      } else {
        timeText = 'اقترب الانتهاء!';
      }

      const message = `🏷️ <b>تذكير بالمزاد</b>

${user.firstName ? `${user.firstName}،` : ''}

${auction.itemName}

⏰ <b>بقي على الانتهاء:</b> ${timeText}

💰 <b>السعر الحالي:</b> ${auction.currentBid || auction.startingPrice} عملة

${hoursLeft <= 5 ? '⚠️ الفرصة الأخيرة!' : '🎯 شارك الآن!'}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💰 المزايدة', `auction:${auction._id}:bid`)]
      ]);

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      await this.logNotification(user.userId, `تذكير المزاد: ${auction.itemName}`, 'auction');
    } catch (error) {
      logger.error(`❌ خطأ في إرسال تذكير المزاد: ${error.message}`);
    }
  }

  /**
   * إرسال إشعار انتهاء المزاد
   */
  async sendAuctionEndNotification(user, auction) {
    try {
      let message = '';
      if (auction.winner?.userId === user.userId) {
        message = `🏷️ <b>انتهى المزاد!</b>

${auction.itemName}

🎉 <b>تهانينا! فزت بالمزاد!</b>

💰 السعر المدفوع: ${auction.currentBid} عملة

شكراً لمشاركتك!`;
      } else {
        message = `🏷️ <b>انتهى المزاد!</b>

${auction.itemName}

😢 لم تفز هذه المرة

🔜 будут future المزادات!

شكراً لمشاركتك!`;
      }

      await this.bot.telegram.sendMessage(user.userId, message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      logger.error(`❌ خطأ في إرسال إشعار انتهاء المزاد: ${error.message}`);
    }
  }

  /**
   * تسجيل الإشعار
   */
  async logNotification(userId, message, type) {
    try {
      await User.findOneAndUpdate(
        { userId },
        {
          $push: {
            notificationsLog: {
              message,
              type,
              timestamp: new Date(),
              read: false
            }
          }
        }
      );
    } catch (error) {
      logger.error('❌ خطأ في تسجيل الإشعار:', error.message);
    }
  }

  /**
   * إرسال إشعار لمستخدم واحد
   */
  async sendNotification(userId, message, options = {}) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.notifications?.enabled) {
        return false;
      }

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        ...options
      });

      return true;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الإشعار: ${error.message}`);
      return false;
    }
  }
}

module.exports = AutomatedNotificationSystem;
