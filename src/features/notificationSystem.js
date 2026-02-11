/**
 * Smart Notification System
 * إرسال إشعارات ذكية للمستخدمين
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');
const node_cron = require('node-cron');

class NotificationSystem {
  constructor(bot) {
    this.bot = bot;
    this.scheduledTasks = new Map();
  }

  /**
   * إرسال إشعار للمستخدم
   */
  async sendNotification(userId, message, options = {}) {
    try {
      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        ...options
      });

      // تسجيل الإشعار في قاعدة البيانات
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            message,
            timestamp: new Date(),
            read: false
          }
        }
      });

      logger.info(`✅ إشعار مرسل للمستخدم ${userId}`);
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الإشعار: ${error.message}`);
    }
  }

  /**
   * إرسال إشعارات يومية الأذكار
   */
  scheduleDailyAdhkarNotifications() {
    // الساعة 7 صباحاً كل يوم
    node_cron.schedule('0 7 * * *', async () => {
      const users = await User.find({ 'notifications.adhkarReminder': true });

      const message = '📿 <b>حان وقت الأذكار الصباحية</b>\n\nكل صباح جميل معك! 🌅\n\n/adhkar';

      for (const user of users) {
        await this.sendNotification(user._id, message);
      }

      logger.info('📬 تم إرسال تذكيرات الأذكار الصباحية');
    });

    // الساعة 7 مساءً كل يوم
    node_cron.schedule('0 19 * * *', async () => {
      const users = await User.find({ 'notifications.adhkarReminder': true });

      const message = '📿 <b>حان وقت أذكار المساء</b>\n\nمساء الخير! 🌙\n\n/adhkar';

      for (const user of users) {
        await this.sendNotification(user._id, message);
      }

      logger.info('📬 تم إرسال تذكيرات الأذكار المسائية');
    });
  }

  /**
   * إشعارات أوقات الصلاة
   */
  schedulePrayerTimeNotifications() {
    // سيتم حسابها حسب موقع المستخدم (اختياري متقدم)
    node_cron.schedule('0 */4 * * *', async () => {
      const users = await User.find({ 'notifications.prayerReminder': true });

      const message = '🕌 <b>تذكير الصلاة</b>\n\nحافظ على الصلاة في أوقاتها\n\n/adhkar';

      for (const user of users) {
        await this.sendNotification(user._id, message);
      }
    });
  }

  /**
   * إشعارات الأحداث والمسابقات
   */
  async scheduleEventNotifications(eventId, eventDate, eventName) {
    const timeUntilEvent = new Date(eventDate) - new Date();

    if (timeUntilEvent > 0) {
      setTimeout(async () => {
        const users = await User.find({ 'notifications.eventReminder': true });

        const message = `🎉 <b>${eventName}</b>\n\nبدأت الآن! انضم إلينا\n\n/events`;

        for (const user of users) {
          await this.sendNotification(user._id, message);
        }
      }, timeUntilEvent - 3600000); // ساعة قبل الحدث
    }
  }

  /**
   * إشعارات تحفيزية عشوائية
   */
  scheduleMotivationalMessages() {
    node_cron.schedule('0 12 * * *', async () => {
      const messages = [
        '💪 استمر في جهودك، أنت تحرز تقدماً!',
        '🌟 كل يوم فرصة جديدة للتحسن',
        '✨ أنت أقوى مما تعتقد!',
        '🎯 ركز على أهدافك، ستحققها قريباً',
        '📈 تقدمك اليوم سيكون نجاحك غداً'
      ];

      const users = await User.find({ 'notifications.motivational': true });
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];

      for (const user of users) {
        await this.sendNotification(user._id, randomMsg);
      }
    });
  }

  /**
   * الحصول على تفضيلات الإشعارات
   */
  async getNotificationPreferences(userId) {
    const user = await User.findById(userId);
    return {
      adhkarReminder: user.notifications?.adhkarReminder || false,
      prayerReminder: user.notifications?.prayerReminder || false,
      eventReminder: user.notifications?.eventReminder || false,
      motivational: user.notifications?.motivational || false
    };
  }

  /**
   * تحديث تفضيلات الإشعارات
   */
  async updateNotificationPreferences(userId, preferences) {
    await User.findByIdAndUpdate(userId, {
      'notifications': preferences
    });
  }

  /**
   * تنسيق الإشعارات للعرض
   */
  formatNotificationsList(notifications) {
    if (notifications.length === 0) {
      return '📭 لا توجد إشعارات حالياً';
    }

    let text = '📬 <b>الإشعارات</b>\n\n';

    notifications.forEach((notif, index) => {
      const time = new Date(notif.timestamp).toLocaleDateString('ar');
      const status = notif.read ? '✅' : '🆕';
      text += `${status} ${notif.message}\n<i>${time}</i>\n\n`;
    });

    return text;
  }

  /**
   * تمكين النظام
   */
  initialize() {
    logger.info('🔔 تم تفعيل نظام الإشعارات الذكية');
    this.scheduleDailyAdhkarNotifications();
    this.schedulePrayerTimeNotifications();
    this.scheduleMotivationalMessages();
  }
}

module.exports = NotificationSystem;
