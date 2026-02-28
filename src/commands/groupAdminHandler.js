const Markup = require('telegraf/markup');
const { Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

class GroupAdminHandler {
  static pendingAdminStats = new Map();
  static INTERNAL_ROLE_KEYS = ['basicOwnerIds', 'ownerIds', 'managerIds', 'adminIds', 'premiumMemberIds'];

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

    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;

    if (await this.isAdminOrHigher(ctx, targetUserId)) return true;

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

  static normalizePlainText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  static escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static hasBoundedPhrase(text, phrase) {
    const normalizedText = this.normalizePlainText(text);
    const normalizedPhrase = this.normalizePlainText(phrase);
    if (!normalizedText || !normalizedPhrase) return false;
    if (normalizedText === normalizedPhrase) return true;

    const escaped = this.escapeRegex(normalizedPhrase);
    // Match phrase as a standalone token/phrase, not as a substring inside another word.
    const boundaryPattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`, 'u');
    return boundaryPattern.test(normalizedText);
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
    return this.getRoleIds(group, 'basicOwnerIds').includes(targetUserId)
      || this.getRoleIds(group, 'ownerIds').includes(targetUserId);
  }

  static async isManagerOrHigher(ctx, userId = null) {
    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;
    if (await this.isOwnerOrBasic(ctx, targetUserId)) return true;
    const group = await this.ensureGroupRecord(ctx);
    return this.getRoleIds(group, 'managerIds').includes(targetUserId);
  }

  static async isAdminOrHigher(ctx, userId = null) {
    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;
    if (await this.isManagerOrHigher(ctx, targetUserId)) return true;
    const group = await this.ensureGroupRecord(ctx);
    return this.getRoleIds(group, 'adminIds').includes(targetUserId);
  }

  static async isPremiumMember(ctx, userId = null) {
    const targetUserId = Number(userId || ctx.from?.id);
    if (!targetUserId) return false;
    const group = await this.ensureGroupRecord(ctx);
    return this.getRoleIds(group, 'premiumMemberIds').includes(targetUserId);
  }

  static getRoleIds(group, key) {
    const values = Array.isArray(group?.settings?.[key]) ? group.settings[key] : [];
    return values.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  }

  static syncLegacyRoleFields(group) {
    const basicOwnerIds = this.getRoleIds(group, 'basicOwnerIds');
    group.settings.basicOwnerIds = basicOwnerIds;
    group.settings.basicOwnerId = basicOwnerIds[0] || null;
  }

  static removeUserFromInternalRoles(group, userId) {
    const targetUserId = Number(userId || 0);
    if (!targetUserId) return;
    this.INTERNAL_ROLE_KEYS.forEach((key) => {
      group.settings[key] = this.getRoleIds(group, key).filter((id) => id !== targetUserId);
    });
    this.syncLegacyRoleFields(group);
  }

  static assignInternalRole(group, roleKey, userId) {
    const targetUserId = Number(userId || 0);
    if (!targetUserId || !this.INTERNAL_ROLE_KEYS.includes(roleKey)) return false;
    this.removeUserFromInternalRoles(group, targetUserId);
    group.settings[roleKey] = [...this.getRoleIds(group, roleKey), targetUserId];
    this.syncLegacyRoleFields(group);
    return true;
  }

  static escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static mentionUser(userId, label) {
    const id = Number(userId || 0);
    const safeLabel = this.escapeHtml(label || `عضو ${id}`);
    return `<a href="tg://user?id=${id}">${safeLabel}</a>`;
  }

  static async collectOwnerRecipients(ctx, group, chatId) {
    const owners = new Set();
    if (Number.isInteger(group?.settings?.primaryOwnerId)) owners.add(Number(group.settings.primaryOwnerId));
    this.getRoleIds(group, 'basicOwnerIds').forEach((id) => owners.add(id));
    this.getRoleIds(group, 'ownerIds').forEach((id) => owners.add(id));

    try {
      const admins = await ctx.telegram.getChatAdministrators(chatId);
      const creator = admins.find((m) => m.status === 'creator');
      if (creator?.user?.id) owners.add(Number(creator.user.id));
    } catch (_error) {
      // ignore
    }

    return owners;
  }

  static formatRoleActionMessage(actionText, target) {
    const targetMention = this.mentionUser(
      target.id,
      target.firstName || target.username || String(target.id)
    );
    return `• ${actionText}\n• المستخدم ↤︎ ${targetMention}`;
  }

  static getInternalRoleLabel(group, userId) {
    const targetUserId = Number(userId || 0);
    if (!targetUserId) return null;
    if (this.getRoleIds(group, 'basicOwnerIds').includes(targetUserId)) return 'مالك اساسي';
    if (this.getRoleIds(group, 'ownerIds').includes(targetUserId)) return 'مالك';
    if (this.getRoleIds(group, 'managerIds').includes(targetUserId)) return 'مدير';
    if (this.getRoleIds(group, 'adminIds').includes(targetUserId)) return 'أدمن';
    if (this.getRoleIds(group, 'premiumMemberIds').includes(targetUserId)) return 'مميز';
    return null;
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

  static getRoleLabel(memberStatus, isPrimaryOwner, internalRoleLabel = null) {
    if (memberStatus === 'creator') return 'منشئ';
    if (isPrimaryOwner) return 'المالك الاساسي';
    if (internalRoleLabel) return internalRoleLabel;
    if (memberStatus === 'administrator') return 'مشرف';
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
    if (typeof group.settings.lockStickers !== 'boolean') group.settings.lockStickers = false;
    if (typeof group.settings.filterBadWords !== 'boolean') group.settings.filterBadWords = true;
    if (typeof group.settings.blockExplicitContent !== 'boolean') group.settings.blockExplicitContent = true;
    if (typeof group.settings.floodProtection !== 'boolean') group.settings.floodProtection = true;
    if (typeof group.settings.exemptAdminsFromProtection !== 'boolean') group.settings.exemptAdminsFromProtection = false;
    if (typeof group.settings.blockLongMessages !== 'boolean') group.settings.blockLongMessages = true;
    if (!Number.isInteger(group.settings.maxMessageLength)) group.settings.maxMessageLength = 700;
    group.settings.maxMessageLength = Math.max(100, Math.min(4000, group.settings.maxMessageLength));

    if (!group.settings.warningPolicy) {
      group.settings.warningPolicy = { enabled: true, muteAt: 2, banAt: 3, muteMinutes: 10 };
    }
    if (typeof group.settings.warningPolicy.enabled !== 'boolean') group.settings.warningPolicy.enabled = true;
    if (!Number.isInteger(group.settings.warningPolicy.muteAt)) group.settings.warningPolicy.muteAt = 2;
    if (!Number.isInteger(group.settings.warningPolicy.banAt)) group.settings.warningPolicy.banAt = 3;
    if (!Number.isInteger(group.settings.warningPolicy.muteMinutes)) group.settings.warningPolicy.muteMinutes = 10;
    if (!Number.isInteger(group.settings.protectionPresetLevel)) group.settings.protectionPresetLevel = 0;
    if (typeof group.settings.requireReasonsForModeration !== 'boolean') group.settings.requireReasonsForModeration = false;
    if (typeof group.settings.disableGameEngagement !== 'boolean') group.settings.disableGameEngagement = false;
    if (typeof group.settings.notifyAdminLeave !== 'boolean') group.settings.notifyAdminLeave = false;
    if (typeof group.settings.welcomeEnabled !== 'boolean') group.settings.welcomeEnabled = false;
    if (typeof group.settings.welcomeTemplate !== 'string' || !group.settings.welcomeTemplate.trim()) {
      group.settings.welcomeTemplate = '👋 أهلًا {name} في {group}\n🆔 {id}\nنتمنى لك وقتًا ممتعًا معنا.';
    }
    if (!Number.isInteger(group.settings.suggestionCooldownSeconds)) group.settings.suggestionCooldownSeconds = 90;
    group.settings.suggestionCooldownSeconds = Math.max(10, Math.min(3600, Number(group.settings.suggestionCooldownSeconds) || 90));
    if (typeof group.settings.blockDuplicateSuggestions !== 'boolean') group.settings.blockDuplicateSuggestions = true;
    if (typeof group.settings.detectForAdminsOnly !== 'boolean') group.settings.detectForAdminsOnly = false;
    if (typeof group.settings.onlineForOwnersOnly !== 'boolean') group.settings.onlineForOwnersOnly = false;
    if (!Number.isInteger(group.settings.primaryOwnerId)) group.settings.primaryOwnerId = null;
    if (!Array.isArray(group.settings.basicOwnerIds)) group.settings.basicOwnerIds = [];
    if (!Number.isInteger(group.settings.basicOwnerId)) group.settings.basicOwnerId = null;
    if (Number.isInteger(group.settings.basicOwnerId) && !group.settings.basicOwnerIds.includes(group.settings.basicOwnerId)) {
      group.settings.basicOwnerIds.push(group.settings.basicOwnerId);
    }
    if (!Array.isArray(group.settings.ownerIds)) group.settings.ownerIds = [];
    if (!Array.isArray(group.settings.managerIds)) group.settings.managerIds = [];
    if (!Array.isArray(group.settings.adminIds)) group.settings.adminIds = [];
    if (!Array.isArray(group.settings.premiumMemberIds)) group.settings.premiumMemberIds = [];
    group.settings.basicOwnerIds = group.settings.basicOwnerIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    group.settings.ownerIds = group.settings.ownerIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    group.settings.managerIds = group.settings.managerIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    group.settings.adminIds = group.settings.adminIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    group.settings.premiumMemberIds = group.settings.premiumMemberIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    this.syncLegacyRoleFields(group);
    if (!Array.isArray(group.settings.exceptions)) group.settings.exceptions = [];
    if (!group.settings.templates) group.settings.templates = {};
    if (!group.settings.templates.member) group.settings.templates.member = {};
    if (!group.settings.templates.admin) group.settings.templates.admin = {};
    if (!Array.isArray(group.settings.faqTriggers)) group.settings.faqTriggers = [];
    group.settings.faqMatchMode = 'exact';
    group.settings.faqTriggers = group.settings.faqTriggers
      .map((item) => ({
        trigger: String(item?.trigger || '').trim(),
        response: String(item?.response || '').trim(),
        createdBy: Number.isInteger(item?.createdBy) ? Number(item.createdBy) : null,
        createdAt: item?.createdAt || new Date()
      }))
      .filter((item) => item.trigger && item.response);
    if (!Number.isInteger(group.settings.idealMemberId)) group.settings.idealMemberId = null;
    if (!Number.isInteger(group.settings.idealAdminId)) group.settings.idealAdminId = null;

    if (!Array.isArray(group.warnings)) group.warnings = [];
    if (!Array.isArray(group.bannedUsers)) group.bannedUsers = [];
    if (!Array.isArray(group.moderationLogs)) group.moderationLogs = [];
    if (!Array.isArray(group.suggestions)) group.suggestions = [];
    group.suggestions = group.suggestions
      .map((item) => ({
        suggestionId: Number(item?.suggestionId || 0),
        text: String(item?.text || '').trim(),
        createdBy: Number.isInteger(item?.createdBy) ? Number(item.createdBy) : null,
        createdByName: String(item?.createdByName || '').trim(),
        status: item?.status === 'closed' ? 'closed' : 'open',
        votesUp: Array.isArray(item?.votesUp) ? item.votesUp.map(Number).filter(Number.isInteger) : [],
        votesDown: Array.isArray(item?.votesDown) ? item.votesDown.map(Number).filter(Number.isInteger) : [],
        createdAt: item?.createdAt || new Date(),
        closedAt: item?.closedAt || null
      }))
      .filter((item) => item.suggestionId > 0 && item.text);
    if (group.suggestions.length > 200) group.suggestions = group.suggestions.slice(0, 200);
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

  static getProtectionPresetLabel(level) {
    const value = Number(level || 0);
    if (value === 2) return 'المستوى 2';
    if (value === 1) return 'المستوى 1';
    return 'غير مفعل';
  }

  static buildProtectionSettingsText(group) {
    const settings = group?.settings || {};
    const policy = this.getWarningPolicy(group);
    return (
      '🛡️ <b>اعدادات الحمايه</b>\n\n' +
      `• مستوى الحمايه ↤︎ ${this.getProtectionPresetLabel(settings.protectionPresetLevel)}\n` +
      `• حماية التكرار ↤︎ ${settings.floodProtection ? '✅' : '❌'}\n` +
      `• فلتر الكلمات ↤︎ ${settings.filterBadWords ? '✅' : '❌'}\n` +
      `• منع الاباحيه ↤︎ ${settings.blockExplicitContent ? '✅' : '❌'}\n` +
      `• منع الرسائل الطويله ↤︎ ${settings.blockLongMessages ? '✅' : '❌'}\n` +
      `• قفل الروابط ↤︎ ${settings.lockLinks ? '✅' : '❌'}\n` +
      `• قفل الملصقات ↤︎ ${settings.lockStickers ? '✅' : '❌'}\n` +
      `• العقوبات التلقائيه ↤︎ ${policy.enabled ? '✅' : '❌'}\n` +
      `• الكتم عند ↤︎ ${policy.muteAt}\n` +
      `• الحظر عند ↤︎ ${policy.banAt}\n` +
      `• مدة الكتم ↤︎ ${policy.muteMinutes} دقيقة`
    );
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
      `• قفل الملصقات: ${settings.lockStickers ? '✅' : '❌'}\n` +
      `• فلتر الكلمات: ${settings.filterBadWords ? '✅' : '❌'}\n` +
      `• منع الإباحي: ${settings.blockExplicitContent ? '✅' : '❌'}\n` +
      `• حماية التكرار: ${settings.floodProtection ? '✅' : '❌'}\n` +
      `• منع الرسائل الطويلة: ${settings.blockLongMessages ? '✅' : '❌'} (الحد: ${settings.maxMessageLength})\n` +
      `• استثناء المشرفين من الحماية: ${settings.exemptAdminsFromProtection ? '✅' : '❌'}\n` +
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
      '• /gprotect\n' +
      '• /gprotect links on|off\n' +
      '• /gprotect stickers on|off\n' +
      '• /gprotect words on|off\n' +
      '• /gprotect flood on|off\n' +
      '• /gprotect nsfw on|off\n' +
      '• /gprotect long on|off\n' +
      '• /gprotect maxlen 700\n' +
      '• /gprotect admins on|off\n' +
      '• /glogs\n' +
      '• /gclear (بالرد)\n' +
      '• تفاعل مشرف /gadminstats\n' +
      '• برنت /gprint\n' +
      '• تفعيل/تعطيل الاسباب للمشرفين\n' +
      '• رفع اساسي | تنزيل اساسي | الاساسيين\n' +
      '• رفع مالك | تنزيل مالك | المالكين\n' +
      '• رفع مدير | تنزيل مدير | المدراء\n' +
      '• رفع ادمن | تنزيل ادمن | الادمنية\n' +
      '• رفع مميز | تنزيل مميز | المميزين\n' +
      '• رفع/تنزيل استثناء | المستثنئين\n' +
      '• عدد الرتب\n' +
      '• تفعيل/تعطيل مغادره المشرفين\n\n' +
      '• /gwelcome إدارة الترحيب\n' +
      '• /gsuggest نظام الاقتراحات\n' +
      '• /gsuggestmenu لوحة الاقتراحات\n' +
      '• /gsuggeststats إحصائيات الاقتراحات\n' +
      '• /gsuggesttop ترتيب الاقتراحات\n' +
      '• /gfaq الردود التلقائية\n\n' +
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
    const lockStickers = Boolean(group?.settings?.lockStickers);
    const filterBadWords = Boolean(group?.settings?.filterBadWords);
    const floodProtection = Boolean(group?.settings?.floodProtection);
    const exemptAdmins = Boolean(group?.settings?.exemptAdminsFromProtection);

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(lockLinks ? '🔓 روابط' : '🔒 روابط', 'group:toggle:lockLinks'),
        Markup.button.callback(filterBadWords ? '🔓 كلمات' : '🔒 كلمات', 'group:toggle:filterBadWords')
      ],
      [
        Markup.button.callback(lockStickers ? '🔓 ملصقات' : '🔒 ملصقات', 'group:toggle:lockStickers'),
        Markup.button.callback(floodProtection ? '🔓 تكرار' : '🔒 تكرار', 'group:toggle:floodProtection')
      ],
      [
        Markup.button.callback(exemptAdmins ? '👮✅ استثناء المشرفين' : '👮❌ استثناء المشرفين', 'group:toggle:exemptAdminsFromProtection')
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
      '• /gprotect إعدادات الحماية السريعة\n' +
      '• /glogs عرض سجل الإدارة\n' +
      '• /gclear حذف رسالة بالرد\n' +
      '• تفاعل مشرف /gadminstats\n' +
      '• برنت /gprint\n' +
      '• تفعيل/تعطيل الاسباب للمشرفين\n' +
      '• رفع اساسي | تنزيل اساسي | الاساسيين\n' +
      '• رفع مالك | تنزيل مالك | المالكين\n' +
      '• رفع مدير | تنزيل مدير | المدراء\n' +
      '• رفع ادمن | تنزيل ادمن | الادمنية\n' +
      '• رفع مميز | تنزيل مميز | المميزين\n' +
      '• رفع/تنزيل استثناء | المستثنئين\n' +
      '• عدد الرتب\n' +
      '• تفعيل/تعطيل مغادره المشرفين\n\n' +
      '• /gwelcome إدارة الترحيب\n' +
      '• /gsuggest نظام الاقتراحات\n' +
      '• /gsuggestmenu لوحة الاقتراحات\n' +
      '• /gsuggeststats إحصائيات الاقتراحات\n' +
      '• /gsuggesttop ترتيب الاقتراحات\n' +
      '• /gfaq الردود التلقائية\n\n' +
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

  static getProtectionStatusText(group) {
    return (
      '🛡️ <b>حالة الحماية الحالية</b>\n\n' +
      `• الروابط: ${group.settings?.lockLinks ? '✅ مقفلة' : '❌ مفتوحة'}\n` +
      `• الملصقات: ${group.settings?.lockStickers ? '✅ مقفلة' : '❌ مفتوحة'}\n` +
      `• الكلمات: ${group.settings?.filterBadWords ? '✅ مفعلة' : '❌ معطلة'}\n` +
      `• الإباحي: ${group.settings?.blockExplicitContent ? '✅ مفعلة' : '❌ معطلة'}\n` +
      `• التكرار: ${group.settings?.floodProtection ? '✅ مفعلة' : '❌ معطلة'}\n` +
      `• الرسائل الطويلة: ${group.settings?.blockLongMessages ? '✅ مفعلة' : '❌ معطلة'} (الحد: ${group.settings?.maxMessageLength || 700})\n` +
      `• استثناء المشرفين: ${group.settings?.exemptAdminsFromProtection ? '✅ مفعل' : '❌ معطل'}\n\n` +
      '<b>أوامر سريعة:</b>\n' +
      '• قفل الروابط | فتح الروابط\n' +
      '• قفل الملصقات | فتح الملصقات\n' +
      '• تفعيل الكلمات | تعطيل الكلمات\n' +
      '• تفعيل التكرار | تعطيل التكرار\n' +
      '• تفعيل منع الاباحية | تعطيل منع الاباحية\n' +
      '• تفعيل منع الرسائل الطويلة | تعطيل منع الرسائل الطويلة\n' +
      '• استثناء المشرفين من الحماية | الغاء استثناء المشرفين من الحماية\n' +
      '• /gprotect links on|off\n' +
      '• /gprotect stickers on|off\n' +
      '• /gprotect words on|off\n' +
      '• /gprotect flood on|off\n' +
      '• /gprotect nsfw on|off\n' +
      '• /gprotect long on|off\n' +
      '• /gprotect maxlen 700\n' +
      '• /gprotect admins on|off'
    );
  }

  static async setProtectionSetting(ctx, key, value, source = 'manual') {
    if (!this.isGroupChat(ctx)) return false;

    const isAdmin = await this.isManagerOrHigher(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ أوامر الحماية للمشرفين فقط.');
      return { ok: false };
    }

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    group.settings[key] = Boolean(value);
    group.updatedAt = new Date();
    await this.addModerationLog(group, 'toggle_setting', ctx.from.id, null, `${key} => ${group.settings[key] ? 'on' : 'off'} (${source})`);
    await group.save();
    return { ok: true };
  }

  static parseOnOff(value) {
    const v = String(value || '').trim().toLowerCase();
    if (['on', '1', 'true', 'yes', 'enable', 'enabled'].includes(v)) return true;
    if (['off', '0', 'false', 'no', 'disable', 'disabled'].includes(v)) return false;
    return null;
  }

  static async handleProtectCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isManagerOrHigher(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);

    const args = this.parseCommandArgs(ctx);
    if (args.length < 2) {
      return ctx.reply(this.getProtectionStatusText(group), { parse_mode: 'HTML' });
    }

    const target = String(args[0] || '').toLowerCase();
    if (target === 'maxlen') {
      const lengthValue = parseInt(args[1] || '', 10);
      if (!Number.isInteger(lengthValue) || lengthValue < 100 || lengthValue > 4000) {
        return ctx.reply('❌ استخدم رقمًا بين 100 و 4000.\nمثال: /gprotect maxlen 700');
      }
      group.settings.maxMessageLength = lengthValue;
      group.updatedAt = new Date();
      await this.addModerationLog(group, 'toggle_setting', ctx.from.id, null, `maxMessageLength => ${lengthValue} (gprotect)`);
      await group.save();
      const refreshed = await this.ensureGroupRecord(ctx);
      return ctx.reply(this.getProtectionStatusText(refreshed), { parse_mode: 'HTML' });
    }

    const switchValue = this.parseOnOff(args[1]);
    if (switchValue === null) {
      return ctx.reply('❌ استخدم on أو off.\nمثال: /gprotect links on');
    }

    const keyMap = {
      links: 'lockLinks',
      stickers: 'lockStickers',
      words: 'filterBadWords',
      flood: 'floodProtection',
      nsfw: 'blockExplicitContent',
      long: 'blockLongMessages',
      admins: 'exemptAdminsFromProtection'
    };
    const key = keyMap[target];
    if (!key) {
      return ctx.reply('❌ الخيار غير معروف. استخدم: links أو stickers أو words أو flood أو nsfw أو long أو maxlen أو admins');
    }

    const result = await this.setProtectionSetting(ctx, key, switchValue, 'gprotect');
    if (!result?.ok) return;

    const freshGroup = await this.ensureGroupRecord(ctx);
    return ctx.reply(this.getProtectionStatusText(freshGroup), { parse_mode: 'HTML' });
  }

  static async handleGroupPanel(ctx) {
    if (!this.isGroupChat(ctx)) return;

    const isAdmin = await this.isManagerOrHigher(ctx);
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

    const isAdmin = await this.isManagerOrHigher(ctx);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ للمشرفين فقط', { show_alert: false });
      return;
    }

    const allowedKeys = new Set([
      'lockLinks',
      'filterBadWords',
      'floodProtection',
      'blockExplicitContent',
      'blockLongMessages',
      'exemptAdminsFromProtection'
    ]);
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
    const internalRoleLabel = this.getInternalRoleLabel(group, pending.targetUserId);
    const role = this.getRoleLabel(member?.status, isPrimaryOwner, internalRoleLabel);
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
    const isAdmin = await this.isAdminOrHigher(ctx);
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    const isAdmin = await this.isManagerOrHigher(ctx);
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    if (/^(الاساسي|الاساسيين|المالكين الاساسيين|\/gbasic)$/i.test(text)) {
      const rows = this.getRoleIds(group, 'basicOwnerIds');
      if (rows.length === 0) return ctx.reply('ℹ️ لا يوجد مالكون أساسيون مرفوعون.');
      const lines = rows.map((id, index) => `${index + 1}. <code>${id}</code>`);
      return ctx.reply(`👑 <b>المالكون الأساسيون</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(رفع اساسي|\/gbasic\s+set)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ اكتب الأمر بالرد على العضو أو بالمعرف.');
      if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ أنت بالفعل المالك الأساسي.');
      this.assignInternalRole(group, 'basicOwnerIds', target.id);
      await this.addModerationLog(group, 'set_basic_owner', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم رفعه مالك اساسي', target), { parse_mode: 'HTML' });
    }

    if (/^(تنزيل اساسي|\/gbasic\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ اكتب الأمر بالرد على العضو أو بالمعرف.');
      const targetId = Number(target.id);
      group.settings.basicOwnerIds = this.getRoleIds(group, 'basicOwnerIds').filter((id) => id !== targetId);
      this.syncLegacyRoleFields(group);
      await this.addModerationLog(group, 'remove_basic_owner', ctx.from.id, targetId);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم تنزيله من المالكين الاساسيين', target), { parse_mode: 'HTML' });
    }
  }

  static async handleProtectionPresetCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const rawText = String(ctx.message?.text || '').trim();
    const match = /^(?:تفعيل\s*الحمايه|تفعيل\s*الحماية|\/gprotectionlevel)\s+(\d+)$/i.exec(rawText);
    if (!match) {
      return ctx.reply(
        '❌ الصيغة:\n' +
        '• تفعيل الحمايه 2\n' +
        '• /gprotectionlevel 2'
      );
    }

    const level = parseInt(match[1], 10);
    if (level !== 2) {
      return ctx.reply('❌ المتاح حاليًا فقط: تفعيل الحمايه 2');
    }

    group.settings.protectionPresetLevel = 2;
    group.settings.floodProtection = true;
    group.settings.filterBadWords = true;
    group.settings.blockExplicitContent = true;
    group.settings.blockLongMessages = true;
    group.settings.warningPolicy = {
      enabled: true,
      muteAt: 2,
      banAt: 3,
      muteMinutes: 15
    };
    group.updatedAt = new Date();
    await this.addModerationLog(group, 'protection_preset_update', ctx.from.id, null, 'level=2');
    await group.save();

    return ctx.reply(
      '✅ تم تفعيل الحمايه 2\n\n' +
      '• حماية التكرار ↤︎ مفعلة\n' +
      '• فلتر الكلمات ↤︎ مفعل\n' +
      '• منع الاباحيه ↤︎ مفعل\n' +
      '• منع الرسائل الطويله ↤︎ مفعل\n' +
      '• الكتم عند ↤︎ 2\n' +
      '• الحظر عند ↤︎ 3\n' +
      '• مدة الكتم ↤︎ 15 دقيقة'
    );
  }

  static async handleProtectionSettingsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await this.isAdminOrHigher(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');
    const group = await this.ensureGroupRecord(ctx);
    return ctx.reply(this.buildProtectionSettingsText(group), { parse_mode: 'HTML' });
  }

  static async handleOwnerRoleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو المالكين الأساسيين أو المالكين فقط.');

    if (/^(المالكين|\/gowner)$/i.test(text)) {
      const rows = this.getRoleIds(group, 'ownerIds');
      if (rows.length === 0) return ctx.reply('ℹ️ لا يوجد مالكون مرفوعون.');
      const lines = rows.map((id, index) => `${index + 1}. <code>${id}</code>`);
      return ctx.reply(`👑 <b>المالكون</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(رفع مالك|\/gowner\s+add)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      this.assignInternalRole(group, 'ownerIds', target.id);
      await this.addModerationLog(group, 'add_owner_role', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم رفعه مالك', target), { parse_mode: 'HTML' });
    }

    if (/^(تنزيل مالك|\/gowner\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      const targetId = Number(target.id);
      group.settings.ownerIds = this.getRoleIds(group, 'ownerIds').filter((id) => id !== targetId);
      await this.addModerationLog(group, 'remove_owner_role', ctx.from.id, targetId);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم تنزيله من المالكين', target), { parse_mode: 'HTML' });
    }
  }

  static async handleManagerRoleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو المالكين الأساسيين أو المالكين فقط.');

    if (/^(المدراء|\/gmanager)$/i.test(text)) {
      const rows = this.getRoleIds(group, 'managerIds');
      if (rows.length === 0) return ctx.reply('ℹ️ لا يوجد مدراء مرفوعون.');
      const lines = rows.map((id, index) => `${index + 1}. <code>${id}</code>`);
      return ctx.reply(`🛠️ <b>المدراء</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(رفع مدير|\/gmanager\s+add)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      this.assignInternalRole(group, 'managerIds', target.id);
      await this.addModerationLog(group, 'add_manager_role', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم رفعه مدير', target), { parse_mode: 'HTML' });
    }

    if (/^(تنزيل مدير|\/gmanager\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      const targetId = Number(target.id);
      group.settings.managerIds = this.getRoleIds(group, 'managerIds').filter((id) => id !== targetId);
      await this.addModerationLog(group, 'remove_manager_role', ctx.from.id, targetId);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم تنزيله من المدراء', target), { parse_mode: 'HTML' });
    }
  }

  static async handleAdminRoleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const canUse = await this.isManagerOrHigher(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمدراء فما فوق فقط.');

    if (/^(الادمنية|الأدمنية|الادمن|الادمنز|\/gadmins)$/i.test(text)) {
      const rows = this.getRoleIds(group, 'adminIds');
      if (rows.length === 0) return ctx.reply('ℹ️ لا يوجد أدمنية مرفوعون.');
      const lines = rows.map((id, index) => `${index + 1}. <code>${id}</code>`);
      return ctx.reply(`🛡️ <b>الأدمنية</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(رفع ادمن|\/gadmins\s+add)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      this.assignInternalRole(group, 'adminIds', target.id);
      await this.addModerationLog(group, 'add_admin_role', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم رفعه أدمن', target), { parse_mode: 'HTML' });
    }

    if (/^(تنزيل ادمن|\/gadmins\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      const targetId = Number(target.id);
      group.settings.adminIds = this.getRoleIds(group, 'adminIds').filter((id) => id !== targetId);
      await this.addModerationLog(group, 'remove_admin_role', ctx.from.id, targetId);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم تنزيله من الأدمنية', target), { parse_mode: 'HTML' });
    }
  }

  static async handlePremiumMemberCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو المالكين الأساسيين أو المالكين فقط.');

    if (/^(المميزين|\/gpremium)$/i.test(text)) {
      const rows = this.getRoleIds(group, 'premiumMemberIds');
      if (rows.length === 0) return ctx.reply('ℹ️ لا يوجد أعضاء مميزون حاليًا.');
      const lines = rows.slice(0, 50).map((id, index) => `${index + 1}. <code>${id}</code>`);
      return ctx.reply(`🌟 <b>المميزين</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    }

    if (/^(رفع مميز|\/gpremium\s+add)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      this.assignInternalRole(group, 'premiumMemberIds', target.id);
      await this.addModerationLog(group, 'add_premium_member', ctx.from.id, target.id);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم رفعه مميز', target), { parse_mode: 'HTML' });
    }

    if (/^(تنزيل مميز|\/gpremium\s+remove)/i.test(text)) {
      const target = await this.resolveTargetUser(ctx, this.parseCommandArgs(ctx).slice(1));
      if (!target?.id) return ctx.reply('❌ استخدم الأمر بالرد على العضو أو بالمعرف.');
      const targetId = Number(target.id);
      group.settings.premiumMemberIds = this.getRoleIds(group, 'premiumMemberIds').filter((id) => id !== targetId);
      await this.addModerationLog(group, 'remove_premium_member', ctx.from.id, targetId);
      await group.save();
      return ctx.reply(this.formatRoleActionMessage('تم تنزيله من المميزين', target), { parse_mode: 'HTML' });
    }
  }

  static async handleRankListCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const group = await this.ensureGroupRecord(ctx);
    const text = String(ctx.message?.text || '').trim();
    const canUse = await this.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو المالكين الأساسيين أو المالكين فقط.');

    const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id).catch(() => []);
    const creators = admins
      .filter((member) => member.status === 'creator')
      .map((member) => Number(member.user?.id))
      .filter(Boolean);

    const roleMap = {
      'المنشئين': creators,
      'المالكين الاساسيين': this.getRoleIds(group, 'basicOwnerIds'),
      'المالكين': this.getRoleIds(group, 'ownerIds'),
      'المدراء': this.getRoleIds(group, 'managerIds'),
      'الادمنية': this.getRoleIds(group, 'adminIds'),
      'الأدمنية': this.getRoleIds(group, 'adminIds'),
      'المميزين': this.getRoleIds(group, 'premiumMemberIds')
    };

    const rows = roleMap[text];
    if (!rows) return false;
    if (rows.length === 0) return ctx.reply(`ℹ️ لا يوجد ${text} حاليًا.`);
    const lines = rows.slice(0, 50).map((id, index) => `${index + 1}. <code>${id}</code>`);
    return ctx.reply(`📋 <b>${text}</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
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
    const basicCount = this.getRoleIds(group, 'basicOwnerIds').length;
    const ownersCount = this.getRoleIds(group, 'ownerIds').length;
    const managersCount = this.getRoleIds(group, 'managerIds').length;
    const internalAdminsCount = this.getRoleIds(group, 'adminIds').length;
    const premiumCount = this.getRoleIds(group, 'premiumMemberIds').length;
    const exceptionCount = Array.isArray(group.settings?.exceptions) ? group.settings.exceptions.length : 0;
    return ctx.reply(
      '📊 <b>عدد الرتب</b>\n\n' +
        `• المنشئين: ${creatorsCount}\n` +
        `• المالكين الاساسيين: ${basicCount}\n` +
        `• المالكين: ${ownersCount}\n` +
        `• المدراء: ${managersCount}\n` +
        `• الأدمنية: ${internalAdminsCount}\n` +
        `• المميزين: ${premiumCount}\n` +
        `• مشرفو تيليجرام: ${adminCount}\n` +
        `• المستثنين: ${exceptionCount}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleDetectToggle(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isManagerOrHigher(ctx);
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

  static buildFaqHelpText(group) {
    const count = Array.isArray(group?.settings?.faqTriggers) ? group.settings.faqTriggers.length : 0;
    const mode = 'exact';
    const modeLabel = 'حرفي';
    return (
      `🤖 الردود التلقائية (FAQ)\n\n` +
      `• العدد الحالي: ${count}\n\n` +
      `• وضع المطابقة: ${modeLabel}\n\n` +
      `أوامر سريعة:\n` +
      `• اضف رد مرحبا | أهلًا وسهلًا\n` +
      `• حذف رد مرحبا\n` +
      `• الردود\n` +
      `• مسح الردود\n` +
      `• وضع الردود حرفي\n\n` +
      `أوامر سلاش:\n` +
      `• /gfaq add مرحبا | أهلًا وسهلًا\n` +
      `• /gfaq remove مرحبا\n` +
      `• /gfaq list\n` +
      `• /gfaq clear\n` +
      `• /gfaq mode exact`
    );
  }

  static parseFaqPayload(payload = '') {
    const raw = String(payload || '').trim();
    const parts = raw.split('|');
    if (parts.length < 2) return null;
    const trigger = String(parts[0] || '').trim();
    const response = String(parts.slice(1).join('|') || '').trim();
    if (!trigger || !response) return null;
    return { trigger, response };
  }

  static async handleFaqCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const isAdmin = await this.isAdminOrHigher(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ هذا الأمر للمشرفين فقط.');
      return true;
    }

    const group = await this.ensureGroupRecord(ctx);
    const rawText = String(ctx.message?.text || '').trim();
    const slashMatch = rawText.match(/^\/gfaq(?:@\w+)?(?:\s+(.+))?$/i);
    const lowered = rawText.toLowerCase();
    const triggers = Array.isArray(group.settings?.faqTriggers) ? group.settings.faqTriggers : [];

    const modeArabic = rawText.match(/^وضع الردود\s+(حرفي)$/i);
    const modeSlash = slashMatch && /^(mode|match)\s+(\S+)$/i.test(String(slashMatch[1] || '').trim())
      ? String(slashMatch[1] || '').trim().replace(/^(mode|match)\s+/i, '').trim()
      : '';
    if (modeArabic || modeSlash) {
      const candidate = modeArabic ? String(modeArabic[1] || '').trim() : modeSlash;
      const normalized = String(candidate || '').toLowerCase();
      let mode = null;
      if (['حرفي', 'exact', 'strict'].includes(normalized)) mode = 'exact';
      if (!mode) {
        await ctx.reply('❌ وضع غير معروف. استخدم: حرفي (أو exact).');
        return true;
      }
      group.settings.faqMatchMode = mode;
      await this.addModerationLog(group, 'faq_mode', ctx.from.id, null, mode);
      await group.save();
      await ctx.reply('✅ تم تحديث وضع مطابقة الردود إلى: حرفي.');
      return true;
    }

    if (/^(الردود|عرض الردود)$/i.test(rawText) || (slashMatch && /^(list|ls)$/i.test(String(slashMatch[1] || '').trim()))) {
      if (triggers.length === 0) {
        await ctx.reply('ℹ️ لا يوجد ردود تلقائية مضافة بعد.');
        return true;
      }
      const rows = triggers.slice(0, 50).map((item, i) => `${i + 1}. <b>${item.trigger}</b>\n↳ ${item.response}`);
      await ctx.reply(`📚 قائمة الردود (${triggers.length})\n\n${rows.join('\n\n')}`, { parse_mode: 'HTML' });
      return true;
    }

    if (/^مسح الردود$/i.test(rawText) || (slashMatch && /^(clear|reset)$/i.test(String(slashMatch[1] || '').trim()))) {
      group.settings.faqTriggers = [];
      await this.addModerationLog(group, 'faq_clear', ctx.from.id, null, 'clear all FAQ triggers');
      await group.save();
      await ctx.reply('🧹 تم مسح جميع الردود التلقائية.');
      return true;
    }

    const removeArabic = rawText.match(/^حذف رد\s+(.+)$/i);
    if (removeArabic || (slashMatch && /^(remove|del|delete)\s+(.+)$/i.test(String(slashMatch[1] || '').trim()))) {
      const triggerText = removeArabic
        ? String(removeArabic[1] || '').trim()
        : String(String(slashMatch[1] || '').trim().replace(/^(remove|del|delete)\s+/i, '')).trim();
      const key = this.normalizePlainText(triggerText);
      const before = group.settings.faqTriggers.length;
      group.settings.faqTriggers = group.settings.faqTriggers.filter((item) => this.normalizePlainText(item.trigger) !== key);
      if (group.settings.faqTriggers.length === before) {
        await ctx.reply('❌ لم أجد هذا المفتاح في الردود التلقائية.');
        return true;
      }
      await this.addModerationLog(group, 'faq_remove', ctx.from.id, null, triggerText);
      await group.save();
      await ctx.reply(`✅ تم حذف الرد التلقائي: ${triggerText}`);
      return true;
    }

    const addArabic = rawText.match(/^(?:اضف|أضف) رد\s+(.+)$/i);
    const addSlash = slashMatch && /^(add|set)\s+(.+)$/i.test(String(slashMatch[1] || '').trim())
      ? String(slashMatch[1] || '').trim().replace(/^(add|set)\s+/i, '')
      : '';
    if (addArabic || addSlash) {
      const payload = addArabic ? String(addArabic[1] || '').trim() : addSlash;
      const parsed = this.parseFaqPayload(payload);
      if (!parsed) {
        await ctx.reply('❌ الصيغة غير صحيحة.\nاستخدم: اضف رد المفتاح | الرد');
        return true;
      }

      const trigger = parsed.trigger.slice(0, 80);
      const response = parsed.response.slice(0, 1500);
      const key = this.normalizePlainText(trigger);
      const existingIndex = group.settings.faqTriggers.findIndex((item) => this.normalizePlainText(item.trigger) === key);
      const row = {
        trigger,
        response,
        createdBy: Number(ctx.from?.id || 0) || null,
        createdAt: new Date()
      };
      if (existingIndex >= 0) {
        group.settings.faqTriggers[existingIndex] = row;
      } else {
        group.settings.faqTriggers.push(row);
      }
      await this.addModerationLog(group, existingIndex >= 0 ? 'faq_update' : 'faq_add', ctx.from.id, null, trigger);
      await group.save();
      await ctx.reply(`✅ تم حفظ الرد التلقائي.\nالمفتاح: ${trigger}`);
      return true;
    }

    if (/^\/gfaq(?:@\w+)?$/i.test(rawText) || /^(الردود|ردود)$/i.test(lowered)) {
      await ctx.reply(this.buildFaqHelpText(group));
      return true;
    }

    return false;
  }

  static async maybeReplyFaqTrigger(ctx, group, rawText) {
    if (!this.isGroupChat(ctx)) return false;
    if (!group?.settings?.faqTriggers?.length) return false;
    const text = String(rawText || '').trim();
    if (!text || text.startsWith('/')) return false;

    const normalizedText = this.normalizePlainText(text);
    const sorted = [...group.settings.faqTriggers].sort((a, b) => b.trigger.length - a.trigger.length);
    const matched = sorted.find((item) => {
      const key = this.normalizePlainText(item.trigger);
      if (!key) return false;
      return normalizedText === key;
    });

    if (!matched) return false;
    await ctx.reply(String(matched.response || '').trim(), {
      reply_to_message_id: ctx.message?.message_id
    });
    return true;
  }

  static renderWelcomeTemplate(template, user, chat) {
    const safeTemplate = String(template || '').trim() || '👋 أهلًا {name} في {group}\n🆔 {id}';
    const name = user?.first_name || user?.username || String(user?.id || 'عضو');
    const username = user?.username ? `@${user.username}` : '';
    const groupName = chat?.title || 'المجموعة';
    const userId = String(user?.id || '');
    return safeTemplate
      .replace(/\{name\}/g, name)
      .replace(/\{username\}/g, username)
      .replace(/\{group\}/g, groupName)
      .replace(/\{id\}/g, userId)
      .slice(0, 4000);
  }

  static async handleWelcomeCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const isAdmin = await this.isAdminOrHigher(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ أوامر الترحيب للمشرفين فقط.');
      return true;
    }

    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const rawText = String(ctx.message?.text || '').trim();
    const slashMatch = rawText.match(/^\/gwelcome(?:@\w+)?(?:\s+(.+))?$/i);

    if (/^تفعيل الترحيب$/i.test(rawText) || (slashMatch && /^on$/i.test(String(slashMatch[1] || '').trim()))) {
      group.settings.welcomeEnabled = true;
      await this.addModerationLog(group, 'welcome_toggle', ctx.from.id, null, 'on');
      await group.save();
      await ctx.reply('✅ تم تفعيل رسالة الترحيب.');
      return true;
    }

    if (/^تعطيل الترحيب$/i.test(rawText) || (slashMatch && /^off$/i.test(String(slashMatch[1] || '').trim()))) {
      group.settings.welcomeEnabled = false;
      await this.addModerationLog(group, 'welcome_toggle', ctx.from.id, null, 'off');
      await group.save();
      await ctx.reply('✅ تم تعطيل رسالة الترحيب.');
      return true;
    }

    const setArabic = rawText.match(/^رسالة الترحيب\s+([\s\S]+)$/i);
    const setSlash = slashMatch && /^set\s+/i.test(String(slashMatch[1] || '').trim())
      ? String(slashMatch[1] || '').trim().replace(/^set\s+/i, '')
      : '';
    if (setArabic || setSlash) {
      const template = String(setArabic ? setArabic[1] : setSlash).trim();
      if (!template) {
        await ctx.reply('❌ اكتب نص رسالة الترحيب.');
        return true;
      }
      group.settings.welcomeTemplate = template.slice(0, 2000);
      await this.addModerationLog(group, 'welcome_template', ctx.from.id, null, 'updated');
      await group.save();
      await ctx.reply('✅ تم تحديث رسالة الترحيب.\nالمتغيرات المتاحة: {name} {username} {group} {id}');
      return true;
    }

    if (/^(عرض الترحيب|معاينة الترحيب)$/i.test(rawText) || (slashMatch && /^(show|preview)$/i.test(String(slashMatch[1] || '').trim()))) {
      const preview = this.renderWelcomeTemplate(group.settings.welcomeTemplate, ctx.from, ctx.chat);
      await ctx.reply(
        `🧩 حالة الترحيب: ${group.settings.welcomeEnabled ? '✅ مفعل' : '❌ معطل'}\n\n` +
          `📄 القالب الحالي:\n${group.settings.welcomeTemplate}\n\n` +
          `🔎 معاينة:\n${preview}`
      );
      return true;
    }

    if (/^\/gwelcome(?:@\w+)?$/i.test(rawText) || /^الترحيب$/i.test(rawText)) {
      await ctx.reply(
        '👋 إعدادات الترحيب\n\n' +
          '• تفعيل الترحيب\n' +
          '• تعطيل الترحيب\n' +
          '• رسالة الترحيب أهلًا {name} في {group}\n' +
          '• عرض الترحيب\n\n' +
          '• /gwelcome on\n' +
          '• /gwelcome off\n' +
          '• /gwelcome set أهلًا {name} في {group}\n' +
          '• /gwelcome show'
      );
      return true;
    }

    return false;
  }

  static suggestionKeyboard(item, canClose) {
    const up = Array.isArray(item?.votesUp) ? item.votesUp.length : 0;
    const down = Array.isArray(item?.votesDown) ? item.votesDown.length : 0;
    const rows = [[
      Markup.button.callback(`👍 ${up}`, `group:suggest:up:${item.suggestionId}`),
      Markup.button.callback(`👎 ${down}`, `group:suggest:down:${item.suggestionId}`)
    ]];
    if (canClose && item?.status === 'open') {
      rows.push([Markup.button.callback('🛑 إغلاق الاقتراح', `group:suggest:close:${item.suggestionId}`)]);
    }
    return Markup.inlineKeyboard(rows);
  }

  static formatSuggestionCard(item) {
    const up = Array.isArray(item?.votesUp) ? item.votesUp.length : 0;
    const down = Array.isArray(item?.votesDown) ? item.votesDown.length : 0;
    const statusLabel = item?.status === 'closed' ? '🔒 مغلق' : '🟢 مفتوح';
    return (
      `💡 <b>اقتراح #${item.suggestionId}</b>\n\n` +
      `${item.text}\n\n` +
      `👤 بواسطة: ${item.createdByName || item.createdBy || 'عضو'}\n` +
      `📌 الحالة: ${statusLabel}\n` +
      `👍 ${up} | 👎 ${down}`
    );
  }

  static nextSuggestionId(group) {
    const max = (group.suggestions || []).reduce((m, item) => Math.max(m, Number(item?.suggestionId || 0)), 0);
    return max + 1;
  }

  static normalizeSuggestionText(text) {
    return this.normalizePlainText(text)
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
  }

  static getSuggestionWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 6) % 7;
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - diff);
    return now;
  }

  static buildSuggestionStats(group) {
    const suggestions = Array.isArray(group?.suggestions) ? group.suggestions : [];
    const weekStart = this.getSuggestionWeekStart();
    const weekly = suggestions.filter((s) => new Date(s.createdAt || 0) >= weekStart);
    const openCount = weekly.filter((s) => s.status === 'open').length;
    const closedCount = weekly.filter((s) => s.status === 'closed').length;
    const totalVotes = weekly.reduce((sum, s) => sum + (Array.isArray(s.votesUp) ? s.votesUp.length : 0) + (Array.isArray(s.votesDown) ? s.votesDown.length : 0), 0);

    const topSuggestion = [...weekly]
      .sort((a, b) => ((b.votesUp?.length || 0) - (b.votesDown?.length || 0)) - ((a.votesUp?.length || 0) - (a.votesDown?.length || 0)))[0] || null;

    const byUser = new Map();
    for (const s of weekly) {
      const uid = Number(s.createdBy || 0);
      if (!uid) continue;
      byUser.set(uid, (byUser.get(uid) || 0) + 1);
    }
    const topAuthorEntry = [...byUser.entries()].sort((a, b) => b[1] - a[1])[0] || null;

    return {
      weeklyCount: weekly.length,
      openCount,
      closedCount,
      totalVotes,
      topSuggestion,
      topAuthorEntry
    };
  }

  static getSuggestionMonthStart() {
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now;
  }

  static buildSuggestionMonthlyTop(group) {
    const suggestions = Array.isArray(group?.suggestions) ? group.suggestions : [];
    const monthStart = this.getSuggestionMonthStart();
    const monthly = suggestions.filter((s) => new Date(s.createdAt || 0) >= monthStart);

    const statsByUser = new Map();
    const touch = (userId, nameHint = '') => {
      const uid = Number(userId || 0);
      if (!uid) return null;
      if (!statsByUser.has(uid)) {
        statsByUser.set(uid, {
          userId: uid,
          name: String(nameHint || ''),
          suggestionsCount: 0,
          votesCast: 0,
          upReceived: 0,
          downReceived: 0,
          score: 0
        });
      }
      const row = statsByUser.get(uid);
      if (!row.name && nameHint) row.name = String(nameHint);
      return row;
    };

    for (const s of monthly) {
      const author = touch(s.createdBy, s.createdByName);
      if (author) {
        author.suggestionsCount += 1;
        author.upReceived += Array.isArray(s.votesUp) ? s.votesUp.length : 0;
        author.downReceived += Array.isArray(s.votesDown) ? s.votesDown.length : 0;
      }
      for (const voterId of (Array.isArray(s.votesUp) ? s.votesUp : [])) {
        const voter = touch(voterId);
        if (voter) voter.votesCast += 1;
      }
      for (const voterId of (Array.isArray(s.votesDown) ? s.votesDown : [])) {
        const voter = touch(voterId);
        if (voter) voter.votesCast += 1;
      }
    }

    const rows = [...statsByUser.values()].map((row) => {
      row.score = (row.suggestionsCount * 3) + row.votesCast + Math.max(0, row.upReceived - row.downReceived);
      return row;
    });
    rows.sort((a, b) => b.score - a.score || b.suggestionsCount - a.suggestionsCount || b.votesCast - a.votesCast);

    return {
      monthlyCount: monthly.length,
      top10: rows.slice(0, 10)
    };
  }

  static suggestionMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إضافة اقتراح', 'group:suggestmenu:new'),
        Markup.button.callback('📋 عرض الاقتراحات', 'group:suggestmenu:list')
      ],
      [
        Markup.button.callback('📊 إحصائيات الأسبوع', 'group:suggestmenu:stats'),
        Markup.button.callback('🏆 ترتيب الشهر', 'group:suggestmenu:top')
      ]
    ]);
  }

  static async handleSuggestionMenuCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    await ctx.reply(
      '💡 <b>لوحة الاقتراحات</b>\n\n' +
        'اختر من الأزرار:\n' +
        '• إضافة اقتراح جديد\n' +
        '• عرض آخر الاقتراحات\n' +
        '• إحصائيات هذا الأسبوع\n' +
        '• ترتيب أفضل الأعضاء هذا الشهر',
      { parse_mode: 'HTML', reply_markup: this.suggestionMenuKeyboard().reply_markup }
    );
    return true;
  }

  static async handleSuggestionStatsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const stats = this.buildSuggestionStats(group);
    const topSuggestionLine = stats.topSuggestion
      ? `#${stats.topSuggestion.suggestionId} (${(stats.topSuggestion.votesUp?.length || 0) - (stats.topSuggestion.votesDown?.length || 0)} صافي)\n${stats.topSuggestion.text.slice(0, 120)}`
      : 'لا يوجد بعد';
    const topAuthorLine = stats.topAuthorEntry ? `<code>${stats.topAuthorEntry[0]}</code> (${stats.topAuthorEntry[1]} اقتراح)` : 'لا يوجد بعد';

    await ctx.reply(
      '📊 <b>إحصائيات الاقتراحات (هذا الأسبوع)</b>\n\n' +
        `• عدد الاقتراحات: ${stats.weeklyCount}\n` +
        `• المفتوح: ${stats.openCount}\n` +
        `• المغلق: ${stats.closedCount}\n` +
        `• إجمالي التصويتات: ${stats.totalVotes}\n` +
        `• أفضل اقتراح:\n${topSuggestionLine}\n\n` +
        `• الأكثر اقتراحًا: ${topAuthorLine}`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  static async handleSuggestionListCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const list = (group.suggestions || []).slice(0, 10);
    if (list.length === 0) {
      await ctx.reply('ℹ️ لا توجد اقتراحات بعد.');
      return true;
    }
    const rows = list.map((item) => {
      const up = Array.isArray(item.votesUp) ? item.votesUp.length : 0;
      const down = Array.isArray(item.votesDown) ? item.votesDown.length : 0;
      return `#${item.suggestionId} | ${item.status === 'open' ? 'مفتوح' : 'مغلق'} | 👍${up} 👎${down}\n${item.text}`;
    });
    await ctx.reply(`📋 آخر الاقتراحات\n\n${rows.join('\n\n')}`);
    return true;
  }

  static async handleSuggestionTopCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const data = this.buildSuggestionMonthlyTop(group);

    if (data.top10.length === 0) {
      await ctx.reply('ℹ️ لا توجد بيانات اقتراحات لهذا الشهر بعد.');
      return true;
    }

    const rows = data.top10.map((row, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const display = row.name || `ID ${row.userId}`;
      return (
        `${medal} ${display}\n` +
        `• اقتراحات: ${row.suggestionsCount} | تصويتات: ${row.votesCast}\n` +
        `• دعم: +${row.upReceived} / -${row.downReceived}\n` +
        `• النقاط: ${row.score}`
      );
    });

    await ctx.reply(
      `🏆 <b>أفضل 10 أعضاء - الاقتراحات والتصويت (شهري)</b>\n\n` +
        `📦 إجمالي الاقتراحات هذا الشهر: ${data.monthlyCount}\n\n` +
        `${rows.join('\n\n')}`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  static async handleSuggestionCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const group = await this.ensureGroupRecord(ctx);
    this.normalizeGroupState(group);
    const rawText = String(ctx.message?.text || '').trim();
    const slashMatch = rawText.match(/^\/gsuggest(?:@\w+)?(?:\s+([\s\S]+))?$/i);
    if (/^\/gsuggestmenu(?:@\w+)?$/i.test(rawText) || /^(?:قائمة الاقتراحات|لوحة الاقتراحات)$/i.test(rawText)) {
      return this.handleSuggestionMenuCommand(ctx);
    }
    if (/^\/gsuggeststats(?:@\w+)?$/i.test(rawText) || /^(?:احصائيات الاقتراحات|إحصائيات الاقتراحات|احصائيات الاقتراح|إحصائيات الاقتراح)$/i.test(rawText)) {
      return this.handleSuggestionStatsCommand(ctx);
    }
    if (/^\/gsuggesttop(?:@\w+)?$/i.test(rawText) || /^(?:ترتيب الاقتراحات|ترتيب الاقتراحات الشهري|ترتيب الشهر للاقتراحات)$/i.test(rawText)) {
      return this.handleSuggestionTopCommand(ctx);
    }

    const setCooldownArabic = rawText.match(/^مهلة الاقتراح\s+(\d+)$/i);
    const setCooldownSlash = slashMatch && /^cooldown\s+(\d+)$/i.test(String(slashMatch[1] || '').trim())
      ? parseInt(String(slashMatch[1] || '').trim().replace(/^cooldown\s+/i, ''), 10)
      : null;
    if (setCooldownArabic || setCooldownSlash) {
      const isAdmin = await this.isGroupAdmin(ctx);
      if (!isAdmin) {
        await ctx.reply('❌ تغيير المهلة للمشرفين فقط.');
        return true;
      }
      const seconds = Math.max(10, Math.min(3600, Number(setCooldownArabic ? setCooldownArabic[1] : setCooldownSlash) || 90));
      group.settings.suggestionCooldownSeconds = seconds;
      await this.addModerationLog(group, 'suggestion_cooldown_update', ctx.from.id, null, `${seconds}s`);
      await group.save();
      await ctx.reply(`✅ تم ضبط مهلة الاقتراح على ${seconds} ثانية.`);
      return true;
    }

    if (/^(?:الاقتراحات|عرض الاقتراحات)$/i.test(rawText) || (slashMatch && /^(list|ls)$/i.test(String(slashMatch[1] || '').trim()))) {
      return this.handleSuggestionListCommand(ctx);
    }

    const closeArabic = rawText.match(/^اغلاق اقتراح\s+(\d+)$/i);
    const closeSlash = slashMatch && /^close\s+(\d+)$/i.test(String(slashMatch[1] || '').trim())
      ? parseInt(String(slashMatch[1] || '').trim().replace(/^close\s+/i, ''), 10)
      : null;
    if (closeArabic || closeSlash) {
      const isAdmin = await this.isGroupAdmin(ctx);
      if (!isAdmin) {
        await ctx.reply('❌ إغلاق الاقتراحات للمشرفين فقط.');
        return true;
      }
      const id = closeArabic ? parseInt(closeArabic[1], 10) : closeSlash;
      const target = group.suggestions.find((x) => Number(x.suggestionId) === Number(id));
      if (!target) {
        await ctx.reply('❌ رقم الاقتراح غير موجود.');
        return true;
      }
      target.status = 'closed';
      target.closedAt = new Date();
      await this.addModerationLog(group, 'suggestion_close', ctx.from.id, null, `suggestion#${id}`);
      await group.save();
      await ctx.reply(`✅ تم إغلاق الاقتراح #${id}.`);
      return true;
    }

    const addArabic = rawText.match(/^اقتراح\s+([\s\S]+)$/i);
    const addSlash = slashMatch && !/^(list|ls|close\s+\d+)$/i.test(String(slashMatch[1] || '').trim())
      ? String(slashMatch[1] || '').trim()
      : '';
    if (addArabic || addSlash) {
      const text = String(addArabic ? addArabic[1] : addSlash).trim();
      if (!text) {
        await ctx.reply('❌ اكتب نص الاقتراح بعد الأمر.');
        return true;
      }
      if (text.length < 4) {
        await ctx.reply('❌ الاقتراح قصير جدًا. اكتب نصًا أوضح.');
        return true;
      }

      const userId = Number(ctx.from?.id || 0);
      const cooldownSeconds = Number(group.settings?.suggestionCooldownSeconds || 90);
      const lastOwnSuggestion = (group.suggestions || [])
        .filter((s) => Number(s.createdBy) === userId)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
      if (lastOwnSuggestion) {
        const elapsedMs = Date.now() - new Date(lastOwnSuggestion.createdAt || 0).getTime();
        const remaining = Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000);
        if (remaining > 0) {
          await ctx.reply(`⏳ انتظر ${remaining} ثانية قبل إرسال اقتراح جديد.`);
          return true;
        }
      }

      if (group.settings?.blockDuplicateSuggestions) {
        const normalized = this.normalizeSuggestionText(text);
        const dup = (group.suggestions || []).find((s) => {
          const oldNorm = this.normalizeSuggestionText(s.text);
          return oldNorm && normalized && oldNorm === normalized;
        });
        if (dup) {
          await ctx.reply(`⚠️ هذا الاقتراح مكرر (رقم #${dup.suggestionId}). استخدم "الاقتراحات" لرؤيته.`);
          return true;
        }
      }

      const item = {
        suggestionId: this.nextSuggestionId(group),
        text: text.slice(0, 1000),
        createdBy: userId || null,
        createdByName: ctx.from?.first_name || ctx.from?.username || String(ctx.from?.id || ''),
        status: 'open',
        votesUp: [],
        votesDown: [],
        createdAt: new Date()
      };
      group.suggestions.unshift(item);
      if (group.suggestions.length > 200) group.suggestions = group.suggestions.slice(0, 200);
      await this.addModerationLog(group, 'suggestion_add', ctx.from.id, null, `suggestion#${item.suggestionId}`);
      await group.save();
      const isAdmin = await this.isGroupAdmin(ctx);
      await ctx.reply(this.formatSuggestionCard(item), {
        parse_mode: 'HTML',
        reply_markup: this.suggestionKeyboard(item, isAdmin).reply_markup
      });
      return true;
    }

    if (/^\/gsuggest(?:@\w+)?$/i.test(rawText) || /^اقتراحات$/i.test(rawText)) {
      await ctx.reply(
        '💡 نظام الاقتراحات\n\n' +
          '• اقتراح نص الفكرة\n' +
          '• الاقتراحات\n' +
          '• قائمة الاقتراحات\n' +
          '• احصائيات الاقتراحات\n' +
          '• ترتيب الاقتراحات\n' +
          '• مهلة الاقتراح 90 (للمشرف)\n' +
          '• اغلاق اقتراح 12 (للمشرف)\n\n' +
          '• /gsuggest اكتب هنا فكرة\n' +
          '• /gsuggestmenu\n' +
          '• /gsuggest list\n' +
          '• /gsuggeststats\n' +
          '• /gsuggesttop\n' +
          '• /gsuggest cooldown 90\n' +
          '• /gsuggest close 12'
      );
      return true;
    }

    return false;
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
    const isBasic = this.getRoleIds(group, 'basicOwnerIds').includes(Number(userId));
    const isOwner = this.getRoleIds(group, 'ownerIds').includes(Number(userId));
    if (!isPrimary && !isBasic && !isOwner) {
      return { ok: false, message: '❌ هذه الميزة للمالك الأساسي أو المالكين الأساسيين أو المالكين فقط.' };
    }
    return { ok: true, group, isPrimary, isBasic, isOwner };
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    const isAdmin = await this.isAdminOrHigher(ctx);
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

    if (data.startsWith('group:suggest:')) {
      const [, , action, suggestionIdRaw] = data.split(':');
      const suggestionId = parseInt(suggestionIdRaw || '', 10);
      if (!Number.isInteger(suggestionId) || suggestionId <= 0) {
        return ctx.answerCbQuery('رقم اقتراح غير صحيح', { show_alert: false }).catch(() => {});
      }

      const group = await this.ensureGroupRecord(ctx);
      this.normalizeGroupState(group);
      const item = (group.suggestions || []).find((x) => Number(x.suggestionId) === Number(suggestionId));
      if (!item) {
        return ctx.answerCbQuery('الاقتراح غير موجود', { show_alert: false }).catch(() => {});
      }

      if (action === 'close') {
        const isAdmin = await this.isGroupAdmin(ctx);
        if (!isAdmin) {
          return ctx.answerCbQuery('إغلاق الاقتراح للمشرفين فقط', { show_alert: false }).catch(() => {});
        }
        item.status = 'closed';
        item.closedAt = new Date();
        await this.addModerationLog(group, 'suggestion_close', ctx.from.id, null, `suggestion#${suggestionId}`);
        await group.save();
      } else if (action === 'up' || action === 'down') {
        if (item.status !== 'open') {
          return ctx.answerCbQuery('هذا الاقتراح مغلق', { show_alert: false }).catch(() => {});
        }
        const userId = Number(ctx.from?.id || 0);
        item.votesUp = Array.isArray(item.votesUp) ? item.votesUp : [];
        item.votesDown = Array.isArray(item.votesDown) ? item.votesDown : [];
        item.votesUp = item.votesUp.filter((id) => Number(id) !== userId);
        item.votesDown = item.votesDown.filter((id) => Number(id) !== userId);
        if (action === 'up') item.votesUp.push(userId);
        if (action === 'down') item.votesDown.push(userId);
        await group.save();
      } else {
        return ctx.answerCbQuery('إجراء غير معروف', { show_alert: false }).catch(() => {});
      }

      const canClose = await this.isGroupAdmin(ctx);
      const card = this.formatSuggestionCard(item);
      const keyboard = this.suggestionKeyboard(item, canClose);
      try {
        await ctx.editMessageText(card, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup
        });
      } catch (_error) {
        // ignore edit errors
      }
      await ctx.answerCbQuery('✅ تم التحديث', { show_alert: false }).catch(() => {});
      return;
    }

    if (data.startsWith('group:suggestmenu:')) {
      const action = data.split(':')[2];
      await ctx.answerCbQuery('✅', { show_alert: false }).catch(() => {});
      if (action === 'new') {
        return ctx.reply('✍️ أرسل اقتراحك هكذا:\nاقتراح نص الفكرة\nأو:\n/gsuggest نص الفكرة');
      }
      if (action === 'list') {
        return this.handleSuggestionListCommand(ctx);
      }
      if (action === 'stats') {
        return this.handleSuggestionStatsCommand(ctx);
      }
      if (action === 'top') {
        return this.handleSuggestionTopCommand(ctx);
      }
      return;
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

      const group = await Group.findOneAndUpdate(
        { groupId: String(chat.id) },
        {
          $set: {
            groupTitle: chat.title || 'Unknown Group',
            groupType: chat.type || 'group',
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );
      if (!group) return;
      this.normalizeGroupState(group);

      const joinedNow = ['left', 'kicked'].includes(oldStatus) && ['member', 'administrator', 'creator'].includes(newStatus);
      if (joinedNow && user.id !== ctx.botInfo?.id && group.settings?.welcomeEnabled) {
        const welcome = this.renderWelcomeTemplate(group.settings?.welcomeTemplate, user, chat);
        await ctx.telegram.sendMessage(chat.id, welcome).catch(() => null);
      }

      const leftNow = ['left', 'kicked'].includes(newStatus);
      if (!leftNow || user.id === ctx.botInfo?.id) return;

      const wasAdmin = ['administrator', 'creator'].includes(oldStatus);
      const owners = await this.collectOwnerRecipients(ctx, group, chat.id);
      const who = this.mentionUser(user.id, user.first_name || user.username || String(user.id));

      if (wasAdmin && group.settings.notifyAdminLeave) {
        const adminNote =
          '• هنالك مشرف غادر قروبك\n\n' +
          `• اسمه ↤︎ ${who}\n` +
          `• ايديه ↤︎ <code>${user.id}</code>\n` +
          `• بقروبك ↤︎ ${this.escapeHtml(chat.title || 'Unknown')}\n-`;

        await this.addModerationLog(group, 'admin_left_group', user.id, null, `status ${oldStatus} -> ${newStatus}`);
        await group.save();
        await Promise.all([...owners].map((ownerId) => ctx.telegram.sendMessage(ownerId, adminNote, {
          parse_mode: 'HTML'
        }).catch(() => null)));
        return;
      }

      if (!wasAdmin) {
        const memberNote =
          '• هنالك عضو غادر قروبك\n\n' +
          `• اسمه ↤︎ ${who}\n` +
          `• ايديه ↤︎ <code>${user.id}</code>\n` +
          `• بقروبك ↤︎ ${this.escapeHtml(chat.title || 'Unknown')}\n-`;
        await this.addModerationLog(group, 'member_left_group', user.id, null, `status ${oldStatus} -> ${newStatus}`);
        await group.save();
        await Promise.all([...owners].map((ownerId) => ctx.telegram.sendMessage(ownerId, memberNote, {
          parse_mode: 'HTML'
        }).catch(() => null)));
      }
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
    if (/^(رفع اساسي|تنزيل اساسي|الاساسي|الاساسيين|المالكين الاساسيين|\/gbasic\b)/i.test(rawText)) {
      await this.handleBasicOwnerCommand(ctx);
      return true;
    }
    if (/^(رفع مالك|تنزيل مالك|المالكين|\/gowner\b)/i.test(rawText)) {
      await this.handleOwnerRoleCommand(ctx);
      return true;
    }
    if (/^(رفع مدير|تنزيل مدير|المدراء|\/gmanager\b)/i.test(rawText)) {
      await this.handleManagerRoleCommand(ctx);
      return true;
    }
    if (/^(رفع ادمن|تنزيل ادمن|الادمنية|الأدمنية|\/gadmins\b)/i.test(rawText)) {
      await this.handleAdminRoleCommand(ctx);
      return true;
    }
    if (/^(رفع مميز|تنزيل مميز|المميزين|\/gpremium\b)/i.test(rawText)) {
      await this.handlePremiumMemberCommand(ctx);
      return true;
    }
    if (/^(المنشئين|المالكين الاساسيين|المالكين|المدراء|الادمنية|الأدمنية|المميزين)$/i.test(rawText)) {
      await this.handleRankListCommand(ctx);
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
    if (/^(تفعيل الحمايه\s+\d+|تفعيل الحماية\s+\d+|\/gprotectionlevel\b)/i.test(rawText)) {
      await this.handleProtectionPresetCommand(ctx);
      return true;
    }
    if (/^(اعدادات الحمايه|إعدادات الحمايه|اعدادات الحماية|إعدادات الحماية|\/gprotectionsettings\b)/i.test(rawText)) {
      await this.handleProtectionSettingsCommand(ctx);
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
    if (/^(تفعيل الترحيب|تعطيل الترحيب|رسالة الترحيب|عرض الترحيب|معاينة الترحيب|الترحيب|\/gwelcome\b)/i.test(rawText)) {
      await this.handleWelcomeCommand(ctx);
      return true;
    }
    if (/^(اقتراح\s+.+|الاقتراحات|عرض الاقتراحات|اغلاق اقتراح\s+\d+|اقتراحات|احصائيات الاقتراحات|إحصائيات الاقتراحات|احصائيات الاقتراح|إحصائيات الاقتراح|ترتيب الاقتراحات|ترتيب الاقتراحات الشهري|ترتيب الشهر للاقتراحات|قائمة الاقتراحات|لوحة الاقتراحات|مهلة الاقتراح\s+\d+|\/gsuggest\b|\/gsuggeststats\b|\/gsuggesttop\b|\/gsuggestmenu\b)/i.test(rawText)) {
      await this.handleSuggestionCommand(ctx);
      return true;
    }
    if (/^(?:اضف رد|أضف رد|حذف رد|الردود|عرض الردود|مسح الردود|وضع الردود\s+(?:حرفي|مرن)|\/gfaq\b)/i.test(rawText)) {
      await this.handleFaqCommand(ctx);
      return true;
    }
    if (
      /^(قفل الروابط|فتح الروابط|قفل الملصقات|فتح الملصقات|تفعيل الكلمات|تعطيل الكلمات|تفعيل التكرار|تعطيل التكرار|تفعيل منع الاباحية|تعطيل منع الاباحية|تفعيل منع الرسائل الطويلة|تعطيل منع الرسائل الطويلة|استثناء المشرفين من الحماية|الغاء استثناء المشرفين من الحماية|إلغاء استثناء المشرفين من الحماية|الحماية|\/gprotect\b)/i.test(rawText)
    ) {
      if (/^قفل الروابط$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'lockLinks', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم قفل الروابط.');
        return true;
      }
      if (/^فتح الروابط$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'lockLinks', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم فتح الروابط.');
        return true;
      }
      if (/^قفل الملصقات$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'lockStickers', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم قفل الملصقات.');
        return true;
      }
      if (/^فتح الملصقات$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'lockStickers', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم فتح الملصقات.');
        return true;
      }
      if (/^تفعيل الكلمات$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'filterBadWords', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تفعيل فلتر الكلمات.');
        return true;
      }
      if (/^تعطيل الكلمات$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'filterBadWords', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تعطيل فلتر الكلمات.');
        return true;
      }
      if (/^تفعيل التكرار$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'floodProtection', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تفعيل حماية التكرار.');
        return true;
      }
      if (/^تعطيل التكرار$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'floodProtection', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تعطيل حماية التكرار.');
        return true;
      }
      if (/^تفعيل منع الاباحية$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'blockExplicitContent', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تفعيل منع المحتوى الإباحي.');
        return true;
      }
      if (/^تعطيل منع الاباحية$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'blockExplicitContent', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تعطيل منع المحتوى الإباحي.');
        return true;
      }
      if (/^تفعيل منع الرسائل الطويلة$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'blockLongMessages', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply(`✅ تم تفعيل منع الرسائل الطويلة (الحد الحالي: ${group.settings?.maxMessageLength || 700}).`);
        return true;
      }
      if (/^تعطيل منع الرسائل الطويلة$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'blockLongMessages', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تعطيل منع الرسائل الطويلة.');
        return true;
      }
      if (/^استثناء المشرفين من الحماية$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'exemptAdminsFromProtection', true, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم تفعيل استثناء المشرفين من الحماية.');
        return true;
      }
      if (/^(الغاء استثناء المشرفين من الحماية|إلغاء استثناء المشرفين من الحماية)$/i.test(rawText)) {
        const result = await this.setProtectionSetting(ctx, 'exemptAdminsFromProtection', false, 'text');
        if (!result?.ok) return true;
        await ctx.reply('✅ تم إلغاء استثناء المشرفين من الحماية.');
        return true;
      }
      if (/^الحماية$/i.test(rawText)) {
        await ctx.reply(this.getProtectionStatusText(group), { parse_mode: 'HTML' });
        return true;
      }
      if (/^\/gprotect\b/i.test(rawText)) {
        await this.handleProtectCommand(ctx);
        return true;
      }
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
    if (isAdmin && group.settings?.exemptAdminsFromProtection) {
      return false;
    }

    const text = lowered;
    const hasSticker = Boolean(ctx.message?.sticker);

    if (group.settings?.lockStickers && hasSticker) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
        await this.addModerationLog(
          group,
          'delete_sticker_message',
          ctx.botInfo.id,
          ctx.from.id,
          ctx.message?.sticker?.is_video ? 'video sticker blocked' : (ctx.message?.sticker?.premium_animation ? 'premium sticker blocked' : 'sticker blocked')
        );
        await group.save();
      } catch (_error) {
        await ctx.reply('⚠️ تم اكتشاف ملصق لكن لا يمكن حذفه. فعّل صلاحية حذف الرسائل للبوت.');
      }
      return true;
    }

    if (group.settings?.blockLongMessages) {
      const maxLength = Number.isInteger(group.settings?.maxMessageLength) ? group.settings.maxMessageLength : 700;
      if (rawText.length > maxLength) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          await this.addModerationLog(group, 'delete_long_message', ctx.botInfo.id, ctx.from.id, `len=${rawText.length}, max=${maxLength}`);
          await group.save();
          await ctx.reply(`📏 تم حذف رسالة طويلة (الحد المسموح: ${maxLength} حرف).`);
        } catch (_error) {
          await ctx.reply('⚠️ تم اكتشاف رسالة طويلة لكن لا يمكن حذفها. فعّل صلاحية حذف الرسائل للبوت.');
        }
        return true;
      }
    }

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

    if (group.settings?.blockExplicitContent) {
      const explicitPattern = /(?:\b(?:porn|xxx|sex|xvideos|xnxx|redtube|onlyfans|nsfw)\b|اباحي|اباحية|سكس|جنس صريح|نيك)/i;
      if (explicitPattern.test(text)) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          await this.addModerationLog(group, 'delete_explicit_message', ctx.botInfo.id, ctx.from.id, 'explicit content blocked');
          await group.save();
          await ctx.reply('🚫 تم حذف رسالة تحتوي على محتوى إباحي.');
        } catch (_error) {
          await ctx.reply('⚠️ تم اكتشاف محتوى إباحي لكن لا يمكن حذفه. فعّل صلاحية حذف الرسائل للبوت.');
        }
        return true;
      }
    }

    if (group.settings?.filterBadWords) {
      const blockedWords = ['سب', 'شتيمة', 'كلمة_ممنوعة'];
      const found = blockedWords.some((w) => this.hasBoundedPhrase(text, w));
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

    const faqHandled = await this.maybeReplyFaqTrigger(ctx, group, rawText);
    if (faqHandled) return true;

    return false;
  }
}

module.exports = GroupAdminHandler;
