/**
 * قوائم لوحة المفاتيح لإدارة المجموعات
 * Group management keyboard layouts
 */

/**
 * القائمة الرئيسية للمجموعة
 */
function getMainGroupKeyboard() {
  return {
    keyboard: [
      [
        { text: '👥_members', callback_data: 'group_members' },
        { text: '📊_stats', callback_data: 'group_stats' }
      ],
      [
        { text: '⚙️_settings', callback_data: 'group_settings' },
        { text: '🛡️_protection', callback_data: 'group_protection' }
      ],
      [
        { text: '📋_rules', callback_data: 'group_rules' },
        { text: '🔧_admin', callback_data: 'group_admin' }
      ],
      [
        { text: '⭐_reputation', callback_data: 'group_reputation' },
        { text: '🏆_leaderboard', callback_data: 'group_leaderboard' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

/**
 * لوحة إعدادات الحماية
 */
function getProtectionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔗_فلترة_الروابط', callback_data: 'prot_link_toggle' },
        { text: '🚫_منع_السبام', callback_data: 'prot_spam_toggle' }
      ],
      [
        { text: '🌊_مضاد_Flood', callback_data: 'prot_flood_toggle' },
        { text: '🤖_حماية_الحسابات', callback_data: 'prot_fake_toggle' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات الحماية - مفصلة
 */
function getProtectionSettingsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ مفعل', callback_data: 'prot_enable' },
        { text: '❌ معطل', callback_data: 'prot_disable' }
      ],
      [
        { text: '🗑️ حذف', callback_data: 'prot_delete' },
        { text: '⚠️ تحذير', callback_data: 'prot_warn' }
      ],
      [
        { text: '⏰ كتم مؤقت', callback_data: 'prot_mute' },
        { text: '🚫 طرد', callback_data: 'prot_kick' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_protection' }
      ]
    ]
  };
}

/**
 * لوحة الإعدادات
 */
function getSettingsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👋_ترحيب', callback_data: 'settings_welcome' },
        { text: '👋_وداع', callback_data: 'settings_farewell' }
      ],
      [
        { text: '📝_قواعد', callback_data: 'settings_rules' },
        { text: '📊_إحصائيات', callback_data: 'settings_stats' }
      ],
      [
        { text: '⚙️_أتمتة', callback_data: 'settings_automation' },
        { text: '⭐_سمعة', callback_data: 'settings_reputation' }
      ],
      [
        { text: '🖼️_صورة_المجموعة', callback_data: 'settings_photo' },
        { text: '📝_وصف_المجموعة', callback_data: 'settings_description' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات الترحيب
 */
function getWelcomeSettingsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅_تفعيل_الترحيب', callback_data: 'welcome_on' },
        { text: '❌_تعطيل_الترحيب', callback_data: 'welcome_off' }
      ],
      [
        { text: '✏️_تعديل_الرسالة', callback_data: 'welcome_edit' },
        { text: '🖼️_إضافة_صورة', callback_data: 'welcome_photo' }
      ],
      [
        { text: '📎_مع_ملف', callback_data: 'welcome_with_file' },
        { text: '🔗_مع_رابط', callback_data: 'welcome_with_link' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_settings' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات الوداع
 */
function getFarewellSettingsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅_تفعيل_الوداع', callback_data: 'farewell_on' },
        { text: '❌_تعطيل_الوداع', callback_data: 'farewell_off' }
      ],
      [
        { text: '✏️_تعديل_الرسالة', callback_data: 'farewell_edit' },
        { text: '🖼️_إضافة_صورة', callback_data: 'farewell_photo' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_settings' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات القواعد
 */
function getRulesKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📖_عرض_القواعد', callback_data: 'rules_show' },
        { text: '➕_إضافة_قاعدة', callback_data: 'rules_add' }
      ],
      [
        { text: '✏️_تعديل_قاعدة', callback_data: 'rules_edit' },
        { text: '🗑️_حذف_قاعدة', callback_data: 'rules_delete' }
      ],
      [
        { text: '🧹_حذف_الكل', callback_data: 'rules_clear' },
        { text: '📤_تصدير', callback_data: 'rules_export' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_settings' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات الأتمتة
 */
function getAutomationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔄_الردود_التلقائية', callback_data: 'auto_reply' },
        { text: '😊_الردود_المشاعرية', callback_data: 'auto_emotion' }
      ],
      [
        { text: '⏰_الرسائل_المجدولة', callback_data: 'auto_scheduled' },
        { text: '⏱️_المؤقتات', callback_data: 'auto_timers' }
      ],
      [
        { text: '🎯_التفاعل_التلقائي', callback_data: 'auto_interaction' },
        { text: '🤖_الذكاء_الاصطناعي', callback_data: 'auto_ai' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_settings' }
      ]
    ]
  };
}

/**
 * لوحة إدارة الأدمنز
 */
function getAdminKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👮_قائمة_الأدمنز', callback_data: 'admin_list' },
        { text: '➕_رفع_أدمن', callback_data: 'admin_promote' }
      ],
      [
        { text: '➖_تنزيل_أدمن', callback_data: 'admin_demote' },
        { text: '🛡️_المشرفين', callback_data: 'admin_mods' }
      ],
      [
        { text: '⭐_اعطاء_نقاط', callback_data: 'admin_give_points' },
        { text: '💰_خصم_نقاط', callback_data: 'admin_take_points' }
      ],
      [
        { text: '⚠️_تحذير', callback_data: 'admin_warn' },
        { text: '🚫_طرد', callback_data: 'admin_kick' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة إدارة أعضاء المجموعة
 */
function getMembersKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👥_عرض_الأعضاء', callback_data: 'members_list' },
        { text: '🔍_بحث', callback_data: 'members_search' }
      ],
      [
        { text: '🆕_الأعضاء_الجدد', callback_data: 'members_new' },
        { text: '💤_الأعضاء_الغير_نشطين', callback_data: 'members_inactive' }
      ],
      [
        { text: '⭐_الأعضاء_المتميزين', callback_data: 'members_vip' },
        { text: '⚠️_الأعضاء_المحظورين', callback_data: 'members_banned' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة الإحصائيات
 */
function getStatsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊_اليوم', callback_data: 'stats_today' },
        { text: '📅_الأسبوع', callback_data: 'stats_week' }
      ],
      [
        { text: '📆_الشهر', callback_data: 'stats_month' },
        { text: '📈_كل_الوقت', callback_data: 'stats_all' }
      ],
      [
        { text: '🏆_الترتيب', callback_data: 'stats_ranking' },
        { text: '📉_رسائل_الأعضاء', callback_data: 'stats_messages' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة السمعة
 */
function getReputationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '⭐_إضافة_نجمة', callback_data: 'rep_add_star' },
        { text: '⭐_إزالة_نجمة', callback_data: 'rep_remove_star' }
      ],
      [
        { text: '👍_إضافة_إعجاب', callback_data: 'rep_like' },
        { text: '👎_إضافة_عداء', callback_data: 'rep_dislike' }
      ],
      [
        { text: '🏅_عرض_الملف', callback_data: 'rep_profile' },
        { text: '📜_سجل_السمعة', callback_data: 'rep_history' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة العودة
 */
function getBackKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_main' }
      ]
    ]
  };
}

/**
 * لوحة التأكيد
 */
function getConfirmKeyboard(action) {
  return {
    inline_keyboard: [
      [
        { text: '✅_تأكيد', callback_data: `confirm_${action}` },
        { text: '❌_إلغاء', callback_data: `cancel_${action}` }
      ]
    ]
  };
}

/**
 * لوحة الأوامر السريعة للمشرف
 */
function getModQuickActionsKeyboard() {
  return {
    keyboard: [
      [
        { text: '🚫_طرد', callback_data: 'mod_kick' },
        { text: '⏰_كتم', callback_data: 'mod_mute' }
      ],
      [
        { text: '⚠️_تحذير', callback_data: 'mod_warn' },
        { text: '🔒_حظر', callback_data: 'mod_ban' }
      ],
      [
        { text: '🗑️_حذف_الرسالة', callback_data: 'mod_delete' },
        { text: '📌_تثبيت', callback_data: 'mod_pin' }
      ]
    ],
    resize_keyboard: true
  };
}

/**
 * لوحة الملف الشخصي للعضو
 */
function getMemberProfileKeyboard(userId) {
  return {
    inline_keyboard: [
      [
        { text: '⭐_نقاطي', callback_data: `profile_points_${userId}` },
        { text: '📊_إحصائياتي', callback_data: `profile_stats_${userId}` }
      ],
      [
        { text: '🏆_ترتيبي', callback_data: `profile_rank_${userId}` },
        { text: '⚠️_تحذيراتي', callback_data: `profile_warns_${userId}` }
      ],
      [
        { text: '✏️_تعديل_ملفي', callback_data: `profile_edit_${userId}` }
      ]
    ]
  };
}

/**
 * لوحة لوحة مفاتيح الأرقام للترقيم
 */
function getPaginationKeyboard(currentPage, totalPages, prefix) {
  const buttons = [];

  if (currentPage > 1) {
    buttons.push({ text: '⬅️', callback_data: `${prefix}_page_${currentPage - 1}` });
  }

  buttons.push({ text: `${currentPage}/${totalPages}`, callback_data: 'page_info' });

  if (currentPage < totalPages) {
    buttons.push({ text: '➡️', callback_data: `${prefix}_page_${currentPage + 1}` });
  }

  return {
    inline_keyboard: [buttons]
  };
}

/**
 * لوحة خيارات التصفية
 */
function getFilterKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👤_الكل', callback_data: 'filter_all' },
        { text: '👮_الأدمنز', callback_data: 'filter_admins' }
      ],
      [
        { text: '⭐_المتميزين', callback_data: 'filter_vip' },
        { text: '⚠️_المحظورين', callback_data: 'filter_banned' }
      ],
      [
        { text: '🆕_الجدد', callback_data: 'filter_new' },
        { text: '💤_الغير_نشطين', callback_data: 'filter_inactive' }
      ]
    ]
  };
}

