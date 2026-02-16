const Markup = require('telegraf/markup');

class UIManager {
  // Check if user is owner
  static isOwner(userId) {
    const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(id => parseInt(id.trim()));
    return ownerIds.includes(userId);
  }

  // Owner Reply Keyboard
  static ownerReplyKeyboard() {
    return Markup.keyboard([
      ['إحصائيات البوت', 'إدارة المستخدمين'],
      ['إدارة الإقتصاد', 'إدارة البيانات'],
      ['إعدادات المالك', 'تحديث البوت'],
      ['الرجوع للقائمة الرئيسية', 'إغلاق لوحة التحكم']
    ]);
  }

  // Main Menu Keyboard - Reply Keyboard
  static mainReplyKeyboard(userId = null) {
    if (userId && this.isOwner(userId)) {
      return this.ownerReplyKeyboard();
    }

    return Markup.keyboard([
      ['القُرآن الكريم', 'الأذكار'],
      ['الألعاب', 'المُكافآت'],
      ['الملف الشخصي', 'الإعدادات']
    ]);
  }

  // Notifications Settings
  static notificationsMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('إشعارات الأذكار', 'notify:menu:adhkar')
      ],
      [
        Markup.button.callback('إشعارات الصلاة', 'notify:menu:prayer')
      ],
      [
        Markup.button.callback('إشعارات الألعاب', 'notify:menu:games')
      ],
      [
        Markup.button.callback('إشعارات المكافآت', 'notify:menu:rewards')
      ],
      [
        Markup.button.callback('انتبه للحدث', 'notify:menu:events')
      ],
      [
        Markup.button.callback('إحصائياتي', 'notify:menu:stats')
      ],
      [
        Markup.button.callback('إشعارات المزاد', 'notify:menu:auction')
      ],
      [
        Markup.button.callback('رجوع', 'menu:main')
      ]
    ]);
  }
}

module.exports = UIManager;