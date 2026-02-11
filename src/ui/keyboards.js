const Markup = require('telegraf/markup');

class UIManager {
  // Check if user is owner
  static isOwner(userId) {
    const ownerIds = (process.env.BOT_OWNERS || '').split(',').filter(Boolean).map(id => parseInt(id.trim()));
    return ownerIds.includes(userId);
  }

  // Owner Reply Keyboard - للمالك فقط
  static ownerReplyKeyboard() {
    return Markup.keyboard([
      ['🕌 الختمة', '📿 الأذكار'],
      ['📖 القرآن', '💭 الاقتباسات'],
      ['🎮 الألعاب', '💰 الاقتصاد'],
      ['👤 حسابي', '🏆 المتصدرين'],
      ['✨ الميزات', '📚 المكتبة'],
      ['👑 لوحة المالك', '⚙️ الإعدادات'],
      ['📊 إحصائيات', '🎁 المكافآت'],
      ['❌ إغلق']
    ]).resize();
  }

  // Main Menu Keyboard - Reply Keyboard
  static mainReplyKeyboard(userId = null) {
    // إذا كان المستخدم مالك، أعطه لوحة مفاتيح خاصة
    if (userId && this.isOwner(userId)) {
      return this.ownerReplyKeyboard();
    }

    return Markup.keyboard([
      ['🕌 الختمة', '📿 الأذكار'],
      ['📖 القرآن', '💭 الاقتباسات'],
      ['✍️ الشعر', '🎮 الألعاب'],
      ['💰 الاقتصاد', '👤 حسابي'],
      ['🏆 المتصدرين', '⚙️ الإعدادات'],
      ['✨ الميزات', '📚 المكتبة'],
      ['🛍️ المتجر', '💸 التحويلات والتبرعات'],
      ['🔔 الإشعارات الذكية', '🌍 إدارة اللغات'],
      ['📁 النسخ الاحتياطية', '⚡ التخزين المؤقت'],
      ['🛡️ حماية من الإساءة', '📊 إحصائيات'],
      ['🎁 المكافآت', '❌ إغلق']
    ]).resize();
  }

  // Main Menu Keyboard - Smart UI
  static mainMenuKeyboard() {
    return Markup.inlineKeyboard([
      // الصف الأول: المحتوى الإسلامي
      [
        Markup.button.callback('🕌 الختمة', 'menu:khatma'),
        Markup.button.callback('📿 الأذكار', 'menu:adhkar')
      ],
      // الصف الثاني: المحتوى الثقافي
      [
        Markup.button.callback('📖 القرآن', 'menu:quran'),
        Markup.button.callback('💭 الاقتباسات', 'menu:quotes')
      ],
      // الصف الثالث: الترفيه
      [
        Markup.button.callback('✍️ الشعر', 'menu:poetry'),
        Markup.button.callback('🎮 الألعاب', 'menu:games')
      ],
      // الصف الرابع: الاقتصاد والملف
      [
        Markup.button.callback('💰 الاقتصاد', 'menu:economy'),
        Markup.button.callback('👤 حسابي', 'menu:profile')
      ],
      // الصف الخامس: الميزات المتقدمة
      [
        Markup.button.callback('✨ الميزات', 'menu:features'),
        Markup.button.callback('📚 المكتبة', 'menu:library')
      ],
      // الصف السادس: المجتمع
      [
        Markup.button.callback('🏆 المتصدرين', 'menu:leaderboard'),
        Markup.button.callback('⚙️ الإعدادات', 'menu:settings')
      ],
      // الصف السابع: الميزات الجديدة
      [
        Markup.button.callback('🛍️ المتجر', 'menu:shop'),
        Markup.button.callback('💸 التحويلات والتبرعات', 'menu:transfers')
      ],
      // الصف الثامن: الإشعارات واللغات
      [
        Markup.button.callback('🔔 الإشعارات الذكية', 'menu:smartnotifications'),
        Markup.button.callback('🌍 إدارة اللغات', 'menu:languages')
      ],
      // الصف التاسع: النسخ الاحتياطية والتخزين المؤقت
      [
        Markup.button.callback('📁 النسخ الاحتياطية', 'menu:backups'),
        Markup.button.callback('⚡ التخزين المؤقت', 'menu:cache')
      ],
      // الصف العاشر: الحماية والمميزات الإضافية
      [
        Markup.button.callback('🛡️ حماية من الإساءة', 'menu:protection'),
        Markup.button.callback('✨ الميزات الجديدة', 'menu:newfeatures')
      ],
      // الصف الحادي عشر: المميزات والخيارات الإضافية
      [
        Markup.button.callback('💎 المميزات', 'menu:premiumfeatures'),
        Markup.button.callback('📊 إحصائيات', 'stats:view')
      ],
      // الصف الثاني عشر: المكافآت والإغلاق
      [
        Markup.button.callback('🎁 المكافآت', 'rewards:daily'),
        Markup.button.callback('❌ إغلق', 'close')
      ]
    ]);
  }