/**
 * لوحة خيارات الترتيب
 */
function getSortKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊_النقاط', callback_data: 'sort_points' },
        { text: '💬_الرسائل', callback_data: 'sort_messages' }
      ],
      [
        { text: '🕐_النشاط', callback_data: 'sort_activity' },
        { text: '📅_تاريخ_الانضمام', callback_data: 'sort_joined' }
      ],
      [
        { text: '⭐_السمعة', callback_data: 'sort_reputation' }
      ]
    ]
  };
}

/**
 * لوحة إعدادات اللغة
 */
function getLanguageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇸🇦_العربية', callback_data: 'lang_ar' },
        { text: '🇬🇧_English', callback_data: 'lang_en' }
      ],
      [
        { text: '🇹🇷_Türkçe', callback_data: 'lang_tr' },
        { text: '🇫🇷_Français', callback_data: 'lang_fr' }
      ]
    ]
  };
}

/**
 * لوحة الإشعارات
 */
function getNotificationsKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔔_جميع_الإشعارات', callback_data: 'notif_all' },
        { text: '🔕_إيقاف_كل', callback_data: 'notif_none' }
      ],
      [
        { text: '👋_ترحيب', callback_data: 'notif_welcome' },
        { text: '👋_وداع', callback_data: 'notif_farewell' }
      ],
      [
        { text: '⚠️_تحذيرات', callback_data: 'notif_warns' },
        { text: '🏆_ترتيب', callback_data: 'notif_ranking' }
      ],
      [
        { text: '⬅️_رجوع', callback_data: 'back_to_settings' }
      ]
    ]
  };
}

