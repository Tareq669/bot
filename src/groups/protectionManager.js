/**
 * نظام حماية المجموعات الاحترافي
 * Professional Group Protection Manager
 *
 * الميزات:
 * - Anti-Link: حذف الروابط تلقائياً
 * - Anti-Spam: منع الرسائل المتكررة
 * - Anti-Flood: منع إرسال عدد كبير من الرسائل
 * - Anti-Mention: منع المنشن الجماعي
 * - فلتر كلمات سيئة
 * - نظام تحذيرات (3 كتم، 5 طرد)
 * - كتم تلقائي لمدة محددة
 * - حماية من الحسابات الجديدة
 */

const GroupProtection = require('../database/models/GroupProtection');

class ProtectionManager {
  constructor(bot) {
    this.bot = bot;

    // تخزين مؤقت للرسائل لمراقبة الرسائل المتكررة
    this.messageCounts = new Map(); // userId -> [{timestamp, chatId}]
    this.userWarnings = new Map(); // userId -> warnings
    this.mutedUsers = new Map(); // userId -> muteInfo

    // إعدادات افتراضية
    this.defaultSettings = {
      // Anti-Link
      antiLink: false,
      deleteLink: true,
      linkWarning: '⚠️ عذراً، إرسال الروابط غير مسموح في هذه المجموعة!',

      // Anti-Spam
      antiSpam: false,
      spamLimit: 5, // عدد الرسائل
      spamTimeWindow: 3000, // بالمللي ثانية (3 ثواني)
      spamAction: 'mute', // mute, kick

      // Anti-Flood
      antiFlood: false,
      floodLimit: 10, // عدد الرسائل
      floodTimeWindow: 5000, // بالمللي ثانية (5 ثواني)
      floodAction: 'mute',

      // Anti-Mention
      antiMention: false,
      mentionWarning: '⚠️ عذراً، المنشن الجماعي غير مسموح في هذه المجموعة!',

      // فلتر الكلمات
      badWordsFilter: false,
      badWords: [],
      badWordWarning: '⚠️ عذراً، هذه الكلمة غير مسموح بها في هذه المجموعة!',

      // نظام التحذيرات
      warningsForMute: 3,
      warningsForKick: 5,

      // كتم تلقائي
      autoMute: false,
      defaultMuteDuration: 10, // بال دقائق

      // حماية الحسابات الجديدة
      newAccountProtection: false,
      newAccountDays: 7 // أقل من أسبوع
    };

    // أنماط المنشن المحظور
    this.mentionPatterns = [
      /@all/i,
      /@everyone/i,
      /@group/i,
      /@here/i,
      /@All/i,
      /@Everyone/i,
      /@Group/i,
      /@Here/i
    ];

    // كلمات سيئة افتراضية (قابلة للتخصيص)
    this.defaultBadWords = [];

    // ربط المعالجات
    this.setupHandlers();
  }

  /**
   * إعداد المعالجات
   */
  setupHandlers() {
    // معالج الرسائل
    this.bot.on('message', async (ctx, next) => {
      await this.handleMessage(ctx);
      return next();
    });

    // معالج_member_join للأعضاء الجدد
    this.bot.on('new_chat_members', async (ctx) => {
      await this.handleNewMembers(ctx);
    });

    // معالج member_left للخروج
    this.bot.on('left_chat_member', async (ctx) => {
      await this.handleMemberLeft(ctx);
    });
  }

  /**
   * التحقق من أن الرسالة في مجموعة
   */
  isGroup(ctx) {
    const chatType = ctx.chat.type;
    return chatType === 'group' || chatType === 'supergroup';
  }

