const Markup = require('telegraf/markup');
const { Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

class GroupAdminHandler {
  static pendingAdminStats = new Map();

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static async ensureGroupRecord(ctx) {
    if (!this.isGroupChat(ctx)) return null;

    const groupId = String(ctx.chat.id);
    const groupTitle = ctx.chat.title || 'Unknown Group';
    const groupType = ctx.chat.type || 'group';

    const group = await Group.findOneAndUpdate(
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
    this.normalizeGroupState(group);
    return group;
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

  static getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
  }

  static async getChatMemberSafe(ctx, userId) {
    try {
      return await ctx.telegram.getChatMember(ctx.chat.id, Number(userId));
    } catch (_error) {
      return null;
    }
  }

  static async isPrimaryOwner(ctx, userId = null) {
    if (!this.isGroupChat(ctx)) return false;
    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;

    const member = await this.getChatMemberSafe(ctx, targetUserId);
    if (member?.status === 'creator') return true;

    const group = await this.ensureGroupRecord(ctx);
    return Number(group.settings?.primaryOwnerId || 0) === targetUserId;
  }

  static async isOwnerOrBasic(ctx, userId = null) {
    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;
    if (await this.isPrimaryOwner(ctx, targetUserId)) return true;
    const group = await this.ensureGroupRecord(ctx);
    return Number(group.settings?.basicOwnerId || 0) === targetUserId;
  }

  static async resolveTargetUser(ctx, args = []) {
    const replied = ctx.message?.reply_to_message?.from;
    if (replied?.id) {
      return {
        id: Number(replied.id),
        firstName: replied.first_name || '',
        username: replied.username || ''
      };
    }

    if (!args.length) return null;
    const first = String(args[0] || '').trim();
    if (!first) return null;

    const numeric = parseInt(first.replace(/^@/, ''), 10);
    if (Number.isInteger(numeric) && numeric > 0) {
      const member = await this.getChatMemberSafe(ctx, numeric);
      return {
        id: numeric,
        firstName: member?.user?.first_name || '',
        username: member?.user?.username || ''
      };
    }

    if (!first.startsWith('@')) return null;

    try {
      const chat = await ctx.telegram.getChat(first);
      if (chat?.id) {
        const member = await this.getChatMemberSafe(ctx, chat.id);
        return {
          id: Number(chat.id),
          firstName: chat.first_name || member?.user?.first_name || '',
          username: chat.username || member?.user?.username || first.replace('@', '')
        };
      }
    } catch (_error) {
      return null;
    }
    return null;
  }

  static getRoleLabel(memberStatus, isPrimaryOwner, isBasicOwner) {
    if (isPrimaryOwner) return 'المالك الاساسي';
    if (isBasicOwner) return 'اساسي';
    if (memberStatus === 'administrator') return 'مشرف';
    if (memberStatus === 'creator') return 'المالك الاساسي';
    return 'عضو';
  }

  static parseReasonFromArgs(args, mode = 'text') {
    const list = Array.isArray(args) ? args : [];
    if (mode === 'mute') {
      if (list.length <= 1) return '';
      return list.slice(1).join(' ').trim();
    }
    return list.join(' ').trim();
  }

  static validateReasonPolicy(group, actorIsPrimaryOwner, reasonText) {
    const enabled = Boolean(group?.settings?.requireReasonsForModeration);
    const reason = String(reasonText || '').trim();
    if (!enabled && reason) {
      return {
        ok: false,
        message: '❌ الأسباب معطلة. لا يمكن تنفيذ الإجراء مع سبب. فعّل الأسباب أولًا.'
      };
    }
    if (enabled && !reason && !actorIsPrimaryOwner) {
      return {
        ok: false,
        message: '❌ يجب كتابة سبب لهذا الإجراء. المالك الأساسي فقط يمكنه التنفيذ بدون سبب.'
      };
    }
    return { ok: true };
  }

  static normalizeGroupState(group) {
    if (!group.settings) group.settings = {};
    if (typeof group.settings.lockLinks !== 'boolean') group.settings.lockLinks = false;
    if (typeof group.settings.filterBadWords !== 'boolean') group.settings.filterBadWords = true;
    if (typeof group.settings.floodProtection !== 'boolean') group.settings.floodProtection = true;

    if (!group.settings.warningPolicy) {
      group.settings.warningPolicy = { enabled: true, muteAt: 2, banAt: 3, muteMinutes: 10 };
    }
    if (typeof group.settings.warningPolicy.enabled !== 'boolean') group.settings.warningPolicy.enabled = true;
    if (!Number.isInteger(group.settings.warningPolicy.muteAt)) group.settings.warningPolicy.muteAt = 2;
    if (!Number.isInteger(group.settings.warningPolicy.banAt)) group.settings.warningPolicy.banAt = 3;
    if (!Number.isInteger(group.settings.warningPolicy.muteMinutes)) group.settings.warningPolicy.muteMinutes = 10;
    if (typeof group.settings.requireReasonsForModeration !== 'boolean') group.settings.requireReasonsForModeration = false;
    if (typeof group.settings.disableGameEngagement !== 'boolean') group.settings.disableGameEngagement = false;
    if (typeof group.settings.notifyAdminLeave !== 'boolean') group.settings.notifyAdminLeave = false;
    if (typeof group.settings.detectForAdminsOnly !== 'boolean') group.settings.detectForAdminsOnly = false;
    if (typeof group.settings.onlineForOwnersOnly !== 'boolean') group.settings.onlineForOwnersOnly = false;
    if (!Number.isInteger(group.settings.primaryOwnerId)) group.settings.primaryOwnerId = null;
    if (!Number.isInteger(group.settings.basicOwnerId)) group.settings.basicOwnerId = null;
    if (!Array.isArray(group.settings.exceptions)) group.settings.exceptions = [];
    if (!group.settings.templates) group.settings.templates = {};
    if (!group.settings.templates.member) group.settings.templates.member = {};
    if (!group.settings.templates.admin) group.settings.templates.admin = {};
    if (!Number.isInteger(group.settings.idealMemberId)) group.settings.idealMemberId = null;
    if (!Number.isInteger(group.settings.idealAdminId)) group.settings.idealAdminId = null;

    if (!Array.isArray(group.warnings)) group.warnings = [];
    if (!Array.isArray(group.bannedUsers)) group.bannedUsers = [];
    if (!Array.isArray(group.moderationLogs)) group.moderationLogs = [];
    if (!group.statistics) group.statistics = {};
    if (!Number.isInteger(group.statistics.messagesCount)) group.statistics.messagesCount = 0;

    return group;
  }

  static getWarningPolicy(group) {
    const policy = group?.settings?.warningPolicy || {};
    return {
      enabled: policy.enabled !== false,
      muteAt: Number.isInteger(policy.muteAt) ? policy.muteAt : 2,
      banAt: Number.isInteger(policy.banAt) ? policy.banAt : 3,
      muteMinutes: Number.isInteger(policy.muteMinutes) ? policy.muteMinutes : 10
    };
  }

  static formatPolicy(policy) {
    if (!policy.enabled) return '❌ معطلة';
    return `✅ مفعلة | كتم عند: ${policy.muteAt} | حظر عند: ${policy.banAt} | مدة الكتم: ${policy.muteMinutes}د`;
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
    const policy = this.getWarningPolicy(group);
    return (
      '🛡️ <b>لوحة إدارة الجروب</b>\n\n' +
      `👥 المجموعة: <b>${group?.groupTitle || 'Unknown'}</b>\n` +
      `🆔 المعرف: <code>${group?.groupId || 'N/A'}</code>\n\n` +
      '<b>الإعدادات الحالية:</b>\n' +
      `• منع الروابط: ${settings.lockLinks ? '✅' : '❌'}\n` +
      `• فلتر الكلمات: ${settings.filterBadWords ? '✅' : '❌'}\n` +
      `• حماية التكرار: ${settings.floodProtection ? '✅' : '❌'}\n` +
      `• سياسة العقوبات: ${this.formatPolicy(policy)}\n\n` +
      '<b>أوامر الإدارة:</b>\n' +
      '• /gwarn (بالرد)\n' +
      '• /gwarns (بالرد)\n' +
      '• /gmute 10 (بالرد)\n' +
      '• /gunmute (بالرد)\n' +
      '• /gban (بالرد)\n' +
      '• /gunban 123456\n' +
      '• /gunwarn (بالرد)\n' +
      '• /gresetwarn (بالرد)\n' +
      '• /gpolicy\n' +
      '• /gpolicy 2 3 10\n' +
      '• /glogs\n' +
      '• /gclear (بالرد)\n' +
      '• تفاعل مشرف /gadminstats\n' +
      '• برنت /gprint\n' +
      '• تفعيل/تعطيل الاسباب للمشرفين\n' +
      '• رفع اساسي | تنزيل اساسي | الاساسي\n' +
      '• رفع/تنزيل استثناء | المستثنئين\n' +
      '• عدد الرتب\n' +
      '• تفعيل/تعطيل مغادره المشرفين\n\n' +
      '• ضع كليشه عضو\n' +
      '• ضع كليشه مشرف\n' +
      '• رفع عضو مثالي\n' +
      '• رفع مشرف مثالي\n' +
      '• العضو المثالي\n' +
      '• المشرف المثالي\n\n' +
      '<b>ألعاب الجروب:</b>\n' +
      '• /gquiz سؤال سريع\n' +
      '• /gmath حساب ذهني\n' +
      '• /gword ترتيب كلمة\n' +
      '• /gdaily تحدي يومي\n' +
      '• /gmcq سؤال اختيارات\n' +
      '• /gvote تصويت تفاعلي\n' +
      '• /gquizset سلسلة QuizBot\n' +
      '• /gleader المتصدرين\n' +
      '• /gweekly سباق الأسبوع\n' +
      '• /ggame إعدادات الألعاب\n' +
      '• /gteam إدارة فريقك\n' +
      '• /gteams ترتيب الفرق\n' +
      '• /gtour إدارة البطولة'
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
      '• /gpolicy عرض/تعديل سياسة العقوبات\n' +
      '• /glogs عرض سجل الإدارة\n' +
      '• /gclear حذف رسالة بالرد\n' +
      '• تفاعل مشرف /gadminstats\n' +
      '• برنت /gprint\n' +
      '• تفعيل/تعطيل الاسباب للمشرفين\n' +
      '• رفع اساسي | تنزيل اساسي | الاساسي\n' +
      '• رفع/تنزيل استثناء | المستثنئين\n' +
      '• عدد الرتب\n' +
      '• تفعيل/تعطيل مغادره المشرفين\n\n' +
      '• ضع كليشه عضو\n' +
      '• ضع كليشه مشرف\n' +
      '• رفع عضو مثالي\n' +
      '• رفع مشرف مثالي\n' +
      '• العضو المثالي\n' +
      '• المشرف المثالي\n\n' +
      '<b>ألعاب الجروب:</b>\n' +
      '• /gquiz سؤال سريع\n' +
      '• /gmath تحدي حساب\n' +
      '• /gword ترتيب كلمة\n' +
      '• /gdaily تحدي يومي\n' +
      '• /gmcq سؤال اختيارات\n' +
      '• /gvote تصويت تفاعلي\n' +
      '• /gquizset سلسلة QuizBot\n' +
      '• /gleader لوحة المتصدرين\n' +
      '• /gweekly سباق الأسبوع\n' +
      '• /ggame إعدادات الألعاب\n' +
      '• /gteam إدارة فريقك\n' +
      '• /gteams ترتيب الفرق\n' +
      '• /gtour إدارة البطولة',
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

  static buildAdminStats(group, targetUserId) {
    const logs = Array.isArray(group.moderationLogs) ? group.moderationLogs : [];
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = this.getWeekStart(now);

    const byActor = logs.filter((x) => Number(x.actorId) === Number(targetUserId));
    const dayLogs = byActor.filter((x) => new Date(x.createdAt || 0) >= dayStart);
    const weekLogs = byActor.filter((x) => new Date(x.createdAt || 0) >= weekStart);

    const actionIn = (rows, names) => rows.filter((x) => names.includes(String(x.action || ''))).length;

    return {
      dailyEngagement: dayLogs.length,
      weeklyEngagement: weekLogs.length,
      totalEngagement: byActor.length,
      dailyBan: actionIn(dayLogs, ['ban', 'auto_ban_after_warnings']),
      weeklyBan: actionIn(weekLogs, ['ban', 'auto_ban_after_warnings']),
      dailyMute: actionIn(dayLogs, ['mute', 'auto_mute_after_warnings']),
      weeklyMute: actionIn(weekLogs, ['mute', 'auto_mute_after_warnings']),
      dailyKick: actionIn(dayLogs, ['kick']),
      weeklyKick: actionIn(weekLogs, ['kick']),
      dailyRestrict: actionIn(dayLogs, ['restrict']),
      weeklyRestrict: actionIn(weekLogs, ['restrict']),
      dailyWarn: actionIn(dayLogs, ['warn']),
      weeklyWarn: actionIn(weekLogs, ['warn'])
    };
  }

  static async handleAdminInteractionCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const args = this.parseCommandArgs(ctx);
    const normalizedArgs = args[0] === 'مشرف' ? args.slice(1) : args;
    const target = await this.resolveTargetUser(ctx, normalizedArgs);
    if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على المشرف أو بكتابة المعرف.');

    const token = `adm${Math.random().toString(36).slice(2, 10)}`;
    this.pendingAdminStats.set(token, {
      chatId: Number(ctx.chat.id),
      requesterId: Number(ctx.from.id),
      targetUserId: Number(target.id),
      targetFirstName: target.firstName || '',
      targetUsername: target.username || ''
    });
    setTimeout(() => this.pendingAdminStats.delete(token), 2 * 60 * 1000);

    return ctx.reply(
      '🔒 عرض التقرير يتطلب تأكيد خصوصية الإدارة.\nاضغط الزر لإظهار التقرير الكامل.',
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔐 خصوصية الإدارة', `group:adminstats:show:${token}`)]
        ]).reply_markup
      }
    );
  }

  static async handleAdminStatsReveal(ctx, token) {
    if (!this.isGroupChat(ctx)) return;
    const pending = this.pendingAdminStats.get(token);
    if (!pending) return ctx.answerCbQuery('انتهت صلاحية الطلب.', { show_alert: false }).catch(() => {});
    if (Number(ctx.chat.id) !== Number(pending.chatId)) {
      return ctx.answerCbQuery('هذا الطلب ليس لهذا الجروب.', { show_alert: false }).catch(() => {});
    }
    if (Number(ctx.from.id) !== Number(pending.requesterId)) {
      return ctx.answerCbQuery('فقط صاحب الطلب يمكنه عرض التقرير.', { show_alert: false }).catch(() => {});
    }

    this.pendingAdminStats.delete(token);

    const group = await this.ensureGroupRecord(ctx);
    const member = await this.getChatMemberSafe(ctx, pending.targetUserId);
    const isPrimaryOwner = Number(group.settings?.primaryOwnerId || 0) === Number(pending.targetUserId) || member?.status === 'creator';
    const isBasicOwner = Number(group.settings?.basicOwnerId || 0) === Number(pending.targetUserId);
    const role = this.getRoleLabel(member?.status, isPrimaryOwner, isBasicOwner);
    const stats = this.buildAdminStats(group, pending.targetUserId);

    const displayName = pending.targetFirstName || member?.user?.first_name || pending.targetUsername || String(pending.targetUserId);
    const text =
      '🟢 <b>‹ إحصائيات المشرف ›</b>\n\n' +
      `• اسمه ↢ ${displayName}\n` +
      `• ايديه ↢ <code>${pending.targetUserId}</code>\n` +
      `• رتبتة ↢ ${role}\n` +
      `• تفاعله اليوم ↢ ${stats.dailyEngagement}\n` +
      `• تفاعله الاسبوعي ↢ ${stats.weeklyEngagement}\n` +
      `• مجموع تفاعله ↢ ${stats.totalEngagement}\n` +
      `• عدد الحظر اليوم ↢ ${stats.dailyBan}\n` +
      `• مجموع الحظر الاسبوعي ↢ ${stats.weeklyBan}\n` +
      `• عدد الكتم اليوم ↢ ${stats.dailyMute}\n` +
      `• مجموع الكتم الاسبوعي ↢ ${stats.weeklyMute}\n` +
      `• عدد الطرد اليوم ↢ ${stats.dailyKick}\n` +
      `• مجموع الطرد الاسبوعي ↢ ${stats.weeklyKick}\n` +
      `• عدد التقييد اليوم ↢ ${stats.dailyRestrict}\n` +
      `• مجموع التقييد الاسبوعي ↢ ${stats.weeklyRestrict}\n` +
      `• عدد الانذارات اليوم ↢ ${stats.dailyWarn}\n` +
      `• مجموع الانذارات الاسبوعي ↢ ${stats.weeklyWarn}`;

    await ctx.answerCbQuery('تم عرض التقرير', { show_alert: false }).catch(() => {});
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handlePrintCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const args = this.parseCommandArgs(ctx);
    const target = await this.resolveTargetUser(ctx, args);
    if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد أو بالمعرف. مثال: برنت @user');

    const group = await this.ensureGroupRecord(ctx);
    const logs = (group.moderationLogs || [])
      .filter((x) => Number(x.targetId) === Number(target.id))
      .slice(0, 12);

    if (logs.length === 0) {
      return ctx.reply('ℹ️ لا يوجد سجل إجراءات على هذا العضو بعد.');
    }

    let message = `🧾 <b>برنت العضو</b>\n\n👤 الهدف: <code>${target.id}</code>\n\n`;
    logs.forEach((log, i) => {
      const t = new Date(log.createdAt || Date.now()).toLocaleString('ar');
      const actor = log.actorId ? `<code>${log.actorId}</code>` : '-';
      const reason = log.reason ? `\nالسبب: ${log.reason}` : '';
      message += `${i + 1}. ${log.action}\nالمشرف: ${actor}\nالوقت: ${t}${reason}\n\n`;
    });

    return ctx.reply(message.trim(), { parse_mode: 'HTML' });
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

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const args = this.parseCommandArgs(ctx);
    const rawReason = this.parseReasonFromArgs(args, 'warn');
    const actorIsPrimaryOwner = await this.isPrimaryOwner(ctx);
    const reasonCheck = this.validateReasonPolicy(group, actorIsPrimaryOwner, rawReason);
    if (!reasonCheck.ok) return ctx.reply(reasonCheck.message);
    const reason = rawReason || 'مخالفة قواعد الجروب';
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
    const policy = this.getWarningPolicy(group);
    await ctx.reply(`⚠️ تم تحذير ${label}\nالسبب: ${reason}\nالتحذيرات: ${warning.count}/${policy.banAt}`);
    if (!policy.enabled) return;

    if (warning.count >= policy.banAt) {
      try {
        await ctx.telegram.banChatMember(ctx.chat.id, targetUserId);
        await ctx.reply(`🚫 تم حظر ${label} تلقائيًا عند ${policy.banAt} تحذيرات.`);
        group.bannedUsers.push({
          userId: targetUserId,
          reason: `تجاوز ${policy.banAt} تحذيرات`,
          bannedAt: new Date(),
          bannedBy: ctx.from.id
        });
        await this.addModerationLog(
          group,
          'auto_ban_after_warnings',
          ctx.from.id,
          targetUserId,
          `تجاوز ${policy.banAt} تحذيرات`
        );
        await group.save();
      } catch (_error) {
        await ctx.reply('❌ فشل الحظر التلقائي. تأكد من صلاحيات البوت.');
      }
      return;
    }

    if (warning.count >= policy.muteAt) {
      const untilDate = Math.floor(Date.now() / 1000) + policy.muteMinutes * 60;
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
        await this.addModerationLog(
          group,
          'auto_mute_after_warnings',
          ctx.from.id,
          targetUserId,
          `${policy.muteMinutes}m after ${warning.count} warnings`
        );
        await group.save();
        await ctx.reply(`🔇 تم كتم ${label} تلقائيًا لمدة ${policy.muteMinutes} دقيقة.`);
      } catch (_error) {
        await ctx.reply('❌ فشل الكتم التلقائي. تأكد من صلاحيات البوت.');
      }
    }
  }

  static async handleWarnsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لعرض تحذيراته.');

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const warning = group.warnings.find((w) => w.userId === targetUserId);
    const count = warning?.count || 0;
    const label = this.getRepliedUserLabel(ctx);
    const policy = this.getWarningPolicy(group);

    return ctx.reply(`📌 تحذيرات ${label}: ${count}/${policy.banAt}`);
  }

  static async handleUnwarnCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لإزالة تحذير.');

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
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
    const policy = this.getWarningPolicy(group);

    return ctx.reply(`✅ تم إزالة تحذير من ${label}. التحذيرات الحالية: ${warning.count}/${policy.banAt}`);
  }

  static async handleResetWarnCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const targetUserId = this.getRepliedUserId(ctx);
    if (!targetUserId) return ctx.reply('❌ يجب الرد على رسالة المستخدم لتصفير التحذيرات.');

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
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

  static async handlePolicyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);

    if (args.length === 0) {
      const policy = this.getWarningPolicy(group);
      return ctx.reply(
        '⚙️ <b>سياسة العقوبات التلقائية</b>\n\n' +
          `الحالة: ${policy.enabled ? '✅ مفعلة' : '❌ معطلة'}\n` +
          `الكتم عند: ${policy.muteAt} تحذيرات\n` +
          `الحظر عند: ${policy.banAt} تحذيرات\n` +
          `مدة الكتم: ${policy.muteMinutes} دقيقة\n\n` +
          'لتعديل السياسة:\n' +
          '<code>/gpolicy muteAt banAt muteMinutes</code>\n' +
          'مثال: <code>/gpolicy 2 3 15</code>\n\n' +
          'لإيقافها: <code>/gpolicy off</code>\n' +
          'لتفعيلها: <code>/gpolicy on</code>',
        { parse_mode: 'HTML' }
      );
    }

    const mode = String(args[0] || '').toLowerCase();
    if (mode === 'off' || mode === 'disable') {
      group.settings.warningPolicy.enabled = false;
      await this.addModerationLog(group, 'policy_update', ctx.from.id, null, 'warning policy disabled');
      await group.save();
      return ctx.reply('✅ تم تعطيل العقوبات التلقائية.');
    }

    if (mode === 'on' || mode === 'enable') {
      group.settings.warningPolicy.enabled = true;
      await this.addModerationLog(group, 'policy_update', ctx.from.id, null, 'warning policy enabled');
      await group.save();
      return ctx.reply('✅ تم تفعيل العقوبات التلقائية.');
    }

    if (args.length < 3) {
      return ctx.reply('❌ الصيغة غير صحيحة. استخدم: /gpolicy muteAt banAt muteMinutes');
    }

    const muteAt = parseInt(args[0], 10);
    const banAt = parseInt(args[1], 10);
    const muteMinutes = parseInt(args[2], 10);

    if (!Number.isInteger(muteAt) || !Number.isInteger(banAt) || !Number.isInteger(muteMinutes)) {
      return ctx.reply('❌ القيم يجب أن تكون أرقام صحيحة.');
    }
    if (muteAt < 1 || banAt < 2 || muteMinutes < 1) {
      return ctx.reply('❌ القيم غير منطقية. مثال مناسب: /gpolicy 2 3 10');
    }
    if (muteAt >= banAt) {
      return ctx.reply('❌ يجب أن يكون banAt أكبر من muteAt.');
    }

    group.settings.warningPolicy = {
      enabled: true,
      muteAt,
      banAt,
      muteMinutes
    };
    await this.addModerationLog(
      group,
      'policy_update',
      ctx.from.id,
      null,
      `muteAt=${muteAt}, banAt=${banAt}, muteMinutes=${muteMinutes}`
    );
    await group.save();

    return ctx.reply(
      `✅ تم تحديث السياسة:\n` +
        `• الكتم عند ${muteAt}\n` +
        `• الحظر عند ${banAt}\n` +
        `• مدة الكتم ${muteMinutes} دقيقة`
    );
  }

  static async handleReasonsToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim().toLowerCase();
    const args = this.parseCommandArgs(ctx).map((x) => String(x).toLowerCase());

    let enable = null;
    if (text.includes('تفعيل الاسباب للمشرفين') || args.includes('on') || args.includes('enable')) enable = true;
    if (text.includes('تعطيل الاسباب للمشرفين') || args.includes('off') || args.includes('disable')) enable = false;
    if (enable === null) {
      return ctx.reply(
        `⚙️ حالة الأسباب حاليًا: ${group.settings.requireReasonsForModeration ? '✅ مفعلة' : '❌ معطلة'}\n` +
          'الاستخدام:\n' +
          '• تفعيل الاسباب للمشرفين\n' +
          '• تعطيل الاسباب للمشرفين\n' +
          '• /greasons on|off'
      );
    }

    group.settings.requireReasonsForModeration = enable;
    await this.addModerationLog(group, 'toggle_reasons', ctx.from.id, null, enable ? 'on' : 'off');
    await group.save();
    return ctx.reply(enable ? '✅ تم تفعيل الأسباب للمشرفين.' : '✅ تم تعطيل الأسباب للمشرفين.');
  }

  static async handleGameEngagementToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    if (/تعطيل\s+تفاعل\s+الالعاب|تعطيل\s+تقاعل\s+الالعاب/i.test(text)) {
      group.settings.disableGameEngagement = true;
      await this.addModerationLog(group, 'toggle_game_engagement', ctx.from.id, null, 'off');
      await group.save();
      return ctx.reply('✅ تم تعطيل احتساب تفاعل الألعاب.');
    }
    if (/تفعيل\s+تفاعل\s+الالعاب/i.test(text)) {
      group.settings.disableGameEngagement = false;
      await this.addModerationLog(group, 'toggle_game_engagement', ctx.from.id, null, 'on');
      await group.save();
      return ctx.reply('✅ تم تفعيل احتساب تفاعل الألعاب.');
    }
    return ctx.reply('الاستخدام:\n• تعطيل تفاعل الالعاب\n• تفعيل تفاعل الالعاب');
  }

  static async handleBasicOwnerCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const isPrimaryOwner = await this.isPrimaryOwner(ctx);
    if (!isPrimaryOwner) return ctx.reply('❌ هذا الأمر للمالك الأساسي فقط.');

    if (/^(الاساسي|\/gbasic)$/i.test(text)) {
      if (!group.settings.basicOwnerId) return ctx.reply('ℹ️ لا يوجد حساب أساسي مرفوع.');
      return ctx.reply(`👤 الأساسي الحالي: <code>${group.settings.basicOwnerId}</code>`, { parse_mode: 'HTML' });
    }

    if (/^(رفع اساسي|\/gbasic\s+set)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ اكتب الأمر بالرد على العضو أو بالمعرف.');
      if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ أنت بالفعل المالك الأساسي.');
      group.settings.basicOwnerId = Number(target.id);
      await this.addModerationLog(group, 'set_basic_owner', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(`✅ تم رفع <code>${target.id}</code> كـ أساسي.`, { parse_mode: 'HTML' });
    }

    if (/^(تنزيل اساسي|\/gbasic\s+remove)/i.test(text)) {
      const old = group.settings.basicOwnerId;
      group.settings.basicOwnerId = null;
      await this.addModerationLog(group, 'remove_basic_owner', ctx.from.id, old || null);
      await group.save();
      return ctx.reply('✅ تم تنزيل الأساسي.');
    }
  }

  static async handleExceptionsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    group.settings.exceptions = Array.isArray(group.settings.exceptions) ? group.settings.exceptions.map(Number) : [];

    if (/^(المستثنئين|\/gexceptions(\s+list)?)$/i.test(text)) {
      if (group.settings.exceptions.length === 0) return ctx.reply('ℹ️ لا يوجد مستثنين حاليًا.');
      const rows = group.settings.exceptions.slice(0, 50).map((id, i) => `${i + 1}. <code>${id}</code>`);
      return ctx.reply(`📋 <b>قائمة المستثنين</b>\n\n${rows.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(مسح الاستثناءات|\/gexceptions\s+clear)$/i.test(text)) {
      group.settings.exceptions = [];
      await this.addModerationLog(group, 'clear_exceptions', ctx.from.id);
      await group.save();
      return ctx.reply('✅ تم مسح الاستثناءات.');
    }

    if (/^(تنزيل الاستثناءات|\/gexceptions\s+removeall)$/i.test(text)) {
      group.settings.exceptions = [];
      await this.addModerationLog(group, 'remove_all_exceptions', ctx.from.id);
      await group.save();
      return ctx.reply('✅ تم تنزيل جميع الاستثناءات.');
    }

    if (/^(رفع استثناء|\/gexceptions\s+add)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد أو المعرف.');
      if (!group.settings.exceptions.includes(Number(target.id))) group.settings.exceptions.push(Number(target.id));
      await this.addModerationLog(group, 'add_exception', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(`✅ تم رفع <code>${target.id}</code> استثناء.`, { parse_mode: 'HTML' });
    }

    if (/^(تنزيل استثناء|\/gexceptions\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد أو المعرف.');
      group.settings.exceptions = group.settings.exceptions.filter((id) => Number(id) !== Number(target.id));
      await this.addModerationLog(group, 'remove_exception', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(`✅ تم تنزيل <code>${target.id}</code> من الاستثناءات.`, { parse_mode: 'HTML' });
    }
  }

  static async handleRanksCountCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id).catch(() => []);
    const creatorsCount = admins.filter((m) => m.status === 'creator').length;
    const adminCount = admins.filter((m) => m.status === 'administrator').length;
    const basicCount = group.settings?.basicOwnerId ? 1 : 0;
    const exceptionCount = Array.isArray(group.settings?.exceptions) ? group.settings.exceptions.length : 0;
    return ctx.reply(
      '📊 <b>عدد الرتب</b>\n\n' +
        `• المالك الأساسي: ${creatorsCount}\n` +
        `• الأساسي: ${basicCount}\n` +
        `• المشرفين: ${adminCount}\n` +
        `• المستثنين: ${exceptionCount}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleDetectToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    if (/^(تعطيل الكشف|\/gdetect\s+off)$/i.test(text)) {
      group.settings.detectForAdminsOnly = true;
      await this.addModerationLog(group, 'toggle_detect', ctx.from.id, null, 'off');
      await group.save();
      return ctx.reply('✅ تم تعطيل الكشف للرتب، الآن المشرفون فقط يمكنهم استخدامه.');
    }
    if (/^(تفعيل الكشف|\/gdetect\s+on)$/i.test(text)) {
      group.settings.detectForAdminsOnly = false;
      await this.addModerationLog(group, 'toggle_detect', ctx.from.id, null, 'on');
      await group.save();
      return ctx.reply('✅ تم تفعيل الكشف للجميع حسب الصلاحيات.');
    }
  }

  static async handleOnlineToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    if (/^(قفل الانلاين للكل|\/gonline\s+lock)$/i.test(text)) {
      group.settings.onlineForOwnersOnly = true;
      await this.addModerationLog(group, 'toggle_online', ctx.from.id, null, 'lock');
      await group.save();
      return ctx.reply('✅ تم قفل الانلاين للكل، المالك الأساسي/الأساسي فقط.');
    }
    if (/^(فتح الانلاين للكل|\/gonline\s+unlock)$/i.test(text)) {
      group.settings.onlineForOwnersOnly = false;
      await this.addModerationLog(group, 'toggle_online', ctx.from.id, null, 'unlock');
      await group.save();
      return ctx.reply('✅ تم فتح الانلاين للكل.');
    }
  }

  static async handleAdminLeaveToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    if (/^(تفعيل مغادره المشرفين|\/gadminleave\s+on)$/i.test(text)) {
      group.settings.notifyAdminLeave = true;
      await this.addModerationLog(group, 'toggle_admin_leave_notify', ctx.from.id, null, 'on');
      await group.save();
      return ctx.reply('✅ تم تفعيل إشعار مغادرة المشرفين.');
    }
    if (/^(تعطيل مغادره المشرفين|\/gadminleave\s+off)$/i.test(text)) {
      group.settings.notifyAdminLeave = false;
      await this.addModerationLog(group, 'toggle_admin_leave_notify', ctx.from.id, null, 'off');
      await group.save();
      return ctx.reply('✅ تم تعطيل إشعار مغادرة المشرفين.');
    }
  }

  static async canManageGroupTemplates(ctx, groupId, userId) {
    const group = await Group.findOne({ groupId: String(groupId) });
    if (!group) return { ok: false, message: '❌ لم يتم العثور على بيانات الجروب.' };
    this.normalizeGroupState(group);

    let member = null;
    try {
      member = await ctx.telegram.getChatMember(Number(groupId), Number(userId));
    } catch (_error) {
      return { ok: false, message: '❌ تعذر التحقق من صلاحيتك داخل الجروب.' };
    }
    const isCreator = member?.status === 'creator';
    const isPrimary = isCreator || Number(group.settings.primaryOwnerId || 0) === Number(userId);
    const isBasic = Number(group.settings.basicOwnerId || 0) === Number(userId);
    if (!isPrimary && !isBasic) {
      return { ok: false, message: '❌ هذه الميزة للمالك الأساسي أو الأساسي فقط.' };
    }
    return { ok: true, group, isPrimary, isBasic };
  }

  static async handleTemplateSetupRequest(ctx, mode) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذه الميزة للمالك الأساسي أو الأساسي فقط.');

    const botUsername = ctx.botInfo?.username;
    if (!botUsername) return ctx.reply('❌ تعذر معرفة معرف البوت. أعد المحاولة.');
    const safeMode = mode === 'admin' ? 'admin' : 'member';
    const payload = `tmpl_${safeMode}_${String(ctx.chat.id)}`;
    const url = `https://t.me/${botUsername}?start=${encodeURIComponent(payload)}`;
    const label = safeMode === 'admin' ? 'المشرف المثالي' : 'العضو المثالي';

    return ctx.reply(
      `🧩 إعداد كليشة ${label}\n` +
        'اضغط الزر للمتابعة في الخاص ثم أرسل:\n' +
        '1) صورة\n2) وصف\n3) نص الزر ورابطه',
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('🔐 إعداد الكليشة في الخاص', url)]
        ]).reply_markup
      }
    );
  }

  static async handlePrivateTemplateStart(ctx, payload) {
    const match = /^tmpl_(member|admin)_(-?\d+)$/i.exec(String(payload || '').trim());
    if (!match) return false;

    const mode = String(match[1]).toLowerCase();
    const groupId = String(match[2]);
    const auth = await this.canManageGroupTemplates(ctx, groupId, ctx.from.id);
    if (!auth.ok) {
      await ctx.reply(auth.message);
      return true;
    }

    ctx.session = ctx.session || {};
    ctx.session.groupTemplateAwait = {
      active: true,
      mode,
      groupId,
      step: 'photo',
      data: {}
    };

    const label = mode === 'admin' ? 'المشرف المثالي' : 'العضو المثالي';
    await ctx.reply(
      `✅ بدأ إعداد كليشة ${label} للمجموعة <code>${groupId}</code>\n\n` +
        'الخطوة 1/3: أرسل الآن الصورة.',
      { parse_mode: 'HTML' }
    );
    return true;
  }

  static async handlePrivateTemplatePhoto(ctx) {
    if (this.isGroupChat(ctx)) return false;
    const state = ctx.session?.groupTemplateAwait;
    if (!state?.active || state.step !== 'photo') return false;

    const photos = Array.isArray(ctx.message?.photo) ? ctx.message.photo : [];
    if (photos.length === 0) {
      await ctx.reply('❌ لم يتم العثور على صورة. أرسل صورة عادية.');
      return true;
    }
    const fileId = photos[photos.length - 1]?.file_id;
    if (!fileId) {
      await ctx.reply('❌ تعذر قراءة الصورة. أعد الإرسال.');
      return true;
    }

    state.data = state.data || {};
    state.data.image = fileId;
    state.step = 'caption';
    ctx.session.groupTemplateAwait = state;
    await ctx.reply('✅ تم حفظ الصورة.\nالخطوة 2/3: أرسل الوصف (الكابشن).');
    return true;
  }

  static async handlePrivateTemplateText(ctx, text) {
    if (this.isGroupChat(ctx)) return false;
    const state = ctx.session?.groupTemplateAwait;
    if (!state?.active) return false;

    const msg = String(text || '').trim();
    if (!msg) {
      await ctx.reply('❌ أرسل نصًا صالحًا.');
      return true;
    }

    if (state.step === 'caption') {
      state.data = state.data || {};
      state.data.caption = msg.slice(0, 900);
      state.step = 'button';
      ctx.session.groupTemplateAwait = state;
      await ctx.reply(
        '✅ تم حفظ الوصف.\n' +
          'الخطوة 3/3: أرسل نص الزر والرابط بهذا الشكل:\n' +
          'نص الزر | https://example.com\n' +
          'أو اكتب: تخطي'
      );
      return true;
    }

    if (state.step === 'button') {
      let buttonText = '';
      let buttonUrl = '';
      if (!/^تخطي$/i.test(msg)) {
        const parts = msg.split('|').map((x) => x.trim()).filter(Boolean);
        if (parts.length < 2) {
          await ctx.reply('❌ الصيغة غير صحيحة. مثال:\nالعضو المثالي | https://t.me/username');
          return true;
        }
        buttonText = parts[0].slice(0, 60);
        buttonUrl = parts.slice(1).join('|').trim();
        if (!/^https?:\/\/\S+/i.test(buttonUrl)) {
          await ctx.reply('❌ الرابط غير صحيح. يجب أن يبدأ بـ http:// أو https://');
          return true;
        }
      }

      const auth = await this.canManageGroupTemplates(ctx, state.groupId, ctx.from.id);
      if (!auth.ok) {
        ctx.session.groupTemplateAwait = null;
        await ctx.reply(`${auth.message}\nتم إلغاء العملية.`);
        return true;
      }

      const template = {
        image: state.data?.image || '',
        caption: state.data?.caption || '',
        buttonText,
        buttonUrl
      };
      if (state.mode === 'admin') auth.group.settings.templates.admin = template;
      else auth.group.settings.templates.member = template;
      auth.group.updatedAt = new Date();
      await auth.group.save();

      ctx.session.groupTemplateAwait = null;
      await ctx.reply('✅ تم حفظ الكليشة بنجاح. ارجع للجروب واستخدم أمر الرفع المناسب.');
      return true;
    }

    return false;
  }

  static async handleIdealAssignCommand(ctx, mode) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذه الميزة للمالك الأساسي أو الأساسي فقط.');

    const args = this.parseCommandArgs(ctx);
    const normalizedArgs = args[0] === 'مثالي' ? args.slice(1) : args;
    const target = await this.resolveTargetUser(ctx, normalizedArgs);
    if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد أو المعرف.');

    const group = await this.ensureGroupRecord(ctx);
    const key = mode === 'admin' ? 'idealAdminId' : 'idealMemberId';
    group.settings[key] = Number(target.id);
    await this.addModerationLog(group, mode === 'admin' ? 'set_ideal_admin' : 'set_ideal_member', ctx.from.id, target.id);
    await group.save();
    return ctx.reply(`✅ تم رفع <code>${target.id}</code> ${mode === 'admin' ? 'مشرفًا مثاليًا' : 'عضوًا مثاليًا'}.`, { parse_mode: 'HTML' });
  }

  static async handleShowIdealCard(ctx, mode) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const template = mode === 'admin' ? group.settings?.templates?.admin : group.settings?.templates?.member;
    const targetId = Number(mode === 'admin' ? group.settings?.idealAdminId : group.settings?.idealMemberId);
    if (!template?.image || !targetId) {
      return ctx.reply(`ℹ️ لم يتم إعداد ${mode === 'admin' ? 'المشرف المثالي' : 'العضو المثالي'} بعد.`);
    }

    let targetName = String(targetId);
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, targetId);
      targetName = member?.user?.first_name || member?.user?.username || targetName;
    } catch (_error) {
      // ignore
    }

    const title = mode === 'admin' ? '🏅 المشرف المثالي' : '🌟 العضو المثالي';
    const caption = String(template.caption || '').replace(/\{name\}/g, targetName).replace(/\{id\}/g, String(targetId));
    const finalCaption = `${title}\n\n${caption || `المميز الحالي: ${targetName}`}`;
    const keyboard = template.buttonText && template.buttonUrl
      ? Markup.inlineKeyboard([[Markup.button.url(template.buttonText, template.buttonUrl)]])
      : undefined;

    return ctx.replyWithPhoto(template.image, {
      caption: finalCaption.slice(0, 1024),
      parse_mode: 'HTML',
      reply_markup: keyboard?.reply_markup
    });
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
    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const rawReason = this.parseReasonFromArgs(args, 'mute');
    const actorIsPrimaryOwner = await this.isPrimaryOwner(ctx);
    const reasonCheck = this.validateReasonPolicy(group, actorIsPrimaryOwner, rawReason);
    if (!reasonCheck.ok) return ctx.reply(reasonCheck.message);
    const reason = rawReason || `duration=${minutes}m`;
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
      await this.addModerationLog(group, 'mute', ctx.from.id, targetUserId, reason);
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

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const args = this.parseCommandArgs(ctx);
    const rawReason = this.parseReasonFromArgs(args, 'ban');
    const actorIsPrimaryOwner = await this.isPrimaryOwner(ctx);
    const reasonCheck = this.validateReasonPolicy(group, actorIsPrimaryOwner, rawReason);
    if (!reasonCheck.ok) return ctx.reply(reasonCheck.message);
    const reason = rawReason || 'مخالفة قواعد الجروب';

    try {
      await ctx.telegram.banChatMember(ctx.chat.id, targetUserId);
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

    if (data.startsWith('group:adminstats:show:')) {
      const token = data.split(':')[4];
      return this.handleAdminStatsReveal(ctx, token);
    }

    await ctx.answerCbQuery('❌ إجراء غير معروف', { show_alert: false });
  }

  static async handleChatMemberUpdate(ctx) {
    try {
      const update = ctx.update?.chat_member;
      const chat = update?.chat;
      if (!GROUP_TYPES.has(chat?.type)) return;

      const oldStatus = update?.old_chat_member?.status;
      const newStatus = update?.new_chat_member?.status;
      const user = update?.new_chat_member?.user || update?.old_chat_member?.user;
      if (!user?.id) return;

      const wasAdmin = ['administrator', 'creator'].includes(oldStatus);
      const leftNow = ['left', 'kicked'].includes(newStatus);
      if (!wasAdmin || !leftNow) return;

      const group = await Group.findOne({ groupId: String(chat.id) });
      if (!group) return;
      this.normalizeGroupState(group);
      if (!group.settings.notifyAdminLeave) return;

      const owners = new Set();
      if (Number.isInteger(group.settings.primaryOwnerId)) owners.add(Number(group.settings.primaryOwnerId));
      if (Number.isInteger(group.settings.basicOwnerId)) owners.add(Number(group.settings.basicOwnerId));

      try {
        const admins = await ctx.telegram.getChatAdministrators(chat.id);
        const creator = admins.find((m) => m.status === 'creator');
        if (creator?.user?.id) owners.add(Number(creator.user.id));
      } catch (_error) {
        // ignore
      }

      const who = user.first_name || user.username || String(user.id);
      const when = new Date().toLocaleString('ar');
      const note =
        '🚨 إشعار مغادرة مشرف\n\n' +
        `👥 المجموعة: ${chat.title || 'Unknown'}\n` +
        `👤 المشرف: ${who}\n` +
        `🆔 ${user.id}\n` +
        `🕒 ${when}`;

      await this.addModerationLog(group, 'admin_left_group', user.id, null, `status ${oldStatus} -> ${newStatus}`);
      await group.save();

      await Promise.all([...owners].map((ownerId) => ctx.telegram.sendMessage(ownerId, note).catch(() => null)));
    } catch (_error) {
      // ignore chat_member failures
    }
  }

  static async processGroupMessage(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    if (!ctx.message?.text) return false;

    const group = await this.ensureGroupRecord(ctx);
    const rawText = String(ctx.message.text || '').trim();
    const lowered = rawText.toLowerCase();

    if (
      /^(تفاعل مشرف|\/gadminstats\b)/i.test(rawText)
    ) {
      await this.handleAdminInteractionCommand(ctx);
      return true;
    }
    if (/^(برنت|\/gprint\b)/i.test(rawText)) {
      await this.handlePrintCommand(ctx);
      return true;
    }
    if (
      /^(تفعيل الاسباب للمشرفين|تعطيل الاسباب للمشرفين|\/greasons\b)/i.test(rawText)
    ) {
      await this.handleReasonsToggle(ctx);
      return true;
    }
    if (/^(تعطيل تفاعل الالعاب|تعطيل تقاعل الالعاب|تفعيل تفاعل الالعاب)$/i.test(rawText)) {
      await this.handleGameEngagementToggle(ctx);
      return true;
    }
    if (/^(رفع اساسي|تنزيل اساسي|الاساسي|\/gbasic\b)/i.test(rawText)) {
      await this.handleBasicOwnerCommand(ctx);
      return true;
    }
    if (
      /^(رفع استثناء|تنزيل استثناء|المستثنئين|مسح الاستثناءات|تنزيل الاستثناءات|\/gexceptions\b)/i.test(rawText)
    ) {
      await this.handleExceptionsCommand(ctx);
      return true;
    }
    if (/^(عدد الرتب|الرتب|\/granks)$/i.test(rawText)) {
      await this.handleRanksCountCommand(ctx);
      return true;
    }
    if (/^(تعطيل الكشف|تفعيل الكشف|\/gdetect\b)/i.test(rawText)) {
      await this.handleDetectToggle(ctx);
      return true;
    }
    if (/^(قفل الانلاين للكل|فتح الانلاين للكل|\/gonline\b)/i.test(rawText)) {
      await this.handleOnlineToggle(ctx);
      return true;
    }
    if (/^(تفعيل مغادره المشرفين|تعطيل مغادره المشرفين|\/gadminleave\b)/i.test(rawText)) {
      await this.handleAdminLeaveToggle(ctx);
      return true;
    }
    if (/^(ضع كليشه عضو|\/gtemplate_member\b)/i.test(rawText)) {
      await this.handleTemplateSetupRequest(ctx, 'member');
      return true;
    }
    if (/^(ضع كليشه مشرف|\/gtemplate_admin\b)/i.test(rawText)) {
      await this.handleTemplateSetupRequest(ctx, 'admin');
      return true;
    }
    if (/^(رفع عضو مثالي|\/gideal_member\b)/i.test(rawText)) {
      await this.handleIdealAssignCommand(ctx, 'member');
      return true;
    }
    if (/^(رفع مشرف مثالي|\/gideal_admin\b)/i.test(rawText)) {
      await this.handleIdealAssignCommand(ctx, 'admin');
      return true;
    }
    if (/^(العضو المثالي|\/gshow_ideal_member\b)/i.test(rawText)) {
      await this.handleShowIdealCard(ctx, 'member');
      return true;
    }
    if (/^(المشرف المثالي|\/gshow_ideal_admin\b)/i.test(rawText)) {
      await this.handleShowIdealCard(ctx, 'admin');
      return true;
    }

    group.statistics = group.statistics || {};
    group.statistics.messagesCount = (group.statistics.messagesCount || 0) + 1;
    group.updatedAt = new Date();
    await group.save();

    const isAdmin = await this.isGroupAdmin(ctx);
    if (isAdmin) return false;

    const botRights = await this.ensureBotModerationRights(ctx);
    if (!botRights.ok) return false;

    const text = lowered;

    if (group.settings?.lockLinks) {
      const hasLink = /(https?:\/\/|t\.me\/|telegram\.me\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|me|co|ai|dev|app|xyz|info|ly|ru|uk|de|fr|sa|ae|qa|eg|tr)\b)/i.test(text);
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