/**
 * لوحة خيارات التفاعل
 */
function getInteractionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👍_إعجاب', callback_data: 'interact_like' },
        { text: '👎_عداء', callback_data: 'interact_dislike' }
      ],
      [
        { text: '😂_ضحك', callback_data: 'interact_laugh' },
        { text: '😮_دهشة', callback_data: 'interact_shock' }
      ],
      [
        { text: '😢_حزن', callback_data: 'interact_sad' },
        { text: '😡_غضب', callback_data: 'interact_angry' }
      ],
      [
        { text: '➡️_إضافة_تفاعل', callback_data: 'interact_add' }
      ]
    ]
  };
}

/**
 * لوحة لوحة مفاتيح لوحة معلومات المجموعة
 */
function getGroupInfoKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👥_عدد_الأعضاء', callback_data: 'info_members' },
        { text: '💬_عدد_الرسائل', callback_data: 'info_messages' }
      ],
      [
        { text: '📅_تاريخ_ الإنشاء', callback_data: 'info_created' },
        { text: '🔗_الرابط', callback_data: 'info_link' }
      ],
      [
        { text: '👮_الأدمنز', callback_data: 'info_admins' },
        { text: '📛_الصورة', callback_data: 'info_photo' }
      ],
      [
        { text: '✏️_تعديل', callback_data: 'info_edit' },
        { text: '📤_مشاركة', callback_data: 'info_share' }
      ]
    ]
  };
}

module.exports = {
  getMainGroupKeyboard,
  getProtectionKeyboard,
  getProtectionSettingsKeyboard,
  getSettingsKeyboard,
  getWelcomeSettingsKeyboard,
  getFarewellSettingsKeyboard,
  getRulesKeyboard,
  getAutomationKeyboard,
  getAdminKeyboard,
  getMembersKeyboard,
  getStatsKeyboard,
  getReputationKeyboard,
  getBackKeyboard,
  getConfirmKeyboard,
  getModQuickActionsKeyboard,
  getMemberProfileKeyboard,
  getPaginationKeyboard,
  getFilterKeyboard,
  getSortKeyboard,
  getLanguageKeyboard,
  getNotificationsKeyboard,
  getInteractionKeyboard,
  getGroupInfoKeyboard
};
