/**
 * نظام الردود الذكية للمجموعات
 * Smart Replies Manager for Groups
 *
 * الميزات:
 * - إضافة ردود مخصصة بكلمات مفتاحية
 * - حذف الردود
 * - عرض قائمة الردود
 * - تفعيل/تعطيل الردود
 * - دعم كلمات متعددة لكل رد
 * - رد تلقائي داخل المجموعات فقط
 */

const SmartReply = require('../database/models/SmartReply');

class SmartRepliesManager {
  constructor(bot) {
    this.bot = bot;
    this.setupHandlers();
  }

  /**
   * التحقق من أن الرسالة في مجموعة
   */
  isGroup(ctx) {
    const chatType = ctx.chat?.type;
    return chatType === 'group' || chatType === 'supergroup';
  }

  /**
   * الحصول على إعدادات الردود الذكية للمجموعة
   */
  async getSmartReplySettings(groupId) {
    try {
      let settings = await SmartReply.findOne({ groupId });

      if (!settings) {
        settings = new SmartReply({
          groupId,
          groupTitle: '',
          enabled: true,
          replies: []
        });
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('خطأ في الحصول على إعدادات الردود الذكية:', error);
      return null;
    }
  }

  /**
   * تحديث إعدادات المجموعة
   */
  async updateSettings(groupId, updates) {
    try {
      const settings = await this.getSmartReplySettings(groupId);
      if (!settings) return false;

      Object.assign(settings, updates);
      settings.updatedAt = new Date();
      await settings.save();

      return true;
    } catch (error) {
      console.error('خطأ في تحديث إعدادات الردود الذكية:', error);
      return false;
    }
  }

  /**
   * التحقق من صلاحيات الأدمن
   */
  async isUserAdmin(ctx, userId) {
    try {
      const chatId = ctx.chat?.id;
      if (!chatId) return false;

      try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        return ['creator', 'administrator'].includes(member.status);
      } catch (e) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * إعداد المعالجات
   */
  setupHandlers() {
    // معالج الرسائل للرد التلقائي
    this.bot.on('message', async (ctx, next) => {
      await this.handleAutoReply(ctx);
      return next();
    });

    // معالجة الأوامر
    this.bot.on('command:addreply', async (ctx) => {
      await this.handleAddReply(ctx);
    });

    this.bot.on('command:delreply', async (ctx) => {
      await this.handleDeleteReply(ctx);
    });

    this.bot.on('command:replies', async (ctx) => {
      await this.handleListReplies(ctx);
    });
  }

  /**
   * معالجة الرد التلقائي على الرسائل
   */
  async handleAutoReply(ctx) {
    // التحقق من أن الرسالة في مجموعة
    if (!this.isGroup(ctx)) return;

    const chatId = ctx.chat?.id;
    const messageText = ctx.message?.text || '';
    const userId = ctx.from?.id;

    if (!messageText || !userId) return;

    // الحصول على إعدادات المجموعة
    const settings = await this.getSmartReplySettings(chatId);
    if (!settings || !settings.enabled) return;

    // التحقق إذا كان المستخدم أدمن (لا يرد على رسائل الأدمنز)
    const isAdmin = await this.isUserAdmin(ctx, userId);
    if (isAdmin) return;

    // البحث عن رد مطابق
    const matchedReply = this.findMatchingReply(settings.replies, messageText);

    if (matchedReply) {
      try {
        // زيادة عداد الاستخدام
        matchedReply.useCount += 1;
        settings.stats.totalTriggers += 1;
        await settings.save();

        // إرسال الرد
        await ctx.reply(matchedReply.replyText, {
          reply_to_message_id: ctx.message.message_id
        });

        console.log(`[SmartReplies] تم إرسال رد تلقائي في المجموعة ${chatId} للكلمة المفتاحية`);
      } catch (error) {
        console.error('خطأ في إرسال الرد التلقائي:', error);
      }
    }
  }

  /**
   * البحث عن رد مطابق للكلمة المفتاحية
   */
  findMatchingReply(replies, messageText) {
    const textLower = messageText.toLowerCase().trim();

    for (const reply of replies) {
      for (const keyword of reply.keywords) {
        const keywordLower = keyword.toLowerCase();
        // البحث عن الكلمة المفتاحية في النص (جزئي أو كامل)
        if (textLower.includes(keywordLower)) {
          return reply;
        }
      }
    }

    return null;
  }

  /**
   * معالجة أمر إضافة رد جديد
   */
  async handleAddReply(ctx) {
    // التحقق من أن الأمر في مجموعة
    if (!this.isGroup(ctx)) {
      return ctx.reply('❌ هذا الأمر يعمل فقط في المجموعات!');
    }

    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name || ctx.from?.username || 'مستخدم';
    const messageText = ctx.message?.text || '';

    // التحقق من صلاحيات الأدمن
    const isAdmin = await this.isUserAdmin(ctx, userId);
    if (!isAdmin) {
      return ctx.reply('❌ هذا الأمر للأدمنز فقط!');
    }

    // استخراج الكلمة والرد من الرسالة
    // الصيغة: /addreply keyword | reply
    // أو: /addreply keyword - reply
    const args = messageText.replace('/addreply', '').trim();

    if (!args) {
      return ctx.reply(
        '📝 *طريقة الاستخدام:*\n' +
        '/addreply [الكلمة المفتاحية] [الرد]\n\n' +
        '_مثال:_\n/addreply مرحبا أهلاً وسهلاً بك\n' +
        '/addreply سلام - مرحباً بك عزيزي!\n\n' +
        '*للإضافة كلمات متعددة:*\n/addreply مرحبا,السلام أهلاً وسهلاً',
        { parse_mode: 'Markdown' }
      );
    }

    // تحليل المدخلات - دعم صيغتين:
    // 1. keyword | reply
    // 2. keyword - reply
    let keyword, replyText;
    let keywords = [];

    // محاولة استخدام الفاصل |
    if (args.includes('|')) {
      const parts = args.split('|');
      keyword = parts[0].trim();
      replyText = parts.slice(1).join('|').trim();
    }
    //尝试使用 الفاصل -
    else if (args.includes('-')) {
      const parts = args.split('-');
      keyword = parts[0].trim();
      replyText = parts.slice(1).join('-').trim();
    }
    // صيغة افتراضية: الكلمة الأولى هي keyword والباقي هو reply
    else {
      const spaceIndex = args.indexOf(' ');
      if (spaceIndex === -1) {
        return ctx.reply('❌ يرجى إدخال الكلمة المفتاحية والرد!\n\n/m addreply للعرض');
      }
      keyword = args.substring(0, spaceIndex);
      replyText = args.substring(spaceIndex + 1).trim();
    }

    if (!keyword || !replyText) {
      return ctx.reply('❌ يرجى إدخال الكلمة المفتاحية والرد بشكل صحيح!');
    }

    // دعم كلمات متعددة مفصولة بفاصلة
    keywords = keyword.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keywords.length === 0) {
      return ctx.reply('❌ يرجى إدخال كلمة مفتاحية صالحة!');
    }

    // الحصول على إعدادات المجموعة
    const settings = await this.getSmartReplySettings(chatId);

    // التحقق من وجود رد بنفس الكلمة المفتاحية
    const existingReply = settings.replies.find(reply =>
      reply.keywords.some(k => keywords.includes(k.toLowerCase()))
    );

    if (existingReply) {
      return ctx.reply(
        '*يوجد رد بنفس الكلمة المفتاحية:*\n' +
        `الكلمات: ${  existingReply.keywords.join(', ')  }\n` +
        `الرد: ${  existingReply.replyText  }\n\n` +
        '_احذف الرد أولاً باستخدام /delreply ثم أضفه من جديد_',
        { parse_mode: 'Markdown' }
      );
    }

    // إضافة رد جديد
    const newReply = {
      replyId: `reply_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`,
      keywords: keywords.map(k => k.toLowerCase()),
      replyText: replyText,
      addedBy: userId,
      addedByName: userName,
      addedAt: new Date(),
      useCount: 0
    };

    settings.replies.push(newReply);
    settings.stats.totalReplies = settings.replies.length;
    await settings.save();

    // إرسال رسالة نجاح
    const keywordsList = keywords.join(', ');
    const successMessage = '*تم إضافة الرد بنجاح!\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `الكلمات المفتاحية: ${  keywordsList  }\n` +
      `الرد: ${  replyText  }\n` +
      `أضافه: ${  userName  }\n` +
      '━━━━━━━━━━━━━━━━━━';

    try {
      await ctx.reply(successMessage, { parse_mode: 'Markdown' });
    } catch (e) {
      await ctx.reply(successMessage.replace(/[*_]/g, ''));
    }

    return true;
  }

  /**
   * معالجة أمر حذف رد
   */
  async handleDeleteReply(ctx) {
    // التحقق من أن الأمر في مجموعة
    if (!this.isGroup(ctx)) {
      return ctx.reply('❌ هذا الأمر يعمل فقط في المجموعات!');
    }

    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const messageText = ctx.message?.text || '';

    // التحقق من صلاحيات الأدمن
    const isAdmin = await this.isUserAdmin(ctx, userId);
    if (!isAdmin) {
      return ctx.reply('❌ هذا الأمر للأدمنز فقط!');
    }

    // استخراج معرف الرد أو الكلمة المفتاحية
    const args = messageText.replace('/delreply', '').trim();

    if (!args) {
      return ctx.reply(
        '📝 *طريقة الاستخدام:*\n' +
        '/delreply [معرف الرد] أو [كلمة مفتاحية]\n\n' +
        '_مثال:_\n/delreply reply_123456789\n/delreply مرحبا\n\n' +
        '_عرض قائمة الردود: /replies_',
        { parse_mode: 'Markdown' }
      );
    }

    // الحصول على إعدادات المجموعة
    const settings = await this.getSmartReplySettings(chatId);

    // البحث عن الرد المراد حذفه
    let replyToDelete = null;
    let deleteBy = '';

    // محاولة البحث بالـ ID
    replyToDelete = settings.replies.find(r => r.replyId === args);
    if (replyToDelete) {
      deleteBy = 'معرف الرد';
    }

    // إذا لم يُعثر عليه، البحث بالكلمة المفتاحية
    if (!replyToDelete) {
      replyToDelete = settings.replies.find(r =>
        r.keywords.some(k => k.toLowerCase() === args.toLowerCase())
      );
      if (replyToDelete) {
        deleteBy = 'الكلمة المفتاحية';
      }
    }

    if (!replyToDelete) {
      return ctx.reply(
        '❌ لم يتم العثور على رد مطابق!\n' +
        '_استخدم /replies لعرض قائمة الردود_',
        { parse_mode: 'Markdown' }
      );
    }

    // حذف الرد
    settings.replies = settings.replies.filter(r => r.replyId !== replyToDelete.replyId);
    settings.stats.totalReplies = settings.replies.length;
    await settings.save();

    // إرسال رسالة نجاح
    const successMessage = '*تم حذف الرد بنجاح!\n' +
      `━━━━━━━━━━━━━━━━━━\n${
        deleteBy  }: ${  args  }\n` +
      `الرد المحذوف: ${  replyToDelete.replyText  }\n` +
      '━━━━━━━━━━━━━━━━━━';

    try {
      await ctx.reply(successMessage, { parse_mode: 'Markdown' });
    } catch (e) {
      await ctx.reply(successMessage.replace(/[*_]/g, ''));
    }

    return true;
  }

  /**
   * معالجة أمر عرض قائمة الردود
   */
  async handleListReplies(ctx) {
    // التحقق من أن الأمر في مجموعة
    if (!this.isGroup(ctx)) {
      return ctx.reply('❌ هذا الأمر يعمل فقط في المجموعات!');
    }

    const chatId = ctx.chat?.id;
    const messageText = ctx.message?.text || '';
    const userId = ctx.from?.id;

    // استخراج الوضع (on/off/list)
    const args = messageText.replace('/replies', '').trim().toLowerCase();

    // التحقق من صلاحيات الأدمن للتعطيل/التعطيل
    if (args === 'on' || args === 'off') {
      const isAdmin = await this.isUserAdmin(ctx, userId);
      if (!isAdmin) {
        return ctx.reply('❌ هذا الأمر للأدمنز فقط!');
      }

      const settings = await this.getSmartReplySettings(chatId);
      const newStatus = args === 'on';
      settings.enabled = newStatus;
      await settings.save();

      const statusText = newStatus ? '✅ تم تفعيل نظام الردود الذكية!' : '❌ تم تعطيل نظام الردود الذكية!';
      return ctx.reply(statusText);
    }

    // عرض قائمة الردود
    const settings = await this.getSmartReplySettings(chatId);

    if (!settings.enabled) {
      return ctx.reply('❌ نظام الردود الذكية معطل حالياً!\n_استخدم /replies on للتفعيل_', { parse_mode: 'Markdown' });
    }

    if (settings.replies.length === 0) {
      return ctx.reply(
        '📝 *لا توجد ردود مضافة*\n' +
        '_أضف ردوداً جديدة باستخدام /addreply_',
        { parse_mode: 'Markdown' }
      );
    }

    // إنشاء قائمة الردود
    let replyList = '*قائمة الردود الذكية*\n';
    replyList += '━━━━━━━━━━━━━━━━━━\n';
    replyList += 'الحالة: مفعل\n';
    replyList += `عدد الردود: ${settings.replies.length}\n`;
    replyList += '━━━━━━━━━━━━━━━━━━\n\n';

    settings.replies.forEach((reply) => {
      const keywords = reply.keywords.join(', ');
      const shortReply = reply.replyText.length > 50
        ? `${reply.replyText.substring(0, 50)  }...`
        : reply.replyText;

      replyList += `الكلمات: ${  keywords  }\n`;
      replyList += `   الرد: ${  shortReply  }\n`;
      replyList += `   مرات الاستخدام: ${  reply.useCount  }\n\n`;
    });

    replyList += '━━━━━━━━━━━━━━━━━━\n';
    replyList += '*الأوامر:*\n';
    replyList += '/addreply - إضافة رد\n';
    replyList += '/delreply - حذف رد\n';
    replyList += '/replies off - تعطيل\n';
    replyList += '/replies on - تفعيل';

    try {
      await ctx.reply(replyList, { parse_mode: 'Markdown' });
    } catch (e) {
      // إرسال بدون تنسيق إذا فشل
      const plainList = replyList.replace(/[*_]/g, '');
      await ctx.reply(plainList);
    }

    return true;
  }
}

module.exports = SmartRepliesManager;