  // Games Menu
  static gamesMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🪨 حجر ورق مقص', 'game:rps'),
        Markup.button.callback('🔢 التخمين', 'game:guess')
      ],
      [
        Markup.button.callback('🍀 لعبة الحظ', 'game:luck'),
        Markup.button.callback('🧠 أسئلة ثقافية', 'game:quiz')
      ],
      [
        Markup.button.callback('🎲 رول النرد', 'game:dice'),
        Markup.button.callback('🎯 تحديات عشوائية', 'game:challenges')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Economy Menu
  static economyMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 الرصيد', 'eco:balance'),
        Markup.button.callback('💸 تحويل', 'eco:transfer')
      ],
      [
        Markup.button.callback('🏪 المتجر', 'eco:shop'),
        Markup.button.callback('📦 الحقيبة', 'eco:inventory')
      ],
      [
        Markup.button.callback('💎 المزاد', 'eco:auction'),
        Markup.button.callback('📊 الإحصائيات', 'eco:stats')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Profile Menu
  static profileMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📈 المعلومات', 'profile:info'),
        Markup.button.callback('🏅 الشارات', 'profile:badges')
      ],
      [
        Markup.button.callback('🎮 الإحصائيات', 'profile:stats'),
        Markup.button.callback('🎁 الهدايا', 'profile:gifts')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Settings Menu (Admin only)
  static settingsMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔧 إعدادات عامة', 'settings:general'),
        Markup.button.callback('👥 إدارة المستخدمين', 'settings:users')
      ],
      [
        Markup.button.callback('📝 إدارة المحتوى', 'settings:content'),
        Markup.button.callback('🛡️ الأمان', 'settings:security')
      ],
      [
        Markup.button.callback('📊 الإحصائيات', 'settings:stats'),
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  static userSettingsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🕌 إعدادات الختمة', 'khatma:settings')
      ],
      [
        Markup.button.callback('🔔 الإشعارات', 'settings:notifications'),
        Markup.button.callback('🌐 اللغة', 'settings:language')
      ],
      [
        Markup.button.callback('👤 الملف الشخصي', 'menu:profile'),
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Pagination Keyboard
  static paginationKeyboard(page, totalPages, baseCallback) {
    const buttons = [];

    if (page > 1) {
      buttons.push(Markup.button.callback('⬅️ السابق', `${baseCallback}:${page - 1}`));
    }

    buttons.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));

    if (page < totalPages) {
      buttons.push(Markup.button.callback('التالي ➡️', `${baseCallback}:${page + 1}`));
    }

    return Markup.inlineKeyboard([buttons]);
  }

  // Confirmation Keyboard
  static confirmationKeyboard(yesCallback, noCallback) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ نعم', yesCallback),
        Markup.button.callback('❌ لا', noCallback)
      ]
    ]);
  }

  // Close Button
  static closeButton() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('❌ إغلاق', 'close')]
    ]);
  }

  // Back Button
  static backButton(backCallback = 'menu:main') {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ رجوع', backCallback)]
    ]);
  }

  // Owner Control Panel - لوحة تحكم المالك
  static ownerControlPanel() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 إحصائيات البوت', 'owner:stats'),
        Markup.button.callback('👥 كل المستخدمين', 'owner:users')
      ],
      [
        Markup.button.callback('📢 بث رسالة', 'owner:broadcast'),
        Markup.button.callback('🗑️ حذف البيانات', 'owner:cleanup')
      ],
      [
        Markup.button.callback('🚫 المحظورون', 'owner:banned'),
        Markup.button.callback('💰 إدارة الاقتصاد', 'owner:economy')
      ],
      [
        Markup.button.callback('📝 السجلات', 'owner:logs'),
        Markup.button.callback('🔧 الصيانة', 'owner:maintenance')
      ],
      [
        Markup.button.callback('🗄️ قاعدة البيانات', 'owner:database'),
        Markup.button.callback('⚡ الأنظمة', 'owner:systems')
      ],
      [
        Markup.button.callback('🎮 إدارة الألعاب', 'owner:games'),
        Markup.button.callback('📚 إدارة المحتوى', 'owner:content')
      ],
      [
        Markup.button.callback('🔄 إعادة التشغيل', 'owner:restart'),
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Owner Users Management
  static ownerUsersManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('👁️ عرض الكل', 'owner:viewall'),
        Markup.button.callback('🔍 بحث', 'owner:search')
      ],
      [
        Markup.button.callback('🚫 حظر مستخدم', 'owner:ban'),
        Markup.button.callback('✅ إلغاء حظر', 'owner:unban')
      ],
      [
        Markup.button.callback('💎 إعطاء عملات', 'owner:givecoins'),
        Markup.button.callback('⭐ إعطاء XP', 'owner:givexp')
      ],
      [
        Markup.button.callback('🔄 إعادة تعيين', 'owner:reset'),
        Markup.button.callback('🗑️ حذف مستخدم', 'owner:delete')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'owner:panel')
      ]
    ]);
  }

  // Owner Economy Management
  static ownerEconomyManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 أغنى المستخدمين', 'owner:richest'),
        Markup.button.callback('📊 إحصائيات', 'owner:ecostats')
      ],
      [
        Markup.button.callback('🎁 مكافأة للجميع', 'owner:rewardall'),
        Markup.button.callback('💸 خصم من الكل', 'owner:taxall')
      ],
      [
        Markup.button.callback('🛒 إدارة المتجر', 'owner:shop'),
        Markup.button.callback('📦 العناصر', 'owner:items')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'owner:panel')
      ]
    ]);
  }

  // Owner Database Management
  static ownerDatabaseManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 معلومات DB', 'owner:dbinfo'),
        Markup.button.callback('💾 نسخ احتياطي', 'owner:backup')
      ],
      [
        Markup.button.callback('🔄 استرجاع', 'owner:restore'),
        Markup.button.callback('🗑️ تنظيف', 'owner:dbclean')
      ],
      [
        Markup.button.callback('⚡ الأداء', 'owner:performance'),
        Markup.button.callback('🔍 استعلام', 'owner:query')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'owner:panel')
      ]
    ]);
  }

  // ==================== NEW FEATURES KEYBOARDS ====================

  // Advanced Features Menu
  static advancedFeaturesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🎯 الأهداف', 'features:goals'),
        Markup.button.callback('💝 الصدقات', 'features:charity')
      ],
      [
        Markup.button.callback('📖 الحفظ', 'features:memorization'),
        Markup.button.callback('🤲 الأدعية', 'features:dua')
      ],
      [
        Markup.button.callback('📢 الإحالات', 'features:referral'),
        Markup.button.callback('🏆 الأحداث', 'features:events')
      ],
      [
        Markup.button.callback('🎁 المكافآت', 'features:rewards'),
        Markup.button.callback('📚 المكتبة', 'features:library')
      ],
      [
        Markup.button.callback('👥 الفرق', 'features:teams'),
        Markup.button.callback('📊 الإحصائيات', 'features:stats')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Islamic Content Keyboard
  static islamicContentKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📖 تفسير', 'library:tafsir'),
        Markup.button.callback('📿 أحاديث', 'library:hadith')
      ],
      [
        Markup.button.callback('📚 فقه', 'library:fiqh'),
        Markup.button.callback('📕 قصص قرآنية', 'library:stories')
      ],
      [
        Markup.button.callback('👤 الصحابة', 'library:sahabi'),
        Markup.button.callback('🤲 أوراد', 'library:awrad')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Charity Types Keyboard
  static charityTypesKeyboard() {
    const CharityTracker = require('../features/charityTracker');
    const types = CharityTracker.getCharityTypes();

    const buttons = types.map(t =>
      Markup.button.callback(`${t.emoji} ${t.type}`, `charity:add:${t.type}`)
    );

    // Split buttons into rows of 2
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('⬅️ رجوع', 'menu:main')]);

    return Markup.inlineKeyboard(keyboard);
  }

  // Rewards Buttons
  static rewardsButtonsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🎁 يومية', 'reward:daily'),
        Markup.button.callback('🎰 العجلة', 'reward:wheel')
      ],
      [
        Markup.button.callback('📦 بسيط', 'reward:loot:basic'),
        Markup.button.callback('🎁 فضي', 'reward:loot:silver')
      ],
      [
        Markup.button.callback('💎 ذهبي', 'reward:loot:gold'),
        Markup.button.callback('👑 أسطوري', 'reward:loot:legendary')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Dua Collections Keyboard
  static duaCollectionsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🌅 الصباح', 'dua:morning'),
        Markup.button.callback('🌙 المساء', 'dua:evening')
      ],
      [
        Markup.button.callback('🛡️ حماية', 'dua:protection'),
        Markup.button.callback('🤲 مغفرة', 'dua:forgiveness')
      ],
      [
        Markup.button.callback('💰 رزق', 'dua:sustenance'),
        Markup.button.callback('😴 نوم', 'dua:sleep')
      ],
      [
        Markup.button.callback('🍽️ طعام', 'dua:food'),
        Markup.button.callback('✈️ سفر', 'dua:travel')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Goals Templates Keyboard
  static goalsTemplatesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📖 ختمة', 'goal:khatma'),
        Markup.button.callback('📿 أذكار يومية', 'goal:adhkar')
      ],
      [
        Markup.button.callback('📄 صفحات قرآن', 'goal:pages'),
        Markup.button.callback('🤲 صلوات', 'goal:prayers')
      ],
      [
        Markup.button.callback('🎮 ألعاب', 'goal:games'),
        Markup.button.callback('💝 صدقات', 'goal:charity')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Memorization Actions Keyboard
  static memorizationActionsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إضافة آيات', 'mem:add'),
        Markup.button.callback('📝 مراجعة', 'mem:review')
      ],
      [
        Markup.button.callback('📊 إحصائيات', 'mem:stats'),
        Markup.button.callback('💡 نصائح', 'mem:tips')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Teams Management Keyboard
  static teamsManagementKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إنشاء فريق', 'team:create'),
        Markup.button.callback('👥 الانضمام', 'team:join')
      ],
      [
        Markup.button.callback('📊 لوحة المتصدرين', 'team:leaderboard'),
        Markup.button.callback('ℹ️ معلومات فريقي', 'team:info')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // ==================== جديد: المميزات الجديدة ====================

  // New Features Menu - قائمة المميزات الجديدة
  static newFeaturesMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🎮 الألعاب القرآنية', 'new:qgames'),
        Markup.button.callback('🛍️ المتجر', 'new:shop')
      ],
      [
        Markup.button.callback('💸 التحويلات المالية', 'new:transfer'),
        Markup.button.callback('💝 التبرعات', 'new:donate')
      ],
      [
        Markup.button.callback('🔔 الإشعارات الذكية', 'new:notifications'),
        Markup.button.callback('🌍 إدارة اللغات', 'new:language')
      ],
      [
        Markup.button.callback('📁 النسخ الاحتياطية', 'new:backup'),
        Markup.button.callback('⚡ نظام التخزين المؤقت', 'new:cache')
      ],
      [
        Markup.button.callback('🛡️ حماية من الإساءة', 'new:ratelimiter'),
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }

  // Quranic Games Keyboard
  static quranicGamesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('1️⃣ تخمين الآية', 'qgame:gueverse'),
        Markup.button.callback('2️⃣ إكمال الآية', 'qgame:complete')
      ],
      [
        Markup.button.callback('3️⃣ اكتشف الفرق', 'qgame:spot'),
        Markup.button.callback('4️⃣ ثلاثيات قرآنية', 'qgame:trivia')
      ],
      [
        Markup.button.callback('5️⃣ عد السور', 'qgame:surah'),
        Markup.button.callback('⬅️ رجوع', 'new:qgames')
      ]
    ]);
  }

  // Shop Menu - قائمة المتجر
  static shopMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('👑 الأوسمة', 'shop:badges'),
        Markup.button.callback('⚡ المعززات', 'shop:boosts')
      ],
      [
        Markup.button.callback('🎁 الجوائز', 'shop:rewards'),
        Markup.button.callback('🎮 أدوات الألعاب', 'shop:weapons')
      ],
      [
        Markup.button.callback('📋 الكل', 'shop:all'),
        Markup.button.callback('🛒 حقيبتي', 'shop:inventory')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'new:shop')
      ]
    ]);
  }

  // Transfer & Donate Menu
  static transferMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💸 تحويل عملات', 'transfer:coins'),
        Markup.button.callback('⭐ تحويل نقاط', 'transfer:points')
      ],
      [
        Markup.button.callback('💝 تبرع خيري', 'transfer:charity'),
        Markup.button.callback('📊 السجل', 'transfer:history')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'new:transfer')
      ]
    ]);
  }

  // Notifications Settings
  static notificationsMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🕌 إشعارات الأذكار', 'notify:adhkar'),
        Markup.button.callback('⏰ إشعارات الصلاة', 'notify:prayer')
      ],
      [
        Markup.button.callback('🎮 إشعارات الألعاب', 'notify:games'),
        Markup.button.callback('💰 إشعارات المكافآت', 'notify:rewards')
      ],
      [
        Markup.button.callback('🔔 انتبه للحدث', 'notify:events'),
        Markup.button.callback('📊 إحصائياتي', 'notify:stats')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'new:notifications')
      ]
    ]);
  }

  // Language Settings
  static languageMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🇸🇦 العربية', 'lang:ar'),
        Markup.button.callback('🇬🇧 English', 'lang:en')
      ],
      [
        Markup.button.callback('🇫🇷 Français', 'lang:fr'),
        Markup.button.callback('📊 إحصائيات اللغات', 'lang:stats')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'new:language')
      ]
    ]);
  }

  // Backup System Menu
  static backupMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💾 إنشاء نسخة احتياطية', 'backup:create'),
        Markup.button.callback('📋 قائمة النسخ', 'backup:list')
      ],
      [
        Markup.button.callback('🔄 استعادة', 'backup:restore'),
        Markup.button.callback('🗑️ حذف نسخة', 'backup:delete')
      ],
      [
        Markup.button.callback('📊 إحصائيات', 'backup:stats'),
        Markup.button.callback('⬅️ رجوع', 'new:backup')
      ]
    ]);
  }

  // Cache System Info
  static cacheSystemKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 إحصائيات الذاكرة', 'cache:stats'),
        Markup.button.callback('🧹 مسح الذاكرة', 'cache:clear')
      ],
      [
        Markup.button.callback('⚡ الأداء', 'cache:performance'),
        Markup.button.callback('❓ معلومات', 'cache:info')
      ],
      [
        Markup.button.callback('⬅️ رجوع', 'new:cache')
      ]
    ]);
  }

  // Rate Limiter Protection Info
  static rateLimiterKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 حالتي', 'ratelimit:status'),
        Markup.button.callback('❓ ما هذا؟', 'ratelimit:info')
      ],
      [
        Markup.button.callback('🛡️ مستويات الحماية', 'ratelimit:levels'),
        Markup.button.callback('⬅️ رجوع', 'new:ratelimiter')
      ]
    ]);
  }

  // Premium Features Menu
  static premiumFeaturesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💎 الميزات المميزة', 'premium:features'),
        Markup.button.callback('💰 الأسعار', 'premium:pricing')
      ],
      [
        Markup.button.callback('🎁 العروض الخاصة', 'premium:offers'),
        Markup.button.callback('📊 الإحصائيات', 'premium:stats')
      ],
      [
        Markup.button.callback('💳 الاشتراك', 'premium:subscribe'),
        Markup.button.callback('⬅️ رجوع', 'menu:main')
      ]
    ]);
  }
}

module.exports = UIManager;
