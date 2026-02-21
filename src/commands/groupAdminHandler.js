const Markup = require('telegraf/markup');
const { Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

class GroupAdminHandler {
  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static async ensureGroupRecord(ctx) {
    if (!this.isGroupChat(ctx)) return null;

    const groupId = String(ctx.chat.id);
    const groupTitle = ctx.chat.title || 'Unknown Group';
    const groupType = ctx.chat.type || 'group';

    return Group.findOneAndUpdate(
      { groupId },
      {
        $set: {
          groupTitle,
          groupType,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }

  static async isGroupAdmin(ctx, userId = null) {
    if (!this.isGroupChat(ctx)) return false;

    const targetUserId = userId || ctx.from?.id;
    if (!targetUserId) return false;

    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, targetUserId);
      return ['creator', 'administrator'].includes(member.status);
    } catch (_error) {
      return false;
    }
  }

  static async getBotMember(ctx) {
    try {
      return await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    } catch (_error) {
      return null;
    }
  }

  static async ensureBotModerationRights(ctx) {
    const botMember = await this.getBotMember(ctx);
    if (!botMember || !['administrator', 'creator'].includes(botMember.status)) {
      return {
        ok: false,
        message: '❌ يجب ترقية البوت إلى مشرف وتفعيل صلاحيات الحذف/الحظر/التقييد.'
      };
    }
    return { ok: true, botMember };
  }

  static getRepliedUserId(ctx) {
    return ctx.message?.reply_to_message?.from?.id || null;
  }

  static getRepliedUserLabel(ctx) {
    const user = ctx.message?.reply_to_message?.from;
    if (!user) return 'المستخدم';
    return user.first_name || user.username || String(user.id);
  }

  static parseCommandArgs(ctx) {
    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    return parts.slice(1);
  }

  static async addModerationLog(group, action, actorId, targetId = null, reason = '', metadata = null) {
    group.moderationLogs = Array.isArray(group.moderationLogs) ? group.moderationLogs : [];
    group.moderationLogs.unshift({
      action,
      actorId,
      targetId,
      reason: reason || '',
      metadata: metadata || null,
      createdAt: new Date()
    });

    if (group.moderationLogs.length > 100) {
      group.moderationLogs = group.moderationLogs.slice(0, 100);
    }
  }

  static formatGroupPanel(group) {
    const settings = group?.settings || {};
    return (
      '🛡️ <b>لوحة إدارة الجروب</b>\n\n' +
      `👥 المجموعة: <b>${group?.groupTitle || 'Unknown'}</b>\n` +
      `🆔 المعرف: <code>${group?.groupId || 'N/A'}</code>\n\n` +
      '<b>الإعدادات الحالية:</b>\n' +
      `• منع الروابط: ${settings.lockLinks ? '✅' : '❌'}\n` +
      `• فلتر الكلمات: ${settings.filterBadWords ? '✅' : '❌'}\n` +
      `• حماية التكرار: ${settings.floodProtection ? '✅' : '❌'}\n\n` +
      '<b>أوامر الإدارة:</b>\n' +
      '• /gwarn (بالرد)\n' +
      '• /gwarns (بالرد)\n' +
      '• /gmute 10 (بالرد)\n' +
      '• /gunmute (بالرد)\n' +
      '• /gban (بالرد)\n' +
      '• /gunban 123456\n' +
      '• /gunwarn (بالرد)\n' +
      '• /gresetwarn (بالرد)\n' +
      '• /glogs\n' +
      '• /gclear (بالرد)'
    );
  }

  static groupPanelKeyboard(group) {
    const lockLinks = Boolean(group?.settings?.lockLinks);
    const filterBadWords = Boolean(group?.settings?.filterBadWords);
    const floodProtection = Boolean(group?.settings?.floodProtection);

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(lockLinks ? '🔓 روابط' : '🔒 روابط', 'group:toggle:lockLinks'),
        Markup.button.callback(filterBadWords ? '🔓 كلمات' : '🔒 كلمات', 'group:toggle:filterBadWords')
      ],
      [
        Markup.button.callback(floodProtection ? '🔓 تكرار' : '🔒 تكرار', 'group:toggle:floodProtection')
      ],
      [
        Markup.button.callback('📊 إحصائيات', 'group:stats'),
        Markup.button.callback('ℹ️ مساعدة', 'group:help')
      ]
    ]);
  }

  static async handleGroupStart(ctx) {
    if (!this.isGroupChat(ctx)) return;
    await this.ensureGroupRecord(ctx);

    return ctx.reply(
      '✅ تم تفعيل وضع الجروبات.\n' +
      'استخدم /gpanel لعرض لوحة الإدارة.\n' +
      'ملاحظة: ميزات الخاص لا تعمل هنا.'
    );
  }

  static async handleGroupHelp(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return ctx.reply(
      '<b>مساعدة إدارة الجروب</b>\n\n' +
      '• /gpanel لوحة الإدارة\n' +
      '• /gwarn تحذير بالرد\n' +
      '• /gwarns عرض التحذيرات بالرد\n' +
      '• /gmute 10 كتم بالدقائق بالرد\n' +
      '• /gunmute فك كتم بالرد\n' +
      '• /gban حظر بالرد\n' +
      '• /gunban 123456 رفع حظر\n' +
      '• /gunwarn إزالة تحذير واحد (بالرد)\n' +
      '• /gresetwarn تصفير التحذيرات (بالرد)\n' +
      '• /glogs عرض سجل الإدارة\n' +
      '• /gclear حذف رسالة بالرد',
      { parse_mode: 'HTML' }
    );
  }

  static async handleGroupPanel(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const botRights = await this.ensureBotModerationRights(ctx);
    const botStatus = botRights.ok
      ? '\n\n✅ وضع الإدارة: البوت يملك صلاحيات الإدارة.'
      : `\n\n⚠️ ${botRights.message}`;

    return ctx.reply(this.formatGroupPanel(group) + botStatus, {
      parse_mode: 'HTML',
      reply_markup: this.groupPanelKeyboard(group).reply_markup
    });
  }

  static async handleToggleSetting(ctx, key) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ للمشرفين فقط', { show_alert: false });
      return;
    }

    const allowedKeys = new Set(['lockLinks', 'filterBadWords', 'floodProtection']);
    if (!allowedKeys.has(key)) {
      await ctx.answerCbQuery('❌ إعداد غير معروف', { show_alert: false });
      return;
    }

    const group = await this.ensureGroupRecord(ctx);
    const current = Boolean(group.settings?.[key]);
    group.settings[key] = !current;
    await this.addModerationLog(
      group,
      'toggle_setting',
      ctx.from.id,
      null,
      `${key} => ${group.settings[key] ? 'on' : 'off'}`
    );
    group.updatedAt = new Date();
    await group.save();

    await ctx.answerCbQuery('✅ تم التحديث', { show_alert: false });

    try {
      await ctx.editMessageText(this.formatGroupPanel(group), {
        parse_mode: 'HTML',
        reply_markup: this.groupPanelKeyboard(group).reply_markup
      });
    } catch (_error) {
      await ctx.reply(this.formatGroupPanel(group), {
        parse_mode: 'HTML',
        reply_markup: this.groupPanelKeyboard(group).reply_markup
      });
    }
  }

  static async handleGroupStats(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);

    const warningsCount = Array.isArray(group.warnings)
      ? group.warnings.reduce((sum, item) => sum + (item.count || 0), 0)
      : 0;

    const bannedCount = Array.isArray(group.bannedUsers) ? group.bannedUsers.length : 0;

    const message =
      '📊 <b>إحصائيات الجروب</b>\n\n' +
      `👥 الاسم: <b>${group.groupTitle}</b>\n` +
      `⚠️ مجموع التحذيرات: <b>${warningsCount}</b>\n` +
      `🚫 المحظورون: <b>${bannedCount}</b>\n` +
      `💬 الرسائل: <b>${group.statistics?.messagesCount || 0}</b>`;

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('✅', { show_alert: false });
      return ctx.reply(message, { parse_mode: 'HTML' });
    }

    return ctx.reply(message, { parse_mode: 'HTML' });
  }

  static async handleWarnCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم للتحذير.');
    if (targetUserId === ctx.from.id) return ctx.reply('❌ لا يمكنك تحذير نفسك.');

    const targetIsAdmin = await this.isGroupAdmin(ctx, targetUserId);
    if (targetIsAdmin) return ctx.reply('❌ لا يمكن تحذير مشرف.');

    const args = this.parseCommandArgs(ctx);
    const reason = args.length > 0 ? args.join(' ') : 'مخالفة قواعد الجروب';

    const group = await this.ensureGroupRecord(ctx);
    let warning = group.warnings.find((w) => w.userId === targetUserId);
    if (!warning) {
      warning = { userId: targetUserId, count: 0, lastWarning: new Date() };
      group.warnings.push(warning);
    }

    warning.count += 1;
    warning.lastWarning = new Date();
    await this.addModerationLog(group, 'warn', ctx.from.id, targetUserId, reason, {
      warningCount: warning.count
    });
    group.updatedAt = new Date();
    await group.save();

    const label = this.getRepliedUserLabel(ctx);
    await ctx.reply(`⚠️ تم تحذير ${label}\nالسبب: ${reason}\nالتحذيرات: ${warning.count}/3`);

    if (warning.count >= 3) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, targetUserId);
        await ctx.reply(`🚫 تم حظر ${label} تلقائيًا بعد 3 تحذيرات.`);
        group.bannedUsers.push({
          userId: targetUserId,
          reason: 'تجاوز 3 تحذيرات',
          bannedAt: new Date(),
          bannedBy: ctx.from.id
        });
        await this.addModerationLog(
          group,
          'auto_ban_after_warnings',
          ctx.from.id,
          targetUserId,
          'تجاوز 3 تحذيرات'
        );
        await group.save();
      } catch (_error) {
        await ctx.reply('❌ فشل الحظر التلقائي. تأكد من صلاحيات البوت.');
      }
    }
  }

  static async handleWarnsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لعرض تحذيراته.');

    const group = await this.ensureGroupRecord(ctx);
    const warning = group.warnings.find((w) => w.userId === targetUserId);
    const count = warning?.count || 0;
    const label = this.getRepliedUserLabel(ctx);

    return ctx.reply(`📌 تحذيرات ${label}: ${count}/3`);
  }

  static async handleUnwarnCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لإزالة تحذير.');

    const group = await this.ensureGroupRecord(ctx);
    const warning = group.warnings.find((w) => Number(w.userId) === Number(targetUserId));
    const label = this.getRepliedUserLabel(ctx);

    if (!warning || warning.count <= 0) {
      return ctx.reply(`ℹ️ لا توجد تحذيرات على ${label}.`);
    }

    warning.count = Math.max(0, warning.count - 1);
    warning.lastWarning = new Date();
    await this.addModerationLog(group, 'unwarn', ctx.from.id, targetUserId, 'remove one warning', {
      warningCount: warning.count
    });
    await group.save();

    return ctx.reply(`✅ تم إزالة تحذير من ${label}. التحذيرات الحالية: ${warning.count}/3`);
  }

  static async handleResetWarnCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لتصفير التحذيرات.');

    const group = await this.ensureGroupRecord(ctx);
    const warning = group.warnings.find((w) => Number(w.userId) === Number(targetUserId));
    const label = this.getRepliedUserLabel(ctx);

    if (!warning) {
      return ctx.reply(`ℹ️ لا توجد تحذيرات على ${label}.`);
    }

    warning.count = 0;
    warning.lastWarning = new Date();
    await this.addModerationLog(group, 'reset_warn', ctx.from.id, targetUserId, 'reset warnings');
    await group.save();

    return ctx.reply(`✅ تم تصفير تحذيرات ${label}.`);
  }

  static async handleLogsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const logs = Array.isArray(group.moderationLogs) ? group.moderationLogs.slice(0, 15) : [];

    if (logs.length === 0) {
      return ctx.reply('ℹ️ لا يوجد سجل إداري بعد.');
    }

    let message = '📜 <b>سجل الإدارة (آخر 15 إجراء)</b>\n\n';
    logs.forEach((log, index) => {
      const time = new Date(log.createdAt || Date.now()).toLocaleString('ar');
      const actor = log.actorId ? `<code>${log.actorId}</code>` : '-';
      const target = log.targetId ? `<code>${log.targetId}</code>` : '-';
      const reason = log.reason ? ` | ${log.reason}` : '';
      message += `${index + 1}. ${log.action}\n👤 ${actor} -> ${target}\n🕒 ${time}${reason}\n\n`;
    });

    return ctx.reply(message.trim(), { parse_mode: 'HTML' });
  }

  static async handleMuteCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم للكتم.');

    const targetIsAdmin = await this.isGroupAdmin(ctx, targetUserId);
    if (targetIsAdmin) return ctx.reply('❌ لا يمكن كتم مشرف.');

    const args = this.parseCommandArgs(ctx);
    const minutes = Math.max(1, parseInt(args[0] || '10', 10) || 10);
    const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;

    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, targetUserId, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false,
        until_date: untilDate
      });
      const group = await this.ensureGroupRecord(ctx);
      await this.addModerationLog(group, 'mute', ctx.from.id, targetUserId, `duration=${minutes}m`);
      await group.save();
      return ctx.reply(`🔇 تم كتم المستخدم لمدة ${minutes} دقيقة.`);
    } catch (_error) {
      return ctx.reply('❌ فشل الكتم. تأكد من صلاحيات البوت.');
    }
  }

  static async handleUnmuteCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لفك الكتم.');

    try {
      await ctx.telegram.restrictChatMember(ctx.chat.id, targetUserId, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false,
        can_manage_topics: false
      });
      const group = await this.ensureGroupRecord(ctx);
      await this.addModerationLog(group, 'unmute', ctx.from.id, targetUserId);
      await group.save();
      return ctx.reply('🔊 تم فك كتم المستخدم.');
    } catch (_error) {
      return ctx.reply('❌ فشل فك الكتم. تأكد من صلاحيات البوت.');
    }
  }

  static async handleBanCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم للحظر.');

    const targetIsAdmin = await this.isGroupAdmin(ctx, targetUserId);
    if (targetIsAdmin) return ctx.reply('❌ لا يمكن حظر مشرف.');

    const args = this.parseCommandArgs(ctx);
    const reason = args.length > 0 ? args.join(' ') : 'مخالفة قواعد الجروب';

    try {
      await ctx.telegram.banChatMember(ctx.chat.id, targetUserId);
      const group = await this.ensureGroupRecord(ctx);
      group.bannedUsers.push({
        userId: targetUserId,
        reason,
        bannedAt: new Date(),
        bannedBy: ctx.from.id
      });
      await this.addModerationLog(group, 'ban', ctx.from.id, targetUserId, reason);
      await group.save();
      return ctx.reply('🚫 تم حظر المستخدم.');
    } catch (_error) {
      return ctx.reply('❌ فشل الحظر. تأكد من صلاحيات البوت.');
    }
  }

  static async handleUnbanCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const args = this.parseCommandArgs(ctx);
    const targetUserId = parseInt(args[0] || '', 10);
    if (!targetUserId) return ctx.reply('❌ استخدم: /gunban USER_ID');

    try {
      await ctx.telegram.unbanChatMember(ctx.chat.id, targetUserId, { only_if_banned: true });
      const group = await this.ensureGroupRecord(ctx);
      group.bannedUsers = group.bannedUsers.filter((u) => Number(u.userId) !== Number(targetUserId));
      await this.addModerationLog(group, 'unban', ctx.from.id, targetUserId);
      await group.save();
      return ctx.reply('✅ تم إلغاء حظر المستخدم.');
    } catch (_error) {
      return ctx.reply('❌ فشل إلغاء الحظر. تأكد من صلاحيات البوت.');
    }
  }

  static async handleClearCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return ctx.reply(botRights.message);

    const repliedMessageId = ctx.message?.reply_to_message?.message_id;
    if (!repliedMessageId) {
      return ctx.reply('❌ استخدم /gclear بالرد على الرسالة المطلوب حذفها.');
    }

    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, repliedMessageId);
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
      const group = await this.ensureGroupRecord(ctx);
      await this.addModerationLog(group, 'clear_message', ctx.from.id, this.getRepliedUserId(ctx));
      await group.save();
      return;
    } catch (_error) {
      return ctx.reply('❌ فشل حذف الرسالة.');
    }
  }

  static async handleGroupCallback(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const data = ctx.callbackQuery?.data || '';
    if (!data.startsWith('group:')) return;

    if (data === 'group:help') {
      await ctx.answerCbQuery('ℹ️', { show_alert: false });
      return this.handleGroupHelp(ctx);
    }

    if (data === 'group:stats') {
      return this.handleGroupStats(ctx);
    }

    if (data.startsWith('group:toggle:')) {
      const key = data.split(':')[2];
      return this.handleToggleSetting(ctx, key);
    }

    await ctx.answerCbQuery('❌ إجراء غير معروف', { show_alert: false });
  }

  static async processGroupMessage(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    if (!ctx.message?.text) return false;

    const group = await this.ensureGroupRecord(ctx);
    group.statistics = group.statistics || {};
    group.statistics.messagesCount = (group.statistics.messagesCount || 0) + 1;
    group.updatedAt = new Date();
    await group.save();

    const isAdmin = await this.isGroupAdmin(ctx);
    if (isAdmin) return false;

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return false;

    const text = ctx.message.text;

    if (group.settings?.lockLinks) {
      const hasLink = /(https?:\/\/|t\.me\/|www\.)/i.test(text);
      if (hasLink) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          await this.addModerationLog(group, 'delete_link_message', ctx.botInfo.id, ctx.from.id, 'link blocked');
          await group.save();
          await ctx.reply('🔒 الروابط ممنوعة في هذا الجروب.');
        } catch (_error) {
          await ctx.reply('⚠️ تم اكتشاف رابط لكن لا يمكن حذفه. فعّل صلاحية حذف الرسائل للبوت.');
        }
        return true;
      }
    }

    if (group.settings?.filterBadWords) {
      const blockedWords = ['سب', 'شتيمة', 'كلمة_ممنوعة'];
      const found = blockedWords.some((w) => text.includes(w));
      if (found) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          await this.addModerationLog(group, 'delete_badword_message', ctx.botInfo.id, ctx.from.id, 'blocked word');
          await group.save();
          await ctx.reply('⚠️ تم حذف رسالة تحتوي على ألفاظ غير مسموحة.');
        } catch (_error) {
          await ctx.reply('⚠️ تم اكتشاف لفظ غير مسموح لكن لا يمكن الحذف. فعّل صلاحية حذف الرسائل للبوت.');
        }
        return true;
      }
    }

    return false;
  }
}

module.exports = GroupAdminHandler;
