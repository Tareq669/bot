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
          groupTitle: ctx.chat.title || 'Unknown Group',
          groupType: ctx.chat.type || 'group',
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
    const value = String(raw || '').trim();
    if (!value) return '';
    return /^-?\d+$/.test(value) ? value : '';
  }

  static async handleSetTargetGroup(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await GroupAdminHandler.isGroupAdmin(ctx);
    if (!isAdmin) {
      return ctx.reply('❌ هذا الأمر للمالك أو مشرفي القروب فقط.');
    }

    const text = String(ctx.message?.text || '').trim();
    const match = /^(?:\/)?(?:ضبط_الشكاوى|تعيين\s*قروب\s*الشكاوى|setcomplaints)\s+(-?\d+)$/i.exec(text);
    if (!match) {
      return ctx.reply('❌ الصيغة:\nضبط_الشكاوى -1001234567890');
    }

    const targetChatId = this.normalizeTargetChatId(match[1]);
    if (!targetChatId) {
      return ctx.reply('❌ معرف قروب الشكاوى غير صالح.');
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
    const match = /^(?:\/)?شكوى(?:\s+(.+))?$/i.exec(text);
    if (!match) return;

    const complaintText = String(match[1] || '').trim();
    if (!complaintText) {
      return ctx.reply('❌ اكتب الشكوى بهذا الشكل:\nشكوى نص الشكوى');
    }

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

    const lines = [
      '📩 شكوى جديدة',
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
    lines.push(`• نص الشكوى:\n${complaintText}`);

    try {
      await ctx.telegram.sendMessage(targetChatId, lines.join('\n'));
      return ctx.reply('✅ تم إرسال شكواك للإدارة.');
    } catch (_error) {
      return ctx.reply('❌ تعذر إرسال الشكوى. تأكد أن البوت موجود في قروب الشكاوى ويمتلك صلاحية الإرسال.');
    }
  }
}

module.exports = ComplaintHandler;
