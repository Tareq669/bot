const { Group } = require('../database/models');
const GroupAdminHandler = require('./groupAdminHandler');

class ComplaintHandler {
  static isGroupChat(ctx) {
    return ['group', 'supergroup'].includes(String(ctx?.chat?.type || ''));
  }

  static async ensureGroupRecord(ctx) {
    if (!this.isGroupChat(ctx)) return null;
    const groupId = String(ctx.chat.id);
    return Group.findOneAndUpdate(
      { groupId },
      {
        $setOnInsert: {
          groupId,
          createdAt: new Date()
        },
        $set: {
          groupTitle: ctx.chat.title || 'Unknown Group',
          groupType: ctx.chat.type || 'group',
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }

  static normalizeTargetChatId(raw = '') {
    const value = String(raw || '')
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .trim();
    if (!value) return '';
    return /^-?\d+$/.test(value) ? value : '';
  }

  static extractSetComplaintsTarget(text = '') {
    const trimmed = String(text || '').trim();
    const match = /^(?:\/)?(?:ضبط_الشكاوى|تعيين\s*قروب\s*الشكاوى|setcomplaints)(?:@\w+)?\s+(.+)$/i.exec(trimmed);
    if (!match) return '';
    const firstArg = String(match[1] || '').trim().split(/\s+/)[0] || '';
    return this.normalizeTargetChatId(firstArg);
  }

  static async handleSetTargetGroup(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await GroupAdminHandler.isGroupAdmin(ctx);
    if (!isAdmin) {
      return ctx.reply('❌ هذا الأمر للمالك أو مشرفي القروب فقط.');
    }

    const text = String(ctx.message?.text || '').trim();
    const targetChatId = this.extractSetComplaintsTarget(text);
    if (!targetChatId) {
      return ctx.reply('❌ الصيغة:\nضبط_الشكاوى -1001234567890');
    }

    const group = await this.ensureGroupRecord(ctx);
    if (!group.settings) group.settings = {};
    group.settings.complaintsEnabled = true;
    group.settings.complaintsTargetChatId = targetChatId;
    await group.save();

    return ctx.reply(`✅ تم ضبط قروب استقبال الشكاوى:\n${targetChatId}`);
  }

  static async handleDisableComplaints(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await GroupAdminHandler.isGroupAdmin(ctx);
    if (!isAdmin) {
      return ctx.reply('❌ هذا الأمر للمالك أو مشرفي القروب فقط.');
    }

    const group = await this.ensureGroupRecord(ctx);
    if (!group.settings) group.settings = {};
    group.settings.complaintsEnabled = false;
    group.settings.complaintsTargetChatId = '';
    await group.save();

    return ctx.reply('✅ تم تعطيل استقبال الشكاوى لهذا القروب.');
  }

  static async handleComplaintSubmit(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const text = String(ctx.message?.text || '').trim();
    const match = /^(?:\/)?شكوى(?:@\w+)?(?:\s+(.+))?$/i.exec(text);
    if (!match) return;

    const messageText = String(match[1] || '').trim();
    if (!messageText) {
      return ctx.reply('❌ اكتب الشكوى بهذا الشكل:\nشكوى نص الشكوى');
    }
    return this.submitToComplaintsTarget(ctx, {
      title: '📩 شكوى جديدة',
      successMessage: '✅ تم إرسال شكواك للإدارة.',
      messageLabel: '• نص الشكوى',
      messageText
    });
  }

  static async handleBugSubmit(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const text = String(ctx.message?.text || '').trim();
    const match = /^(?:\/)?(?:خلل|عطل|bugreport)(?:@\w+)?(?:\s+(.+))?$/i.exec(text);
    if (!match) return;

    const messageText = String(match[1] || '').trim();
    if (!messageText) {
      return ctx.reply('❌ اكتب البلاغ بهذا الشكل:\nخلل نص المشكلة');
    }
    return this.submitToComplaintsTarget(ctx, {
      title: '🛠️ بلاغ خلل جديد',
      successMessage: '✅ تم إرسال بلاغ الخلل للإدارة.',
      messageLabel: '• وصف الخلل',
      messageText
    });
  }

  static async submitToComplaintsTarget(ctx, options = {}) {
    const group = await this.ensureGroupRecord(ctx);
    const enabled = Boolean(group?.settings?.complaintsEnabled);
    const targetChatId = this.normalizeTargetChatId(group?.settings?.complaintsTargetChatId || '');
    if (!enabled || !targetChatId) {
      return ctx.reply('ℹ️ نظام الشكاوى غير مفعل في هذا القروب. اطلب من المشرف تفعيله.');
    }

    const from = ctx.from || {};
    const fromName = [from.first_name, from.last_name].filter(Boolean).join(' ').trim() || from.username || String(from.id || '');
    const repliedUser = ctx.message?.reply_to_message?.from || null;
    const repliedName = repliedUser
      ? ([repliedUser.first_name, repliedUser.last_name].filter(Boolean).join(' ').trim() || repliedUser.username || String(repliedUser.id || ''))
      : '';
    const sourceGroupTitle = String(ctx.chat?.title || 'Unknown Group').trim();
    const createdAt = new Date().toLocaleString('en-GB', { hour12: false });
    const title = String(options.title || '📩 شكوى جديدة');
    const successMessage = String(options.successMessage || '✅ تم إرسال رسالتك للإدارة.');
    const messageLabel = String(options.messageLabel || '• الرسالة');
    const messageText = String(options.messageText || '').trim();
    const sendErrorMessage = String(options.sendErrorMessage || '❌ تعذر إرسال الرسالة. تأكد أن البوت موجود في قروب الشكاوى ويمتلك صلاحية الإرسال.');

    const lines = [
      title,
      '',
      `• القروب: ${sourceGroupTitle}`,
      `• معرف القروب: ${ctx.chat?.id || ''}`,
      `• المشتكي: ${fromName}`,
      `• معرف المشتكي: ${from.id || ''}`
    ];
    if (repliedUser?.id) {
      lines.push(`• المشتكى عليه: ${repliedName}`);
      lines.push(`• معرف المشتكى عليه: ${repliedUser.id}`);
    }
    lines.push(`• الوقت: ${createdAt}`);
    lines.push('');
    lines.push(`${messageLabel}:\n${messageText}`);

    try {
      await ctx.telegram.sendMessage(targetChatId, lines.join('\n'));
      return ctx.reply(successMessage);
    } catch (_error) {
      return ctx.reply(sendErrorMessage);
    }
  }
}

module.exports = ComplaintHandler;
