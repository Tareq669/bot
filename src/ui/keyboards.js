"const Markup = require('telegraf/markup');

class UIManager {
  // Check if user is owner
  static isOwner(userId) {
    const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(id => parseInt(id.trim()));
    return ownerIds.includes(userId);
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

  // Keyboard for specific notification type menu
  static notificationTypeMenuKeyboard(type) {
    const displayNames = {
      'adhkar': 'إشعارات الأذكار',
      'prayer': 'إشعارات الصلاة',
      'games': 'إشعارات الألعاب',
      'rewards': 'إشعارات المكافآت',
      'events': 'انتبه للحدث',
      'stats': 'إحصائياتي',
      'auction': 'إشعارات المزاد'
    };
    
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🔔 تفعيل ${displayNames[type]}`, `notify:toggle:${type}:true`)
      ],
      [
        Markup.button.callback(`🔕 تعطيل ${displayNames[type]}`, `notify:toggle:${type}:false`)
      ],
      [
        Markup.button.callback('⚙️ إعدادات الوقت', `notify:time:${type}`)
      ],
      [
        Markup.button.callback('🔙 رجوع', 'notify:main')
      ]
    ]);
  }

  // Keyboard for toggling a specific notification type
  static notificationToggleKeyboard(type, enabled) {
    const displayNames = {
      'adhkar': 'إشعارات الأذكار',
      'prayer': 'إشعارات الصلاة',
      'games': 'إشعارات الألعاب',
      'rewards': 'إشعارات المكافآت',
      'events': 'انتبه للحدث',
      'stats': 'إحصائياتي',
      'auction': 'إشعارات المزاد'
    };
    
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          enabled ? `🔔 ${displayNames[type]} مفعل` : `🔕 ${displayNames[type]} معطل`,
          `toggleNotify:${type}`
        )
      ],
      [
        Markup.button.callback('🔙 رجوع', `notify:menu:${type}`)
      ]
    ]);
  }
}

module.exports = UIManager;"