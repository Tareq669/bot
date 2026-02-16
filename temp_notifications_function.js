const { Markup } = require('telegraf');

class NotificationsMenu {
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

// تصدير الكلاس إذا كنت تحتاجينه في ملفات أخرى
module.exports = { NotificationsMenu };