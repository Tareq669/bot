/**
 * Advanced Notification System
 * نظام الإشعارات المتقدم للإسلامي بوت
 */

const { logger } = require('../utils/logger');
const User = require('../database/models/User');
const node_cron = require('node-cron');
const Markup = require('telegraf/markup');

class AdvancedNotificationSystem {
  constructor(bot) {
    this.bot = bot;
    this.scheduledJobs = new Map();
  }

  /**
   * تهيئة النظام وإعداد المهام المجدولة
   */
  initialize() {
    logger.info('📬 تهيئة نظام الإشعارات المتقدم...');

    // إشعارات الأذكار الصباحية
    this.scheduleAdhkarMorning();

    // إشعارات الأذكار المسائية
    this.scheduleAdhkarEvening();

    // إشعارات تحديثات اليومية
    this.scheduleDailySummary();

    // إشعارات التذكير بالنشاط
    this.scheduleActivityReminder();

    // إشعارات المزاد
    this.scheduleAuctionReminder();

    // إشعارات الختمة
    this.scheduleKhatmaReminder();

    // إشعارات التحفيزية
    this.scheduleMotivational();

    // إشعارات ترتيب المتصدرين
    this.scheduleLeaderboardUpdates();

    logger.info('✅ تم تهيئة نظام الإشعارات بنجاح');
  }

  /**
   * إرسال إشعار لمستخدم واحد
   */
  async sendNotification(userId, message, options = {}) {
    try {
      const user = await User.findOne({ userId });
      if (!user || user.notifications?.enabled === false) {
        return false;
      }

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });

      // تسجيل الإشعار
      await this.logNotification(userId, message);