  /**
   * الحصول على إعدادات المجموعة أو إنشاء إعدادات افتراضية
   */
  async getGroupSettings(chatId) {
    try {
      let settings = await GroupProtection.findOne({ groupId: chatId });

      if (!settings) {
        settings = new GroupProtection({
          groupId: chatId,
          locks: {
            deleteLink: false,
            chat: false
          },
          prohibited: {
            links: false,
            custom: []
          },
          settings: {
            antiFlood: false,
            floodLimit: 5
          }
        });
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('خطأ في الحصول على إعدادات المجموعة:', error);
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
      console.error('خطأ في تحديث إعدادات المجموعة:', error);
      return false;
    }
  }

  /**
   * معالجة الرسائل
   */
  async handleMessage(ctx) {
    // التأكد من أن الرسالة في مجموعة
    if (!this.isGroup(ctx)) return;

    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    const messageText = ctx.message?.text || '';
    const message = ctx.message;

    if (!userId) return;

    // الحصول على إعدادات المجموعة
    const settings = await this.getGroupSettings(chatId);
    if (!settings) return;

    // التحقق إذا كان المستخدم أدمن (لتخطي بعض القيود)
    const isAdmin = await this.isUserAdmin(ctx, userId, chatId);

    // 1. Anti-Link
    if (settings.locks?.deleteLink && !isAdmin) {
      await this.handleAntiLink(ctx, messageText, settings);
    }

    // 2. Anti-Spam
    if (settings.locks?.antiSpam && !isAdmin) {
      await this.handleAntiSpam(ctx, userId, chatId, settings);
    }

    // 3. Anti-Flood
    if (settings.settings?.antiFlood && !isAdmin) {
      await this.handleAntiFlood(ctx, userId, chatId, settings);
    }

    // 4. Anti-Mention
    if (settings.locks?.antiMention && !isAdmin) {
      await this.handleAntiMention(ctx, messageText, settings);
    }

    // 5. فلتر الكلمات السيئة
    if (settings.locks?.badWordsFilter && !isAdmin) {
      await this.handleBadWords(ctx, messageText, settings);
    }

    // 6. تحديث عداد الرسائل
    this.updateMessageCount(userId, chatId);

    // 7. فحص كتم المستخدم
    await this.checkUserMute(ctx, userId, chatId);
  }

  /**
   * معالجة Anti-Link
   */
  async handleAntiLink(ctx, text, settings) {
    // أنماط الروابط
    const linkPatterns = [
      /https?:\/\/[^\s]+/gi,
      /www\.[^\s]+/gi,
      /t\.me\/[^\s]+/gi,
      /telegram\.me\/[^\s]+/gi
    ];

    const hasLink = linkPatterns.some(pattern => pattern.test(text));

    if (hasLink) {
      try {
        // حذف الرسالة
        await ctx.deleteMessage(ctx.message.message_id);

        // إرسال تحذير
        const warningMsg = settings.locks?.linkWarning || '⚠️ عذراً، إرسال الروابط غير مسموح في هذه المجموعة!';
        const warning = await ctx.reply(warningMsg, {
          reply_to_message_id: ctx.message.message_id
        });

        // حذف رسالة التحذير بعد 5 ثواني
        setTimeout(async () => {
          try {
            await ctx.deleteMessage(warning.message_id);
          } catch (e) {
            // تجاهل الخطأ
          }
        }, 5000);

        console.log(`[Anti-Link] تم حذف رسالة تحتوي على رابط من المستخدم ${ctx.from.id}`);
      } catch (error) {
        console.error('خطأ في معالجة Anti-Link:', error);
      }
    }
  }

  /**
   * معالجة Anti-Spam
   */
  async handleAntiSpam(ctx, userId, chatId, settings) {
    const limit = settings.locks?.spamLimit || 5;
    const timeWindow = settings.locks?.spamTimeWindow || 3000;
    const action = settings.locks?.spamAction || 'mute';

    const key = `${chatId}_${userId}`;
    const now = Date.now();

    // الحصول على سجل الرسائل
    let messages = this.messageCounts.get(key) || [];

    // إزالة الرسائل القديمة
    messages = messages.filter(msg => now - msg.timestamp < timeWindow);

    // إضافة الرسالة الحالية
    messages.push({ timestamp: now });

    // تحديث السجل
    this.messageCounts.set(key, messages);

    // التحقق من تجاوز الحد
    if (messages.length >= limit) {
      try {
        // حذف الرسالة الحالية
        await ctx.deleteMessage(ctx.message.message_id);

        // تنفيذ الإجراء
        if (action === 'mute') {
          await this.muteUser(ctx, userId, chatId, 10, 'رسائل متكررة (سبام)');
        } else if (action === 'kick') {
          await this.kickUser(ctx, userId, chatId, 'رسائل متكررة (سبام)');
        }

        // إرسال تحذير
        await ctx.reply(`⚠️ تنبيه: تم اكتشاف رسائل متكررة من @${ctx.from.username || 'مستخدم'}! تم ${action === 'mute' ? 'كتمه' : 'طرده'} مؤقتاً.`);

        // مسح السجل
        this.messageCounts.set(key, []);

        console.log(`[Anti-Spam] تم تنفيذ ${action} على المستخدم ${userId}`);
      } catch (error) {
        console.error('خطأ في معالجة Anti-Spam:', error);
      }
    }
  }

  /**
   * معالجة Anti-Flood
   */
  async handleAntiFlood(ctx, userId, chatId, settings) {
    const limit = settings.settings?.floodLimit || 10;
    const timeWindow = 5000; // 5 ثواني
    const action = settings.locks?.floodAction || 'mute';

    const key = `flood_${chatId}_${userId}`;
    const now = Date.now();

    let messages = this.messageCounts.get(key) || [];
    messages = messages.filter(msg => now - msg.timestamp < timeWindow);
    messages.push({ timestamp: now });
    this.messageCounts.set(key, messages);

    if (messages.length >= limit) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);

        if (action === 'mute') {
          await this.muteUser(ctx, userId, chatId, 15, 'إغراق بالرسائل');
        } else if (action === 'kick') {
          await this.kickUser(ctx, userId, chatId, 'إغراق بالرسائل');
        }

        await ctx.reply(`⚠️ تنبيه: تم اكتشاف إغراق بالرسائل من @${ctx.from.username || 'مستخدم'}!`);

        this.messageCounts.set(key, []);

        console.log(`[Anti-Flood] تم تنفيذ ${action} على المستخدم ${userId}`);
      } catch (error) {
        console.error('خطأ في معالجة Anti-Flood:', error);
      }
    }
  }

  /**
   * معالجة Anti-Mention
   */
  async handleAntiMention(ctx, text, settings) {
    const hasBadMention = this.mentionPatterns.some(pattern => pattern.test(text));

    if (hasBadMention) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);

        const warningMsg = settings.locks?.mentionWarning || '⚠️ عذراً، المنشن الجماعي غير مسموح في هذه المجموعة!';
        const warning = await ctx.reply(warningMsg, {
          reply_to_message_id: ctx.message.message_id
        });

        setTimeout(async () => {
          try {
            await ctx.deleteMessage(warning.message_id);
          } catch (e) {
            // تجاهل الخطأ
          }
        }, 5000);

        console.log(`[Anti-Mention] تم حذف رسالة تحتوي على منشن من المستخدم ${ctx.from.id}`);
      } catch (error) {
        console.error('خطأ في معالجة Anti-Mention:', error);
      }
    }
  }

  /**
   * معالجة فلتر الكلمات السيئة
   */
  async handleBadWords(ctx, text, settings) {
    const badWords = settings.locks?.badWords || [];
    const textLower = text.toLowerCase();

    const hasBadWord = badWords.some(word => textLower.includes(word.toLowerCase()));

    if (hasBadWord) {
      try {
        await ctx.deleteMessage(ctx.message.message_id);

        const warningMsg = settings.locks?.badWordWarning || '⚠️ عذراً، هذه الكلمة غير مسموح بها في هذه المجموعة!';
        const warning = await ctx.reply(warningMsg, {
          reply_to_message_id: ctx.message.message_id
        });

        // إضافة تحذير
        await this.addWarning(ctx, ctx.from.id, ctx.chat.id, 'استخدام كلمات محظورة');

        setTimeout(async () => {
          try {
            await ctx.deleteMessage(warning.message_id);
          } catch (e) {
            // تجاهل الخطأ
          }
        }, 5000);

        console.log(`[BadWords] تم حذف رسالة تحتوي على كلمات محظورة من المستخدم ${ctx.from.id}`);
      } catch (error) {
        console.error('خطأ في معالجة فلتر الكلمات:', error);
      }
    }
  }

  /**
   * تحديث عداد الرسائل
   */
  updateMessageCount(userId, chatId) {
    const key = `${chatId}_${userId}`;
    const now = Date.now();

    let messages = this.messageCounts.get(key) || [];
    messages.push({ timestamp: now });

    // الاحتفاظ بالرسائل الأخيرة فقط (آخر دقيقة)
    messages = messages.filter(msg => now - msg.timestamp < 60000);

    this.messageCounts.set(key, messages);
  }

  /**
   * فحص كتم المستخدم
   */
  async checkUserMute(ctx, userId, chatId) {
    const muteInfo = this.mutedUsers.get(`${chatId}_${userId}`);

    if (muteInfo) {
      if (muteInfo.expiresAt && Date.now() > muteInfo.expiresAt) {
        // رفع الكتم
        this.mutedUsers.delete(`${chatId}_${userId}`);
        console.log(`[Mute] تم رفع كتم المستخدم ${userId} في المجموعة ${chatId}`);
      } else {
        // حذف رسالة المستخدم المكمت
        try {
          await ctx.deleteMessage(ctx.message.message_id);
        } catch (e) {
          // تجاهل الخطأ
        }
      }
    }
  }

  /**
   * كتم مستخدم
   */
  async muteUser(ctx, userId, chatId, durationMinutes, reason = 'لم يتم تحديد السبب') {
    try {
      const expiresAt = Date.now() + (durationMinutes * 60 * 1000);

      this.mutedUsers.set(`${chatId}_${userId}`, {
        userId,
        chatId,
        reason,
        expiresAt,
        mutedAt: Date.now()
      });

      // إرسال رسالة كتم
      await ctx.reply(`🔇 تم كتم المستخدم لمدة ${durationMinutes} دقيقة.\nالسبب: ${reason}`);

      // جدولة رفع الكتم
      setTimeout(() => {
        this.mutedUsers.delete(`${chatId}_${userId}`);
        console.log(`[Mute] تم رفع كتم المستخدم ${userId} في المجموعة ${chatId}`);
      }, durationMinutes * 60 * 1000);

      console.log(`[Mute] تم كتم المستخدم ${userId} في المجموعة ${chatId} لمدة ${durationMinutes} دقيقة`);

      return true;
    } catch (error) {
      console.error('خطأ في كتم المستخدم:', error);
      return false;
    }
  }

  /**
   * فك كتم مستخدم
   */
  async unmuteUser(ctx, userId, chatId) {
    try {
      const key = `${chatId}_${userId}`;
      const muteInfo = this.mutedUsers.get(key);

      if (muteInfo) {
        this.mutedUsers.delete(key);
        await ctx.reply('🔊 تم فك كتم المستخدم.');
        console.log(`[Unmute] تم فك كتم المستخدم ${userId} في المجموعة ${chatId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('خطأ في فك كتم المستخدم:', error);
      return false;
    }
  }

  /**
   * طرد مستخدم
   */
  async kickUser(ctx, userId, chatId, reason = 'لم يتم تحديد السبب') {
    try {
      await ctx.kickChatMember(chatId, userId);

      // إرسال رسالة طرد
      await ctx.reply(`👋 تم طرد المستخدم.\nالسبب: ${reason}`);

      // إلغاء الطرد بعد ثانية (للسماح بإعادة الانضمام)
      setTimeout(async () => {
        try {
          await ctx.unbanChatMember(chatId, userId);
        } catch (e) {
          // تجاهل الخطأ
        }
      }, 1000);

      console.log(`[Kick] تم طرد المستخدم ${userId} من المجموعة ${chatId}`);

      return true;
    } catch (error) {
      console.error('خطأ في طرد المستخدم:', error);
      return false;
    }
  }

  /**
   * إضافة تحذير للمستخدم
   */
  async addWarning(ctx, userId, chatId, reason) {
    try {
      const settings = await this.getGroupSettings(chatId);
      if (!settings) return false;

      // إضافة التحذير
      if (!settings.warnings) {
        settings.warnings = [];
      }

      settings.warnings.push({
        userId,
        reason,
        warnedBy: ctx.from?.id,
        timestamp: new Date()
      });

      await settings.save();

      // الحصول على عدد التحذيرات
      const userWarnings = settings.warnings.filter(w => w.userId === userId);
      const warningCount = userWarnings.length;

      const warningsForMute = settings.locks?.warningsForMute || 3;
      const warningsForKick = settings.locks?.warningsForKick || 5;

      // إرسال رسالة التحذير
      await ctx.reply(`⚠️ تم إعطاء تحذير للمستخدم @${ctx.from?.username || 'مستخدم'}.\nعدد التحذيرات: ${warningCount}/${warningsForMute}\nالسبب: ${reason}`);

      // الإجراءات عند تجاوز الحدود
      if (warningCount >= warningsForKick) {
        await this.kickUser(ctx, userId, chatId, 'تجاوز حد التحذيرات (5 تحذيرات)');
        // مسح التحذيرات
        settings.warnings = settings.warnings.filter(w => w.userId !== userId);
        await settings.save();
      } else if (warningCount >= warningsForMute) {
        await this.muteUser(ctx, userId, chatId, 30, 'تجاوز حد التحذيرات (3 تحذيرات)');
      }

      return true;
    } catch (error) {
      console.error('خطأ في إضافة تحذير:', error);
      return false;
    }
  }

  /**
   * عرض تحذيرات المستخدم
   */
  async getUserWarnings(ctx, userId, chatId) {
    try {
      const settings = await this.getGroupSettings(chatId);
      if (!settings || !settings.warnings) {
        return [];
      }

      return settings.warnings.filter(w => w.userId === userId);
    } catch (error) {
      console.error('خطأ في الحصول على تحذيرات المستخدم:', error);
      return [];
    }
  }

  /**
   * مسح تحذيرات المستخدم
   */
  async clearUserWarnings(ctx, userId, chatId) {
    try {
      const settings = await this.getGroupSettings(chatId);
      if (!settings || !settings.warnings) return false;

      settings.warnings = settings.warnings.filter(w => w.userId !== userId);
      await settings.save();

      await ctx.reply('✅ تم مسح جميع تحذيرات المستخدم.');
      return true;
    } catch (error) {
      console.error('خطأ في مسح تحذيرات المستخدم:', error);
      return false;
    }
  }

  /**
   * معالجة الأعضاء الجدد
   */
  async handleNewMembers(ctx) {
    if (!this.isGroup(ctx)) return;

    const chatId = ctx.chat.id;
    const newMembers = ctx.message?.new_chat_members || [];
    const settings = await this.getGroupSettings(chatId);

    if (!settings) return;

    for (const member of newMembers) {
      // حماية الحسابات الجديدة
      if (settings.locks?.newAccountProtection) {
        const accountAge = this.getAccountAge(member);
        const minDays = settings.locks?.newAccountDays || 7;

        if (accountAge < minDays * 24 * 60 * 60 * 1000) {
          try {
            // طرد الحساب الجديد
            await ctx.kickChatMember(chatId, member.id);
            await ctx.reply(`⚠️ تم طرد ${member.first_name} لأن حسابه جديد (أقل من ${minDays} يوم).`);
            console.log(`[NewAccount] تم طرد حساب جديد: ${member.id}`);
          } catch (error) {
            console.error('خطأ في طرد حساب جديد:', error);
          }
        }
      }
    }
  }

  /**
   * معالجة خروج الأعضاء
   */
  async handleMemberLeft(ctx) {
    if (!this.isGroup(ctx)) return;
    // يمكن إضافة معالجة هنا عند خروج الأعضاء
  }

  /**
   * حساب عمر الحساب
   */
  getAccountAge(user) {
    if (!user?.date) return 0;
    return Date.now() * 1000 - user.date; // تاريخ في التليجرام بالميكروثانية
  }

  /**
   * التحقق من أن المستخدم أدمن
   */
  async isUserAdmin(ctx, userId, chatId) {
    try {
      const chatMember = await ctx.getChatMember(chatId, userId);
      return ['creator', 'administrator'].includes(chatMember.status);
    } catch (error) {
      console.error('خطأ في التحقق من الأدمن:', error);
      return false;
    }
  }

  /**
   * ===== أوامر الإدارة =====
   */

  /**
   * Anti-Link: تفعيل/تعطيل
   */
  async toggleAntiLink(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.locks?.deleteLink || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.deleteLink': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} نظام حذف الروابط.`);
  }

  /**
   * Anti-Spam: تفعيل/تعطيل
   */
  async toggleAntiSpam(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.locks?.antiSpam || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.antiSpam': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} نظام منع الرسائل المتكررة (Anti-Spam).`);
  }

  /**
   * Anti-Flood: تفعيل/تعطيل
   */
  async toggleAntiFlood(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.settings?.antiFlood || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'settings.antiFlood': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} نظام منع الإغراق (Anti-Flood).`);
  }

  /**
   * Anti-Mention: تفعيل/تعطيل
   */
  async toggleAntiMention(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.locks?.antiMention || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.antiMention': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} نظام منع المنشن الجماعي.`);
  }

  /**
   * فلتر الكلمات السيئة: تفعيل/تعطيل
   */
  async toggleBadWordsFilter(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.locks?.badWordsFilter || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.badWordsFilter': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} فلتر الكلمات السيئة.`);
  }

  /**
   * إضافة كلمة محظورة
   */
  async addBadWord(ctx, word) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const badWords = settings.locks?.badWords || [];

    if (!badWords.includes(word)) {
      badWords.push(word);
      await this.updateGroupSettings(ctx.chat.id, {
        'locks.badWords': badWords
      });
      await ctx.reply(`✅ تم إضافة "${word}" إلى قائمة الكلمات المحظورة.`);
    } else {
      await ctx.reply(`⚠️ الكلمة "${word}" موجودة بالفعل في القائمة.`);
    }
  }

  /**
   * حذف كلمة محظورة
   */
  async removeBadWord(ctx, word) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const badWords = settings.locks?.badWords || [];

    const index = badWords.indexOf(word);
    if (index > -1) {
      badWords.splice(index, 1);
      await this.updateGroupSettings(ctx.chat.id, {
        'locks.badWords': badWords
      });
      await ctx.reply(`✅ تم حذف "${word}" من قائمة الكلمات المحظورة.`);
    } else {
      await ctx.reply(`⚠️ الكلمة "${word}" غير موجودة في القائمة.`);
    }
  }

  /**
   * عرض قائمة الكلمات المحظورة
   */
  async listBadWords(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const badWords = settings.locks?.badWords || [];

    if (badWords.length === 0) {
      return ctx.reply('📝 قائمة الكلمات المحظورة فارغة.');
    }

    const list = badWords.map((word, i) => `${i + 1}. ${word}`).join('\n');
    await ctx.reply(`📝 قائمة الكلمات المحظورة:\n${list}`);
  }

  /**
   * حماية الحسابات الجديدة: تفعيل/تعطيل
   */
  async toggleNewAccountProtection(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);
    const currentValue = settings.locks?.newAccountProtection || false;

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.newAccountProtection': !currentValue
    });

    const status = !currentValue ? '✅ تم تفعيل' : '❌ تم تعطيل';
    await ctx.reply(`${status} نظام حماية الحسابات الجديدة.`);
  }

  /**
   * عرض إعدادات الحماية
   */
  async showProtectionSettings(ctx) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const settings = await this.getGroupSettings(ctx.chat.id);

    const antiLink = settings.locks?.deleteLink ? 'مفعّل' : 'معطّل';
    const antiSpam = settings.locks?.antiSpam ? 'مفعّل' : 'معطّل';
    const antiFlood = settings.settings?.antiFlood ? 'مفعّل' : 'معطّل';
    const antiMention = settings.locks?.antiMention ? 'مفعّل' : 'معطّل';
    const badWordsFilter = settings.locks?.badWordsFilter ? 'مفعّل' : 'معطّل';
    const newAccountProtection = settings.locks?.newAccountProtection ? 'مفعّل' : 'معطّل';

    const badWords = settings.locks?.badWords || [];
    const badWordsList = badWords.length > 0 ? badWords.join(', ') : 'لا توجد';

    const message = `
🛡️ *إعدادات الحماية للمجموعة*

• حذف الروابط: ${antiLink}
• منع الرسائل المتكررة: ${antiSpam}
• منع الإغراق: ${antiFlood}
• منع المنشن الجماعي: ${antiMention}
• فلتر الكلمات السيئة: ${badWordsFilter}
• حماية الحسابات الجديدة: ${newAccountProtection}

📝 الكلمات المحظورة: ${badWordsList}

⚙️ حدود التحذيرات:
• للكتم: ${settings.locks?.warningsForMute || 3} تحذيرات
• للطرد: ${settings.locks?.warningsForKick || 5} تحذيرات
`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * كتم مستخدم (الأمر)
   */
  async muteCommand(ctx, userId, duration, reason) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const durationMinutes = parseInt(duration) || 10;
    const reasonText = reason || 'كتم بواسطة الأدمن';

    await this.muteUser(ctx, userId, ctx.chat.id, durationMinutes, reasonText);
  }

  /**
   * فك كتم مستخدم (الأمر)
   */
  async unmuteCommand(ctx, userId) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.unmuteUser(ctx, userId, ctx.chat.id);
  }

  /**
   * طرد مستخدم (الأمر)
   */
  async kickCommand(ctx, userId, reason) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const reasonText = reason || 'طرد بواسطة الأدمن';
    await this.kickUser(ctx, userId, ctx.chat.id, reasonText);
  }

  /**
   * إعطاء تحذير (الأمر)
   */
  async warnCommand(ctx, userId, reason) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    const reasonText = reason || 'تحذير';
    await this.addWarning(ctx, userId, ctx.chat.id, reasonText);
  }

  /**
   * عرض تحذيرات مستخدم (الأمر)
   */
  async warningsCommand(ctx, userId) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const warnings = await this.getUserWarnings(ctx, userId, ctx.chat.id);

    if (warnings.length === 0) {
      return ctx.reply('✅ لا توجد تحذيرات لهذا المستخدم.');
    }

    const warningsText = warnings.map((w, i) => {
      const date = new Date(w.timestamp).toLocaleDateString('ar');
      return `${i + 1}. ${w.reason} - ${date}`;
    }).join('\n');

    await ctx.reply(`⚠️ تحذيرات المستخدم:\n${warningsText}\n\n📊 الإجمالي: ${warnings.length} تحذير`);
  }

  /**
   * مسح تحذيرات مستخدم (الأمر)
   */
  async clearWarningsCommand(ctx, userId) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.clearUserWarnings(ctx, userId, ctx.chat.id);
  }

  /**
   * تعيين حدود Anti-Spam
   */
  async setSpamLimit(ctx, limit, timeWindow) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.spamLimit': parseInt(limit),
      'locks.spamTimeWindow': parseInt(timeWindow) * 1000
    });

    await ctx.reply(`✅ تم تعيين حد الرسائل المتكررة: ${limit} رسالة في ${timeWindow} ثانية.`);
  }

  /**
   * تعيين حدود Anti-Flood
   */
  async setFloodLimit(ctx, limit) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.updateGroupSettings(ctx.chat.id, {
      'settings.floodLimit': parseInt(limit)
    });

    await ctx.reply(`✅ تم تعيين حد الإغراق: ${limit} رسالة.`);
  }

  /**
   * تعيين أيام الحسابات الجديدة
   */
  async setNewAccountDays(ctx, days) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.newAccountDays': parseInt(days)
    });

    await ctx.reply(`✅ تم تعيين عمر الحساب المطلوب: ${days} يوم.`);
  }

  /**
   * تعيين حدود التحذيرات
   */
  async setWarningLimits(ctx, muteLimit, kickLimit) {
    if (!this.isGroup(ctx)) {
      return ctx.reply('⚠️ هذا الأمر يعمل فقط في المجموعات!');
    }

    const isAdmin = await this.isUserAdmin(ctx, ctx.from.id, ctx.chat.id);
    if (!isAdmin) {
      return ctx.reply('⚠️ هذا الأمر يتطلب صلاحيات الأدمن!');
    }

    await this.updateGroupSettings(ctx.chat.id, {
      'locks.warningsForMute': parseInt(muteLimit),
      'locks.warningsForKick': parseInt(kickLimit)
    });

    await ctx.reply(`✅ تم تعيين حدود التحذيرات:\n• للكتم: ${muteLimit} تحذيرات\n• للطرد: ${kickLimit} تحذيرات`);
  }
}

module.exports = ProtectionManager;
