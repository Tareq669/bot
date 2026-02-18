/**
 * لوحة تحكم وإدارة المجموعات
 * Group Panel and Management System
 *
 * الميزات:
 * - رسالة ترحيب عند إضافة البوت
 * - فحص صلاحيات الأدمن
 * - لوحة تحكم تفاعلية
 * - أوامر إدارة المجموعة
 * - إعدادات متكاملة مع الأنظمة الأخرى
 */

const GroupProtection = require('../database/models/GroupProtection');
const GroupMember = require('../database/models/GroupMember');

class GroupPanel {
  constructor(bot) {
    this.bot = bot;
    this.setupHandlers();
  }

  /**
   * إعداد المعالجات
   */
  setupHandlers() {
    // معالج إضافة البوت للمجموعة
    this.bot.on('new_chat_members', async (ctx) => {
      await this.handleBotAdded(ctx);
    });

    // أوامر لوحة التحكم - للمجموعات فقط
    this.bot.command('panel', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showPanel(ctx);
    });
    this.bot.command('لوحة', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showPanel(ctx);
    });

    // أوامر الإعدادات - للمجموعات فقط
    this.bot.command('settings', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showSettings(ctx);
    });
    this.bot.command('الإعدادات', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showSettings(ctx);
    });

    // أوامر المساعدة - يمكن استخدامها في الخاص والمجموعات
    this.bot.command('help', (ctx) => this.showHelp(ctx));
    this.bot.command('مساعدة', (ctx) => this.showHelp(ctx));

    // أوامر الإحصائيات - للمجموعات فقط
    this.bot.command('stats', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showStats(ctx);
    });
    this.bot.command('إحصائيات', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.showStats(ctx);
    });

    // أمر رابط الدعوة - للمجموعات فقط
    this.bot.command('invitelink', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.getInviteLink(ctx);
    });
    this.bot.command('رابط_الدعوة', (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
      return this.getInviteLink(ctx);
    });

    // معالجات الأزرار
    this.setupCallbacks();
  }

  /**
   * إعداد المعالجات الخاصة بالـ callbacks
   */
  setupCallbacks() {
    const { Markup } = require('telegraf');

    // لوحة التحكم الرئيسية
    this.bot.action('group:panel', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showPanel(ctx);
    });

    // قسم الحماية
    this.bot.action('group:protection', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showProtectionSettings(ctx);
    });

    // قسم الردود الذكية
    this.bot.action('group:smartreplies', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showSmartRepliesSettings(ctx);
    });

    // قسم المستويات
    this.bot.action('group:levels', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showLevelsSettings(ctx);
    });

    // قسم الاقتصاد
    this.bot.action('group:economy', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showEconomySettings(ctx);
    });

    // قسم الألعاب
    this.bot.action('group:games', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showGamesSettings(ctx);
    });

    // قسم الإعدادات العامة
    this.bot.action('group:general', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showGeneralSettings(ctx);
    });

    // تفعيل/تعطيل الحماية
    this.bot.action(/group:toggle:(\w+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const setting = ctx.match[1];
      await this.toggleSetting(ctx, setting);
    });

    // رجوع للقائمة الرئيسية
    this.bot.action('group:back', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showPanel(ctx);
    });

    // عرض الرابط
    this.bot.action('group:invitelink', async (ctx) => {
      await ctx.answerCbQuery();
      await this.getInviteLink(ctx);
    });

    // عرض الإحصائيات
    this.bot.action('group:stats', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showStats(ctx);
    });
  }

  /**
   * التحقق من أن الرسالة في مجموعة
   */
  isGroup(ctx) {
    const chatType = ctx.chat?.type;
    return chatType === 'group' || chatType === 'supergroup';
  }

  /**
   * التحقق من صلاحيات الأدمن
   */
  async isAdmin(ctx, userId) {
    try {
      const chatId = ctx.chat.id;
      const member = await ctx.telegram.getChatMember(chatId, userId);
      return ['creator', 'administrator'].includes(member.status);
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  }

  /**
   * الحصول على معلومات المجموعة أو إنشاء إعدادات جديدة
   */
  async getGroupSettings(chatId) {
    try {
      let settings = await GroupProtection.findOne({ groupId: chatId });

      if (!settings) {
        settings = new GroupProtection({
          groupId: chatId,
          welcome: { enabled: false, message: '', showJoinInfo: true, buttons: false },
          farewell: { enabled: false, message: '' },
          locks: {},
          prohibited: { links: false, forwarding: false, custom: [] },
          settings: { welcomeMessage: '', farewellMessage: '', antiFlood: false, floodLimit: 5 },
          permissions: {
            canWarn: true, canMute: true, canKick: false, canBan: false,
            canDelete: true, canPin: false, canChangeInfo: false,
            canPlayGames: true, canUseCommands: true, canSendMedia: true,
            canSendPolls: true, canSendInvites: false,
            canReact: true, canUseBot: true
          }
        });
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('Error getting group settings:', error);
      return null;
    }
  }

  /**
   * تحديث إعدادات المجموعة
   */
  async updateGroupSettings(chatId, updates) {
    try {
      const settings = await this.getGroupSettings(chatId);
      if (!settings) return false;

      Object.assign(settings, updates);
      settings.updatedAt = new Date();
      await settings.save();
      return true;
    } catch (error) {
      console.error('Error updating group settings:', error);
      return false;
    }
  }

  /**
   * معالجة إضافة البوت للمجموعة
   */
  async handleBotAdded(ctx) {
    try {
      const chatId = ctx.chat.id;
      const chatTitle = ctx.chat.title || 'المجموعة';
      const botId = ctx.botInfo.id;

      // التحقق إذا كان البوت هو المضاف
      const isBotAdded = ctx.message.new_chat_members.some(member => member.id === botId);

      if (!isBotAdded) return;

      console.log(`[GroupPanel] تم إضافة البوت للمجموعة: ${chatTitle} (${chatId})`);

      // الحصول على إعدادات المجموعة
      const settings = await this.getGroupSettings(chatId);

      // تحديث عنوان المجموعة
      if (settings) {
        settings.groupTitle = chatTitle;
        await settings.save();
      }

      // فحص صلاحيات البوت
      await this.checkBotPermissions(ctx);

      // إرسال رسالة ترحيب
      await this.sendWelcomeMessage(ctx, chatTitle);

    } catch (error) {
      console.error('Error handling bot added:', error);
    }
  }

  /**
   * فحص صلاحيات البوت
   */
  async checkBotPermissions(ctx) {
    try {
      const chatId = ctx.chat.id;
      const botId = ctx.botInfo.id;

      const botMember = await ctx.telegram.getChatMember(chatId, botId);

      const requiredPermissions = ['can_delete_messages', 'can_restrict_members'];
      const hasPermissions = requiredPermissions.some(perm => botMember[perm]);

      if (!hasPermissions) {
        // إشعار المشرفين أن البوت يحتاج صلاحيات
        await this.notifyAdminsAboutPermissions(ctx);
      }

      return hasPermissions;
    } catch (error) {
      console.error('Error checking bot permissions:', error);
      return false;
    }
  }

  /**
   * إشعار المشرفين حول صلاحيات البوت
   */
  async notifyAdminsAboutPermissions(ctx) {
    try {
      const chatId = ctx.chat.id;
      const chatTitle = ctx.chat.title;

      const message = `
⚠️ <b>تنبيه مهم!</b>

تم إضافة البوت للمجموعة: ${chatTitle}

❌ <b>البوت يحتاج صلاحيات إضافية للعمل بشكل صحيح:</b>

• 🗑️ حذف الرسائل
• 🔇 كتم المستخدمين

⚙️ يرجى منح البوت صلاحيات الأدمن للمميزات الكاملة!
`;

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('📢 تواصل مع المطور', 'https://t.me/DEVELOPER_USERNAME')]
      ]);

      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * إرسال رسالة ترحيب عند إضافة البوت
   */
  async sendWelcomeMessage(ctx, chatTitle) {
    try {
      const welcomeText = `
🎉 <b>مرحباً! شكراً لإضافة البوت</b>

━━━━━━━━━━━━━━━━━━

👋 أهلاً بك في مجموعة: <b>${chatTitle}</b>

🤖 <b>أنا بوت متكامل لإدارة مجموعتك</b>

━━━━━━━━━━━━━━━━━━

📋 <b>الميزات المتاحة:</b>

🛡️ <b>نظام الحماية:</b>
• أقفال المجموعة
• فلتر الروابط والكلمات
• منع المنشن الجماعي
• نظام تحذيرات تلقائي

💬 <b>الردود الذكية:</b>
• ردود تلقائية مخصصة
• ردود على كلمات مفتاحية

⭐ <b>نظام المستويات:</b>
• XP والتفاعل
• نظام الرتب
• لوحة المتصدرين

💰 <b>نظام الاقتصاد:</b>
• عملة المجموعة
• متجر افتراضي
• تحويل أموال

🎮 <b>الألعاب:</b>
• ألعاب تفاعلية
• ألعاب قرآنية

⚙️ <b>للإعدادات:</b>
• /panel - لوحة التحكم
• /settings - الإعدادات
• /help - المساعدة

━━━━━━━━━━━━━━━━━━

🔧 للمشرفين: اكتب /panel لفتح لوحة التحكم
`;

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⚙️ لوحة التحكم', 'group:panel')],
        [Markup.button.callback('❓ المساعدة', 'group:help')]
      ]);

      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }

  /**
   * عرض لوحة التحكم الرئيسية
   */
  async showPanel(ctx) {
    try {
      // التأكد من أن الأمر في مجموعة
      if (!this.isGroup(ctx)) {
        return ctx.reply('⚠️ هذا الأمر متاح فقط في المجموعات!');
      }

      // التحقق من صلاحيات الأدمن
      const userId = ctx.from.id;
      const isAdmin = await this.isAdmin(ctx, userId);

      if (!isAdmin) {
        return ctx.reply('⛔ هذا الأمر للمشرفين فقط!');
      }

      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      const { Markup } = require('telegraf');

      const panelText = `
🖥️ <b>لوحة تحكم المجموعة</b>

━━━━━━━━━━━━━━━━━━

📌 المجموعة: <b>${ctx.chat.title}</b>

⚙️ <b>اختر القسم:</b>
`;

      const keyboard = Markup.inlineKeyboard([
        // الصف الأول - الحماية والإعدادات
        [
          Markup.button.callback('🛡️ الحماية', 'group:protection'),
          Markup.button.callback('⚙️ العامة', 'group:general')
        ],
        // الصف الثاني - التفاعل
        [
          Markup.button.callback('💬 الردود الذكية', 'group:smartreplies'),
          Markup.button.callback('⭐ المستويات', 'group:levels')
        ],
        // الصف الثالث - الاقتصاد والألعاب
        [
          Markup.button.callback('💰 الاقتصاد', 'group:economy'),
          Markup.button.callback('🎮 الألعاب', 'group:games')
        ],
        // الصف الرابع - أدوات
        [
          Markup.button.callback('📊 الإحصائيات', 'group:stats'),
          Markup.button.callback('🔗 رابط الدعوة', 'group:invitelink')
        ],
        // الصف الخامس - مساعدة
        [
          Markup.button.callback('❓ المساعدة', 'group:help')
        ]
      ]);

      // حذف رسالة الأمر السابقة إذا وجدت
      try {
        await ctx.deleteMessage(ctx.message.message_id);
      } catch (e) {
        // تجاهل الخطأ إذا لم يتم العثور على الرسالة
      }

      await ctx.reply(panelText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing panel:', error);
      await ctx.reply('❌ حدث خطأ في فتح لوحة التحكم');
    }
  }

  /**
   * عرض إعدادات الحماية
   */
  async showProtectionSettings(ctx) {
    try {
      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      const { Markup } = require('telegraf');

      const locks = settings?.locks || {};
      const prohibited = settings?.prohibited || {};

      const protectionText = `
🛡️ <b>إعدادات الحماية</b>

━━━━━━━━━━━━━━━━━━

📌 <b>الأقفال:</b>
${locks.deleteLink ? '✅' : '❌'} حذف الروابط
${locks.antiSpam ? '✅' : '❌'} منع السبام
${locks.antiFlood ? '✅' : '❌'} منع الإغراق
${locks.antiMention ? '✅' : '❌'} منع المنشن

📌 <b>الحماية:</b>
${prohibited.links ? '✅' : '❌'} منع الروابط
${prohibited.bots ? '❌' : '✅'} السماح بالبوتات
${prohibited.forwarding ? '❌' : '✅'} السماح بالتحويل

━━━━━━━━━━━━━━━━━━

👆 اضغط على أي إعداد لتبديله
`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(locks.deleteLink ? '🔴 إلغاء حذف الروابط' : '🟢 تفعيل حذف الروابط', 'group:toggle:deleteLink')
        ],
        [
          Markup.button.callback(locks.antiSpam ? '🔴 إلغاء منع السبام' : '🟢 تفعيل منع السبام', 'group:toggle:antiSpam')
        ],
        [
          Markup.button.callback(locks.antiFlood ? '🔴 إلغاء منع الإغراق' : '🟢 تفعيل منع الإغراق', 'group:toggle:antiFlood')
        ],
        [
          Markup.button.callback(locks.antiMention ? '🔴 إلغاء منع المنشن' : '🟢 تفعيل منع المنشن', 'group:toggle:antiMention')
        ],
        [
          Markup.button.callback(prohibited.links ? '🔴 إلغاء منع الروابط' : '🟢 تفعيل منع الروابط', 'group:toggle:prohibitedLinks')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'group:back')
        ]
      ]);

      await ctx.editMessageText(protectionText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing protection settings:', error);
    }
  }

  /**
   * عرض إعدادات الردود الذكية
   */
  async showSmartRepliesSettings(ctx) {
    try {
      const { Markup } = require('telegraf');

      const text = `
💬 <b>إعدادات الردود الذكية</b>

━━━━━━━━━━━━━━━━━━

📝 نظام الردود الذكية يسمح لك:
• إضافة ردود تلقائية على كلمات معينة
• الردود على الترحيب والمغادرة
• ردود مخصصة حسب الكلمات المفتاحية

━━━━━━━━━━━━━━━━━━

⚠️ لاستخدام نظام الردود الذكية:
• أضف رد: /اضف_رد [كلمة] [الرد]
• احذف رد: /حذف_رد [كلمة]
• عرض الردود: /الردود

━━━━━━━━━━━━━━━━━━
`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'group:back')]
      ]);

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing smart replies settings:', error);
    }
  }

  /**
   * عرض إعدادات المستويات
   */
  async showLevelsSettings(ctx) {
    try {
      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      const { Markup } = require('telegraf');

      const permissions = settings?.permissions || {};

      const text = `
⭐ <b>إعدادات المستويات والتفاعل</b>

━━━━━━━━━━━━━━━━━━

📊 نظام المستويات يتيح:
• كسب XP عند كل رسالة
• الصعود للمستويات الأعلى
• الحصول على رتب خاصة

📈 <b>الإعدادات الحالية:</b>
${permissions.canPlayGames ? '✅' : '❌'} السماح بالألعاب
${permissions.canReact ? '✅' : '❌'} السماح بالتفاعل

━━━━━━━━━━━━━━━━━━

🎮 الأوامر:
• /profile - ملفي الشخصي
• /level - مستواي الحالي
• /xp - نقاط XP
• /top - لوحة المتصدرين
• /rank - ترتيبي

━━━━━━━━━━━━━━━━━━
`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(permissions.canPlayGames ? '🔴 إلغاء الألعاب' : '🟢 تفعيل الألعاب', 'group:toggle:canPlayGames')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'group:back')
        ]
      ]);

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing levels settings:', error);
    }
  }

  /**
   * عرض إعدادات الاقتصاد
   */
  async showEconomySettings(ctx) {
    try {
      const { Markup } = require('telegraf');

      const text = `
💰 <b>إعدادات الاقتصاد</b>

━━━━━━━━━━━━━━━━━━

💵 نظام الاقتصاد يوفر:
• عملة افتراضية للمجموعة
• راتب يومي
• متجر للشراء
• تحويل أموال بين الأعضاء

━━━━━━━━━━━━━━━━━━

💳 الأوامر:
• /balance - رصيدي
• /daily - راتب يومي
• /shop - المتجر
• /transfer - تحويل أموال
• /bank - المصرف

━━━━━━━━━━━━━━━━━━

🏦 الخدمات المصرفية:
• إيداع وسحب من المصرف
• فوائد على الودائع

━━━━━━━━━━━━━━━━━━
`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'group:back')]
      ]);

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing economy settings:', error);
    }
  }

  /**
   * عرض إعدادات الألعاب
   */
  async showGamesSettings(ctx) {
    try {
      const { Markup } = require('telegraf');

      const text = `
🎮 <b>إعدادات الألعاب</b>

━━━━━━━━━━━━━━━━━━

🎯 الألعاب المتاحة:

🎲 <b>ألعاب بسيطة:</b>
• حجر ورق مقص
• تخمين الرقم
• النرد
• الحظ

📖 <b>ألعاب قرآنية:</b>
• تخمين السورة
• أكمل الآية
• أسئلة قرآنية
• عد الآيات

━━━━━━━━━━━━━━━━━━

🎮 أوامر الألعاب:
• /games - قائمة الألعاب
• /qgames - الألعاب القرآنية
• /challenges - التحديات

━━━━━━━━━━━━━━━━━━

🏆 المسابقات والأحداث الخاصة!

━━━━━━━━━━━━━━━━━━
`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ رجوع', 'group:back')]
      ]);

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing games settings:', error);
    }
  }

  /**
   * عرض الإعدادات العامة
   */
  async showGeneralSettings(ctx) {
    try {
      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      const { Markup } = require('telegraf');

      const welcome = settings?.welcome || {};
      const farewell = settings?.farewell || {};

      const text = `
⚙️ <b>الإعدادات العامة</b>

━━━━━━━━━━━━━━━━━━

👋 <b>الترحيب:</b>
${welcome.enabled ? '✅ مفعل' : '❌ معطل'}

👋 <b>الوداع:</b>
${farewell.enabled ? '✅ مفعل' : '❌ معطل'}

━━━━━━━━━━━━━━━━━━

📝 الأوامر:
• /ترحيب [الرسالة] - تعيين رسالة ترحيب
• /وداع [الرسالة] - تعيين رسالة وداع
• /ترحيب_تشغيل - تفعيل الترحيب
• /ترحيب_إيقاف - إيقاف الترحيب
• /وداع_تشغيل - تفعيل الوداع
• /وداع_إيقاف - إيقاف الوداع

• /قواعد - عرض القواعد
• /تعيين_قواعد [القواعد] - تعيين القواعد

━━━━━━━━━━━━━━━━━━
`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(welcome.enabled ? '🔴 إيقاف الترحيب' : '🟢 تشغيل الترحيب', 'group:toggle:welcomeEnabled')
        ],
        [
          Markup.button.callback(farewell.enabled ? '🔴 إيقاف الوداع' : '🟢 تشغيل الوداع', 'group:toggle:farewellEnabled')
        ],
        [
          Markup.button.callback('⬅️ رجوع', 'group:back')
        ]
      ]);

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing general settings:', error);
    }
  }

  /**
   * تبديل إعداد معين
   */
  async toggleSetting(ctx, setting) {
    try {
      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      if (!settings) return;

      let currentValue = false;
      let newValue = true;
      let updatePath = '';

      // تحديد المسار والقيمة الحالية
      switch (setting) {
        case 'deleteLink':
          currentValue = settings.locks?.deleteLink || false;
          updatePath = 'locks.deleteLink';
          break;
        case 'antiSpam':
          currentValue = settings.locks?.antiSpam || false;
          updatePath = 'locks.antiSpam';
          break;
        case 'antiFlood':
          currentValue = settings.settings?.antiFlood || false;
          updatePath = 'settings.antiFlood';
          break;
        case 'antiMention':
          currentValue = settings.locks?.antiMention || false;
          updatePath = 'locks.antiMention';
          break;
        case 'prohibitedLinks':
          currentValue = settings.prohibited?.links || false;
          updatePath = 'prohibited.links';
          break;
        case 'canPlayGames':
          currentValue = settings.permissions?.canPlayGames || true;
          updatePath = 'permissions.canPlayGames';
          break;
        case 'welcomeEnabled':
          currentValue = settings.welcome?.enabled || false;
          updatePath = 'welcome.enabled';
          break;
        case 'farewellEnabled':
          currentValue = settings.farewell?.enabled || false;
          updatePath = 'farewell.enabled';
          break;
        default:
          await ctx.answerCbQuery('الإعداد غير معروف');
          return;
      }

      newValue = !currentValue;

      // تحديث الإعداد
      const updateObj = {};
      updateObj[updatePath] = newValue;

      await this.updateGroupSettings(chatId, updateObj);

      // إرسال تأكيد
      const status = newValue ? '✅ تم التفعيل' : '❌ تم الإلغاء';
      await ctx.answerCbQuery(status);

      // إعادة عرض الصفحة الحالية
      if (setting.includes('Link') || setting === 'antiSpam' || setting === 'antiFlood' || setting === 'antiMention') {
        await this.showProtectionSettings(ctx);
      } else if (setting === 'canPlayGames') {
        await this.showLevelsSettings(ctx);
      } else if (setting === 'welcomeEnabled' || setting === 'farewellEnabled') {
        await this.showGeneralSettings(ctx);
      }

    } catch (error) {
      console.error('Error toggling setting:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * عرض إعدادات المجموعة
   */
  async showSettings(ctx) {
    try {
      if (!this.isGroup(ctx)) {
        return ctx.reply('⚠️ هذا الأمر متاح فقط في المجموعات!');
      }

      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      const welcome = settings?.welcome || {};
      const farewell = settings?.farewell || {};
      const locks = settings?.locks || {};
      const settings2 = settings?.settings || {};

      const settingsText = `
⚙️ <b>إعدادات المجموعة</b>

━━━━━━━━━━━━━━━━━━

📌 <b>المجموعة:</b> ${ctx.chat.title}

👋 <b>الترحيب:</b> ${welcome.enabled ? '✅ مفعل' : '❌ معطل'}
👋 <b>الوداع:</b> ${farewell.enabled ? '✅ مفعل' : '❌ معطل'}

🛡️ <b>الحماية:</b>
• حذف الروابط: ${locks.deleteLink ? '✅' : '❌'}
• منع السبام: ${locks.antiSpam ? '✅' : '❌'}
• منع الإغراق: ${settings2.antiFlood ? '✅' : '❌'}
• منع المنشن: ${locks.antiMention ? '✅' : '❌'}

📊 <b>الإحصائيات:</b>
• عدد الرسائل: ${settings?.statistics?.messagesCount || 0}

━━━━━━━━━━━━━━━━━━

💡 استخدم /panel لفتح لوحة التحكم الكاملة

📝 الأوامر:
• /settings - هذه الرسالة
• /panel - لوحة التحكم
• /stats - الإحصائيات
`;

      await ctx.reply(settingsText, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('Error showing settings:', error);
      await ctx.reply('❌ حدث خطأ');
    }
  }

  /**
   * عرض المساعدة
   */
  async showHelp(ctx) {
    try {
      const helpText = `
❓ <b>المساعدة</b>

━━━━━━━━━━━━━━━━━━

👋 <b>أهلاً بك!</b>

🤖 هذا البوت يوفر لك العديد من الميزات:

━━━━━━━━━━━━━━━━━━

🛡️ <b>أوامر الحماية:</b>
• /kick - طرد مستخدم
• /ban - حظر مستخدم
• /mute - كتم مستخدم
• /warn - تحذير مستخدم

⚙️ <b>أوامر الإعدادات:</b>
• /panel - لوحة التحكم
• /settings - إعدادات المجموعة
• /rules - عرض القواعد

📊 <b>أوامر المعلومات:</b>
• /stats - إحصائيات المجموعة
• /invitelink - رابط الدعوة
• /admins - قائمة المشرفين

👋 <b>الترحيب والوداع:</b>
• /ترحيب [رسالة] - تعيين رسالة ترحيب
• /وداع [رسالة] - تعيين رسالة وداع

━━━━━━━━━━━━━━━━━━

💡 <b>نصائح:</b>
• للمشرفين: استخدم /panel للوصول لإعدادات متقدمة
• للأعضاء: استخدم /help في أي وقت للحصول على المساعدة

━━━━━━━━━━━━━━━━━━

🔧 للمشاكل: تواصل مع المشرفين

━━━━━━━━━━━━━━━━━━
`;

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⚙️ لوحة التحكم', 'group:panel')]
      ]);

      if (ctx.callbackQuery) {
        await ctx.editMessageText(helpText, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(helpText, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }

    } catch (error) {
      console.error('Error showing help:', error);
    }
  }

  /**
   * عرض إحصائيات المجموعة
   */
  async showStats(ctx) {
    try {
      if (!this.isGroup(ctx)) {
        return ctx.reply('⚠️ هذا الأمر متاح فقط في المجموعات!');
      }

      const chatId = ctx.chat.id;
      const settings = await this.getGroupSettings(chatId);

      // الحصول على إحصائيات الأعضاء
      const memberCount = await GroupMember.countDocuments({ groupId: String(chatId) });

      // الحصول على أكثر الأعضاء تفاعلاً
      const topMembers = await GroupMember.find({ groupId: String(chatId) })
        .sort({ xp: -1 })
        .limit(5)
        .lean();

      const statsText = `
📊 <b>إحصائيات المجموعة</b>

━━━━━━━━━━━━━━━━━━

📌 <b>المجموعة:</b> ${ctx.chat.title}

👥 <b>الأعضاء:</b>
• الأعضاء المسجلين: ${memberCount} عضو

🛡️ <b>الحماية:</b>
• حذف الروابط: ${settings?.locks?.deleteLink ? '✅' : '❌'}
• منع السبام: ${settings?.locks?.antiSpam ? '✅' : '❌'}
• منع الإغراق: ${settings?.settings?.antiFlood ? '✅' : '❌'}

📝 <b>آخر تحديث:</b>
${settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString('ar') : 'غير متاح'}

━━━━━━━━━━━━━━━━━━
`;

      let membersText = '';
      if (topMembers.length > 0) {
        membersText = '\n🏆 <b>أكثر الأعضاء تفاعلاً:</b>\n';
        topMembers.forEach((member, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          membersText += `${medal} Level ${member.level || 1} - XP: ${member.xp || 0}\n`;
        });
      }

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تحديث', 'group:stats')],
        [Markup.button.callback('⬅️ رجوع', 'group:back')]
      ]);

      await ctx.reply(statsText + membersText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error showing stats:', error);
      await ctx.reply('❌ حدث خطأ في جلب الإحصائيات');
    }
  }

  /**
   * الحصول على رابط الدعوة
   */
  async getInviteLink(ctx) {
    try {
      if (!this.isGroup(ctx)) {
        return ctx.reply('⚠️ هذا الأمر متاح فقط في المجموعات!');
      }

      const chatId = ctx.chat.id;

      // محاولة الحصول على رابط الدعوة
      let inviteLink;
      try {
        inviteLink = await ctx.telegram.exportChatInviteLink(chatId);
      } catch (e) {
        // إذا لم يكن لدى البوت صلاحيات
        return ctx.reply(`
❌ <b>تعذر الحصول على رابط الدعوة</b>

البوت يحتاج صلاحيات لإنشاء رابط دعوة.
يرجى التأكد من أن البوت لديه صلاحيات الأدمن!
`, { parse_mode: 'HTML' });
      }

      const { Markup } = require('telegraf');
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🔗 فتح الرابط', inviteLink)],
        [Markup.button.callback('🔄 تجديد الرابط', 'group:invitelink')]
      ]);

      await ctx.reply(`
🔗 <b>رابط الدعوة</b>

━━━━━━━━━━━━━━━━━━

<b>المجموعة:</b> ${ctx.chat.title}

<a href="${inviteLink}>🔗 اضغط هنا للانضمام</a>

━━━━━━━━━━━━━━━━━━

💡 شارك هذا الرابط مع من تريد دعوتهم للمجموعة!

━━━━━━━━━━━━━━━━━━
`, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting invite link:', error);
      await ctx.reply('❌ تعذر الحصول على رابط الدعوة');
    }
  }
}

module.exports = GroupPanel;