      logger.info(`✅ إشعار مرسل للمستخدم ${userId}`);
      return true;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الإشعار: ${error.message}`);
      return false;
    }
  }

  /**
   * إرسال إشعار لمجموعة من المستخدمين
   */
  async broadcastNotification(userIds, message, options = {}) {
    const results = {
      success: 0,
      failed: 0
    };

    for (const userId of userIds) {
      const success = await this.sendNotification(userId, message, options);
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    }

    logger.info(`📬 بث الإشعارات: ${results.success} نجاح, ${results.failed} فشل`);
    return results;
  }

  /**
   * إرسال لجميع المستخدمين النشطين
   */
  async broadcastToActiveUsers(message, options = {}) {
    try {
      const users = await User.find({
        'notifications.enabled': true,
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).select('userId');

      const userIds = users.map(u => u.userId);
      return await this.broadcastNotification(userIds, message, options);
    } catch (error) {
      logger.error(`❌ خطأ في البث: ${error.message}`);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * تسجيل الإشعار في قاعدة البيانات
   */
  async logNotification(userId, message) {
    try {
      await User.findOneAndUpdate(
        { userId },
        {
          $push: {
            notificationsLog: {
              message,
              timestamp: new Date(),
              read: false,
              type: 'general'
            }
          }
        }
      );
    } catch (error) {
      logger.error(`❌ خطأ في تسجيل الإشعار: ${error.message}`);
    }
  }

  // ==================== إشعارات الأذكار ====================

  /**
   * إشعارات الأذكار الصباحية - الساعة 7 صباحاً
   */
  scheduleAdhkarMorning() {
    node_cron.schedule('0 7 * * *', async () => {
      logger.info('📬 إرسال إشعارات الأذكار الصباحية...');

      const users = await User.find({
        'notifications.enabled': true,
        'notifications.adhkarReminder': true
      }).select('userId firstName');

      const message = `🌅 <b>صباح الخير يا</b> ${users[0]?.firstName || 'صديقي'}!

📿 <b>حان وقت الأذكار الصباحية</b>

"اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ"

🌞 ابدأ يومك بالذكر والاستغفار
قال ﷺ: "من قال حين يصبح: اللهم إني أصبحنا..."

🎯 اضغط للأذكار:`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📿 أذكار الصباح', 'menu:adhkar')]
      ]);

      for (const user of users) {
        await this.sendNotification(user.userId, message, { reply_markup: keyboard });
      }

      logger.info(`✅ تم إرسال ${users.length} إشعار صباحي`);
    });
  }

  /**
   * إشعارات الأذكار المسائية - الساعة 7 مساءً
   */
  scheduleAdhkarEvening() {
    node_cron.schedule('0 19 * * *', async () => {
      logger.info('📬 إرسال إشعارات الأذكار المسائية...');

      const users = await User.find({
        'notifications.enabled': true,
        'notifications.adhkarReminder': true
      }).select('userId firstName');

      const message = `🌙 <b>مساء الخير!</b>

📿 <b>حان وقت أذكار المساء</b>

"قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَن تَشَاءُ"

🌙 اختم يومك بالذكر
قال ﷺ: "من قال حين يمسي..."

🎯 اضغط للأذكار:`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📿 أذكار المساء', 'menu:adhkar')]
      ]);

      for (const user of users) {
        await this.sendNotification(user.userId, message, { reply_markup: keyboard });
      }

      logger.info(`✅ تم إرسال ${users.length} إشعار مسائي`);
    });
  }

  // ==================== الملخص اليومي ====================

  /**
   * إرسال ملخص يومي للمستخدمين
   */
  scheduleDailySummary() {
    node_cron.schedule('0 21 * * *', async () => {
      logger.info('📬 إرسال الملخص اليومي...');

      const users = await User.find({
        'notifications.enabled': true,
        'notifications.dailySummary': true
      });

      for (const user of users) {
        const message = this.generateDailySummary(user);
        await this.sendNotification(user.userId, message);
      }

      logger.info('✅ تم إرسال الملخص اليومي');
    });
  }

  /**
   * إنشاء رسالة الملخص اليومي
   */
  generateDailySummary(user) {
    const streak = user.dailyReward?.streak || 0;
    const coins = user.coins || 0;
    const level = user.level || 1;
    const xp = user.xp || 0;
    const xpNeeded = level * 100;
    const khatma = user.khatmaProgress?.currentPage || 0;

    return `📊 <b>ملخص يومك</b>

🔥 سلسلة الأيام: <b>${streak} يوم</b>
💰 رصيدك: <b>${coins} عملة</b>
⭐ مستواك: <b>${level}</b> (${xp}/${xpNeeded} XP)
📖 الختمة: <b>${khatma}/114 صفحة</b>

${streak >= 7 ? '🔥 ما شاء الله! مستمر 7 أيام!' : '💪 واصل بنفسك!'}

اضغط /start للعودة للقائمة`;
  }

  // ==================== تذكير بالنشاط ====================

  /**
   * تذكير المستخدم بالنشاط إذا كان غير نشط
   */
  scheduleActivityReminder() {
    node_cron.schedule('0 18 * * *', async () => {
      logger.info('📬 إرسال تذكيرات النشاط...');

      const inactiveUsers = await User.find({
        'notifications.enabled': true,
        'notifications.motivational': true,
        lastActive: {
          $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      });

      for (const user of inactiveUsers) {
        const messages = [
          `💔 <b>نفتقدك يا ${user.firstName}!</b>

🌟 هل عدت للعب؟ ننتظرك!
اضغط /start للعودة`,

          `🔥 <b>مرحبًا ${user.firstName}!</b>

🎮 أصدقاؤك يفتقدونك في البوت!
هل ترجع تكمل اللعب معنا؟`,

          `🌅 <b>صباح الخير يا ${user.firstName}!</b>

✨ يوم جديد مليان بالفرص!
شاركنا نشاطك اليوم!`
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        await this.sendNotification(user.userId, randomMessage);
      }

      logger.info(`✅ تم إرسال ${inactiveUsers.length} تذكير نشاط`);
    });
  }

  // ==================== إشعارات المزاد ====================

  /**
   * تذكير بالمزاد
   */
  scheduleAuctionReminder() {
    node_cron.schedule('0 */6 * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.auctionUpdates': true
      });

      // يمكن إضافة منطق المزاد هنا
      logger.info(`📬 تم التحقق من المزادات لـ ${users.length} مستخدم`);
    });
  }

  // ==================== إشعارات الختمة ====================

  /**
   * تذكير بالختمة القرآنية
   */
  scheduleKhatmaReminder() {
    node_cron.schedule('0 5 * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'khatmaSettings.notify': true,
        'khatmaProgress.currentPage': { $gt: 0 }
      });

      for (const user of users) {
        const progress = user.khatmaProgress?.currentPage || 0;
        const remaining = 114 - progress;

        if (remaining > 0 && remaining <= 5) {
          const message = `📖 <b>تذكير بالختمة</b>

🌟 بقي عليك <b>${remaining} صفحات</b> فقط لإكمال الختمة!

💪 واصل قراءة القرآن
مبروك مقدماً على إتمام الختمة! 🎉`;

          await this.sendNotification(user.userId, message);
        }
      }
    });
  }

  // ==================== إشعارات تحفيزية ====================

  /**
   * إرسال إشعارات تحفيزية
   */
  scheduleMotivational() {
    node_cron.schedule('0 10 * * *', async () => {
      const users = await User.find({
        'notifications.enabled': true,
        'notifications.motivational': true
      });

      const motivationalMessages = [
        { text: '🌟 <b>تذكر:</b> كل يوم فرصة جديدة للتقرب من الله', icon: '🌟' },
        { text: '📖 <b>اقرأ:</b> صفحة واحدة يومياً تغيّر حياتك', icon: '📖' },
        { text: '🤲 <b>دع:</b> الله يسهل أمورك', icon: '🤲' },
        { text: '💪 <b> اصبر:</b> الخير قادم بإذن الله', icon: '💪' },
        { text: '🔥 <b>نجاح:</b> أنت على الطريق الصحيح', icon: '🔥' }
      ];

      for (const user of users.slice(0, 50)) { // Limit to 50 users
        const random = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        await this.sendNotification(user.userId, random.text);
      }
    });
  }

  // ==================== تحديثات المتصدرين ====================

  /**
   * إرسال تحديثات الترتيب
   */
  scheduleLeaderboardUpdates() {
    node_cron.schedule('0 0 * * 0', async () => { // Every Sunday
      const topUsers = await User.find()
        .sort({ xp: -1 })
        .limit(10)
        .select('firstName xp level');

      let message = '🏆 <b>قائمة المتصدرين هذا الأسبوع</b>\n\n';

      topUsers.forEach((user, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index];
        message += `${medal} <b>${user.firstName}</b>: ${user.xp} XP (مستوى ${user.level})\n`;
      });

      message += '\n💪 هل تقدر تدخل قائمة المتصدرين؟';

      await this.broadcastToActiveUsers(message);
    });
  }

  // ==================== إشعار مخصص ====================

  /**
   * إرسال إشعار تهنئة
   */
  async sendCongratulations(userId, type, data) {
    const messages = {
      levelUp: `🎉 <b>تهانينا!</b>\n\nوصلت للمستوى <b>${data.level}</b>! 🎊\n\nواصل بنفسك! 💪`,

      khatmaComplete: '🎊 <b>مبروك!</b>\n\nأتممت قراءة القرآن كاملاً! 📖✨\n\nثوابك عند الله ♥',

      streak: `🔥 <b>سلسلة مميزة!</b>\n\n<code>${data.days}</code> أيام متتالية!\n\nما شاء الله! 🌟`,

      achievement: `🏆 <b>إنجاز جديد!</b>\n\n<code>${data.achievement}</code>\n\nتفخر بك! 💪`,

      birthday: '🎂 <b>كل عام وأنت بخير!</b>\n\nannée nouvelles! 🌹\n\nأسعد الله أيامك!'
    };

    const message = messages[type] || '📢 إشعار جديد!';
    return await this.sendNotification(userId, message);
  }

  /**
   * إرسال إشعار تحذير
   */
  async sendWarning(userId, type, data) {
    const messages = {
      lowCoins: `⚠️ <b>انتبه!</b>\n\nرصيدك <code>${data.coins}</code> عملة فقط!\n\n🎮 العب لكسب المزيد!`,

      streakBreak: `😔 <b>للأسف!</b>\n\nانقطعت سلسلتك بعد <code>${data.days}</code> أيام!\n\n💪 ابدأ من جديد!`,

      rateLimit: '🚫 <b>انتبه!</b>\n\nتجاوزت الحد المسموح!\n\n⏰ انتظر قليلاً ثم حاول مرة أخرى'
    };

    const message = messages[type] || '⚠️ تنبيه!';
    return await this.sendNotification(userId, message);
  }
}

module.exports = AdvancedNotificationSystem;
