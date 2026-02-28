const { Tournament, Group } = require('../database/models');
const GroupAdminHandler = require('./groupAdminHandler');

class TournamentChallengeHandler {
  static bot = null;

  static loop = null;

  static QUESTION_DURATION_MS = 25000;

  static ALERT_FIVE_MS = 5 * 60 * 1000;

  static ALERT_THREE_MS = 3 * 60 * 1000;

  static MAX_QUESTIONS = 20;

  static parseOwnerIds() {
    return String(process.env.BOT_OWNERS || '')
      .split(',')
      .map((id) => String(id).trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id));
  }

  static isOwner(userId) {
    return this.parseOwnerIds().includes(Number(userId || 0));
  }

  static normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
  }

  static isGroupChat(ctx) {
    return ['group', 'supergroup'].includes(ctx?.chat?.type);
  }

  static setup(bot) {
    this.bot = bot;
    if (this.loop) return;
    this.loop = setInterval(() => {
      this.processTick().catch(() => {});
    }, 15000);
  }

  static ensureGroupTournamentSettings(group) {
    if (!group.settings) group.settings = {};
    if (typeof group.settings.tournamentEnabled !== 'boolean') group.settings.tournamentEnabled = true;
    if (!Array.isArray(group.settings.blockedTournamentIds)) group.settings.blockedTournamentIds = [];
    group.settings.blockedTournamentIds = group.settings.blockedTournamentIds.map((id) => String(id)).filter(Boolean);
  }

  static parseArabicTime(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const normalized = raw
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[إأآ]/g, 'ا')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .toLowerCase();
    const match = /(\d{1,2})(?::(\d{1,2}))?\s*(الصباح|صباح|الفجر|الظهر|العصر|المساء|مساء|الليل|ليل|pm|am)?/.exec(normalized);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = Math.max(0, Math.min(59, parseInt(match[2] || '0', 10)));
    const period = String(match[3] || '').trim();
    if (hour > 23) return null;
    if (period && ['المساء', 'مساء', 'الليل', 'ليل', 'العصر', 'pm'].includes(period) && hour < 12) hour += 12;
    if (period && ['الصباح', 'صباح', 'الفجر', 'am'].includes(period) && hour === 12) hour = 0;
    if (!period && hour >= 24) return null;
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setSeconds(0, 0);
    scheduled.setHours(hour, minute, 0, 0);
    if (scheduled.getTime() <= now.getTime()) scheduled.setDate(scheduled.getDate() + 1);
    return scheduled;
  }

  static getTimeLabel(date) {
    return new Date(date).toLocaleString('ar', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }

  static async getLatestOwnerTournament(ownerId) {
    return Tournament.findOne({
      ownerId: Number(ownerId),
      status: { $in: ['scheduled', 'active'] }
    }).sort({ createdAt: -1 });
  }

  static async getAvailableTournament() {
    return Tournament.findOne({
      status: { $in: ['scheduled', 'active'] }
    }).sort({ scheduledAt: 1, createdAt: 1 });
  }

  static buildQuestionRows(text) {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split('|').map((x) => x.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const prompt = parts[0];
      const answers = parts[1]
        .split(/[،,]/)
        .map((x) => this.normalizeText(x))
        .filter(Boolean);
      if (!prompt || !answers.length) continue;
      rows.push({ prompt, answers: [...new Set(answers)] });
    }
    return rows;
  }

  static async handleCreateTournamentCommand(ctx) {
    if (this.isGroupChat(ctx)) return ctx.reply('❌ استخدم هذا الأمر في الخاص.');
    if (!this.isOwner(ctx.from?.id)) return ctx.reply('❌ هذا الأمر للمطور فقط.');
    ctx.session = ctx.session || {};
    ctx.session.tournamentCreate = { step: 'name' };
    return ctx.reply('🏆 ارسل الآن اسم البطوله.');
  }

  static async handleAddQuestionsCommand(ctx) {
    if (this.isGroupChat(ctx)) return ctx.reply('❌ استخدم هذا الأمر في الخاص.');
    if (!this.isOwner(ctx.from?.id)) return ctx.reply('❌ هذا الأمر للمطور فقط.');
    const tournament = await this.getLatestOwnerTournament(ctx.from.id);
    if (!tournament) return ctx.reply('❌ ما عندك بطوله مجدولة حاليًا. اكتب: انشاء بطوله');
    ctx.session = ctx.session || {};
    ctx.session.tournamentQuestions = { tournamentId: String(tournament._id) };
    return ctx.reply(
      '📝 ارسل اسئله البطوله الآن.\n' +
      'كل سطر بهذا الشكل:\n' +
      'السؤال | الجواب\n' +
      'أو: السؤال | جواب1, جواب2\n\n' +
      `الحد الأقصى ${this.MAX_QUESTIONS} سؤال.`
    );
  }

  static async handleDeleteQuestionsCommand(ctx) {
    if (this.isGroupChat(ctx)) return ctx.reply('❌ استخدم هذا الأمر في الخاص.');
    if (!this.isOwner(ctx.from?.id)) return ctx.reply('❌ هذا الأمر للمطور فقط.');
    const tournament = await this.getLatestOwnerTournament(ctx.from.id);
    if (!tournament) return ctx.reply('❌ ما عندك بطوله مجدولة حاليًا.');
    tournament.questions = [];
    await tournament.save();
    return ctx.reply('🗑️ تم حذف اسئله البطوله.');
  }

  static formatTournamentLine(tournament, index) {
    const groupsCount = Array.isArray(tournament.groups) ? tournament.groups.filter((g) => g.enabled && !g.blocked).length : 0;
    return `${index + 1}. ${tournament.name}\n• الحالة ↤︎ ${tournament.status}\n• الموعد ↤︎ ${this.getTimeLabel(tournament.scheduledAt)}\n• الاسئله ↤︎ ${tournament.questions.length}/${this.MAX_QUESTIONS}\n• القروبات ↤︎ ${groupsCount}`;
  }

  static async handleListTournaments(ctx) {
    const query = this.isOwner(ctx.from?.id)
      ? { ownerId: Number(ctx.from.id), status: { $in: ['scheduled', 'active', 'completed'] } }
      : { status: { $in: ['scheduled', 'active'] } };
    const tournaments = await Tournament.find(query).sort({ scheduledAt: 1 }).limit(10);
    if (!tournaments.length) return ctx.reply('ℹ️ لا توجد بطولات متاحة حاليًا.');
    const text = tournaments.map((tournament, index) => this.formatTournamentLine(tournament, index)).join('\n\n');
    return ctx.reply(`🏆 البطولات\n\n${text}`);
  }

  static async handleTournamentJoinedGroups(ctx) {
    if (this.isGroupChat(ctx)) return ctx.reply('❌ استخدم هذا الأمر في الخاص.');
    if (!this.isOwner(ctx.from?.id)) return ctx.reply('❌ هذا الأمر للمطور فقط.');
    const tournament = await this.getLatestOwnerTournament(ctx.from.id);
    if (!tournament) return ctx.reply('❌ ما عندك بطوله مجدولة حاليًا.');
    const groups = (tournament.groups || []).filter((g) => g.enabled && !g.blocked);
    if (!groups.length) return ctx.reply('ℹ️ لا يوجد قروبات منضمة بعد.');
    const text = groups.map((group, index) => `${index + 1}. ${group.groupTitle || group.groupId}\n• المشاركين ↤︎ ${(group.participants || []).length}\n• نقاط القروب ↤︎ ${group.score || 0}`).join('\n\n');
    return ctx.reply(`👥 منضمين البطوله\n\n${text}`);
  }

  static async handleGroupJoinTournament(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAllowed = await GroupAdminHandler.isManagerOrHigher(ctx);
    if (!isAllowed) return ctx.reply('❌ هذا الأمر للمدير وأعلى فقط.');
    const tournament = await Tournament.findOne({ status: 'scheduled' }).sort({ scheduledAt: 1, createdAt: 1 });
    if (!tournament) return ctx.reply('ℹ️ لا توجد بطوله متاحة حاليًا.');
    const group = await Group.findOne({ groupId: String(ctx.chat.id) });
    if (!group) return ctx.reply('❌ بيانات الجروب غير موجودة.');
    this.ensureGroupTournamentSettings(group);
    if (!group.settings.tournamentEnabled) return ctx.reply('❌ البطولة معطلة في هذا الجروب.');
    if (group.settings.blockedTournamentIds.includes(String(tournament._id))) {
      return ctx.reply('❌ هذا الجروب محجوب من البطولة الحالية بعد التعطيل/التفعيل.');
    }
    let row = (tournament.groups || []).find((item) => String(item.groupId) === String(ctx.chat.id));
    if (!row) {
      tournament.groups.push({
        groupId: String(ctx.chat.id),
        groupTitle: ctx.chat.title || String(ctx.chat.id),
        enabled: true,
        blocked: false,
        joinedAt: new Date(),
        participants: [],
        score: 0,
        currentAttemptUserIds: [],
        currentAnsweredUserIds: []
      });
    } else {
      row.enabled = true;
      row.blocked = false;
      row.groupTitle = ctx.chat.title || row.groupTitle;
    }
    await tournament.save();
    return ctx.reply(`✅ تم تسجيل القروب في البطوله: ${tournament.name}\n• الآن الأعضاء ينضمون بكتابة: انا`);
  }

  static async handleParticipantJoin(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const tournament = await this.getAvailableTournament();
    if (!tournament || tournament.status !== 'scheduled') return false;
    const groupRow = (tournament.groups || []).find((item) => String(item.groupId) === String(ctx.chat.id) && item.enabled && !item.blocked);
    if (!groupRow) return ctx.reply('❌ هذا الجروب غير منضم للبطولة الحالية.');
    const exists = (groupRow.participants || []).some((item) => Number(item.userId) === Number(ctx.from.id));
    if (exists) return ctx.reply('✅ أنت منضم مسبقًا.');
    groupRow.participants.push({
      userId: Number(ctx.from.id),
      name: ctx.from.first_name || ctx.from.username || String(ctx.from.id),
      score: 0,
      joinedAt: new Date()
    });
    await tournament.save();
    return ctx.reply(`✅ تم انضمامك إلى بطولة ${tournament.name}`);
  }

  static async handleGroupTournamentToggle(ctx, enabled) {
    if (!this.isGroupChat(ctx)) return;
    const canUse = await GroupAdminHandler.isOwnerOrBasic(ctx);
    if (!canUse) return ctx.reply('❌ هذا الأمر للمالك الأساسي أو الأساسي فقط.');
    const group = await Group.findOne({ groupId: String(ctx.chat.id) });
    if (!group) return ctx.reply('❌ لم يتم العثور على الجروب.');
    this.ensureGroupTournamentSettings(group);
    group.settings.tournamentEnabled = Boolean(enabled);
    const currentTournament = await this.getAvailableTournament();
    if (!enabled && currentTournament) {
      const id = String(currentTournament._id);
      if (!group.settings.blockedTournamentIds.includes(id)) group.settings.blockedTournamentIds.push(id);
      const row = (currentTournament.groups || []).find((item) => String(item.groupId) === String(ctx.chat.id));
      if (row) {
        row.enabled = false;
        row.blocked = true;
        await currentTournament.save();
      }
    }
    await group.save();
    return ctx.reply(enabled ? '✅ تم تفعيل البطولة في هذا الجروب.' : '✅ تم تعطيل البطولة في هذا الجروب.');
  }

  static answerMatches(question, text) {
    const normalized = this.normalizeText(text);
    return (question.answers || []).includes(normalized);
  }

  static async handleGroupText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    const raw = String(text || '').trim();
    if (!raw || raw.startsWith('/')) return false;
    if (/^(انا|الانضمام للبطوله|البطولات|تفعيل البطوله|تعطيل البطوله)$/i.test(raw)) return false;
    const tournament = await Tournament.findOne({
      status: 'active',
      'groups.groupId': String(ctx.chat.id)
    }).sort({ scheduledAt: 1 });
    if (!tournament) return false;
    const groupRow = (tournament.groups || []).find((item) => String(item.groupId) === String(ctx.chat.id) && item.enabled && !item.blocked);
    if (!groupRow) return false;
    const question = tournament.questions?.[Number(tournament.currentQuestionIndex || 0)];
    if (!question) return false;
    const participant = (groupRow.participants || []).find((item) => Number(item.userId) === Number(ctx.from.id));
    if (!participant) return false;
    if ((groupRow.currentAttemptUserIds || []).includes(Number(ctx.from.id))) return false;

    groupRow.currentAttemptUserIds = [...new Set([...(groupRow.currentAttemptUserIds || []), Number(ctx.from.id)])];
    if (this.answerMatches(question, raw)) {
      groupRow.currentAnsweredUserIds = [...new Set([...(groupRow.currentAnsweredUserIds || []), Number(ctx.from.id)])];
      groupRow.score = Number(groupRow.score || 0) + 1;
      participant.score = Number(participant.score || 0) + 1;
      await tournament.save();
      await ctx.reply(`✅ إجابة صحيحة\n• +1 نقطة للقروب\n• نقاطك في البطولة ↤︎ ${participant.score}`);
      return true;
    }
    await tournament.save();
    await ctx.reply('❌ إجابة غلط، استنى السؤال اللي بعده.');
    return true;
  }

  static async handlePrivateText(ctx, text) {
    if (this.isGroupChat(ctx)) return false;
    if (!this.isOwner(ctx.from?.id)) return false;
    ctx.session = ctx.session || {};

    if (ctx.session.tournamentCreate?.step === 'name') {
      const name = String(text || '').trim();
      if (!name) {
        await ctx.reply('❌ ارسل اسم صالح للبطوله.');
        return true;
      }
      ctx.session.tournamentCreate = { step: 'time', name };
      await ctx.reply('⏰ ارسل وقت البطوله.\nمثال: 3 الصباح');
      return true;
    }

    if (ctx.session.tournamentCreate?.step === 'time') {
      const scheduledAt = this.parseArabicTime(text);
      if (!scheduledAt) {
        await ctx.reply('❌ ما فهمت الوقت.\nمثال صحيح: 3 الصباح أو 9 مساء');
        return true;
      }
      const name = ctx.session.tournamentCreate.name;
      ctx.session.tournamentCreate = null;
      const tournament = await Tournament.create({
        ownerId: Number(ctx.from.id),
        ownerName: ctx.from.first_name || ctx.from.username || String(ctx.from.id),
        name,
        timeText: String(text || '').trim(),
        scheduledAt,
        status: 'scheduled',
        questions: [],
        groups: [],
        currentQuestionIndex: -1
      });
      await ctx.reply(
        `✅ تم إنشاء البطولة\n` +
        `• الاسم ↤︎ ${tournament.name}\n` +
        `• الموعد ↤︎ ${this.getTimeLabel(tournament.scheduledAt)}\n` +
        '• الآن اكتب: اضف اسئله البطوله'
      );
      return true;
    }

    if (ctx.session.tournamentQuestions?.tournamentId) {
      const tournament = await Tournament.findById(ctx.session.tournamentQuestions.tournamentId);
      if (!tournament) {
        ctx.session.tournamentQuestions = null;
        await ctx.reply('❌ لم يتم العثور على البطولة.');
        return true;
      }
      const rows = this.buildQuestionRows(text);
      if (!rows.length) {
        await ctx.reply('❌ ارسل الاسئله بهذا الشكل:\nالسؤال | الجواب\nأو: السؤال | جواب1, جواب2');
        return true;
      }
      const remaining = Math.max(0, this.MAX_QUESTIONS - (tournament.questions || []).length);
      if (remaining <= 0) {
        ctx.session.tournamentQuestions = null;
        await ctx.reply(`❌ وصلت الحد الأقصى ${this.MAX_QUESTIONS} سؤال.`);
        return true;
      }
      tournament.questions.push(...rows.slice(0, remaining));
      ctx.session.tournamentQuestions = null;
      await tournament.save();
      await ctx.reply(`✅ تم إضافة ${Math.min(rows.length, remaining)} سؤال.\n• الإجمالي ↤︎ ${tournament.questions.length}/${this.MAX_QUESTIONS}`);
      return true;
    }

    return false;
  }

  static async sendMessage(chatId, text, options = {}) {
    if (!this.bot) return null;
    try {
      return await this.bot.telegram.sendMessage(chatId, text, options);
    } catch (_error) {
      return null;
    }
  }

  static async pinMessage(chatId, messageId) {
    if (!this.bot || !messageId) return;
    try {
      await this.bot.telegram.pinChatMessage(chatId, messageId, { disable_notification: true });
    } catch (_error) {}
  }

  static buildRankMentions(group) {
    const ids = new Set();
    if (Number.isInteger(group?.settings?.primaryOwnerId)) ids.add(Number(group.settings.primaryOwnerId));
    ['basicOwnerIds', 'ownerIds', 'managerIds', 'adminIds'].forEach((key) => {
      (Array.isArray(group?.settings?.[key]) ? group.settings[key] : []).forEach((id) => ids.add(Number(id)));
    });
    return [...ids]
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 15)
      .map((id) => `<a href="tg://user?id=${id}">‏</a>`)
      .join('');
  }

  static async sendFiveMinuteAlerts(tournament) {
    for (const groupRow of tournament.groups || []) {
      if (!groupRow.enabled || groupRow.blocked || groupRow.alertFiveSent) continue;
      const group = await Group.findOne({ groupId: String(groupRow.groupId) });
      if (!group) continue;
      this.ensureGroupTournamentSettings(group);
      const mentions = this.buildRankMentions(group);
      await this.sendMessage(
        Number(groupRow.groupId),
        `${mentions}🏆 تنبيه بطولة\n\n` +
        `• البطولة ↤︎ ${tournament.name}\n` +
        '• باقي 5 دقائق على البداية\n' +
        '• المدير وأعلى يكتبون: الانضمام للبطوله\n' +
        '• الأعضاء يكتبون: انا',
        { parse_mode: 'HTML' }
      );
      groupRow.alertFiveSent = true;
    }
    await tournament.save();
  }

  static async sendThreeMinuteCountdown(tournament) {
    for (const groupRow of tournament.groups || []) {
      if (!groupRow.enabled || groupRow.blocked || groupRow.countdownSent) continue;
      const participantsCount = Array.isArray(groupRow.participants) ? groupRow.participants.length : 0;
      const sent = await this.sendMessage(
        Number(groupRow.groupId),
        `⏳ العد التنازلي للبطولة\n\n` +
        `• البطولة ↤︎ ${tournament.name}\n` +
        '• باقي 3 دقائق على الانطلاق\n' +
        `• المشاركين من هذا الجروب ↤︎ ${participantsCount}`,
        { parse_mode: 'HTML' }
      );
      groupRow.countdownSent = true;
      groupRow.pinnedMessageId = Number(sent?.message_id || 0) || null;
      if (groupRow.pinnedMessageId) await this.pinMessage(Number(groupRow.groupId), groupRow.pinnedMessageId);
    }
    await tournament.save();
  }

  static resetQuestionAttempts(tournament) {
    (tournament.groups || []).forEach((groupRow) => {
      groupRow.currentAttemptUserIds = [];
      groupRow.currentAnsweredUserIds = [];
    });
  }

  static async broadcastCurrentQuestion(tournament) {
    const question = tournament.questions?.[Number(tournament.currentQuestionIndex || 0)];
    if (!question) return;
    for (const groupRow of tournament.groups || []) {
      if (!groupRow.enabled || groupRow.blocked) continue;
      await this.sendMessage(
        Number(groupRow.groupId),
        `🏁 <b>البطوله: ${tournament.name}</b>\n\n` +
        `• السؤال ${Number(tournament.currentQuestionIndex || 0) + 1}/${tournament.questions.length}\n` +
        `• ${question.prompt}\n\n` +
        `⏱️ مدة السؤال: ${Math.floor(this.QUESTION_DURATION_MS / 1000)} ثانية`,
        { parse_mode: 'HTML' }
      );
    }
  }

  static async startTournament(tournament) {
    if (!tournament.questions.length) {
      tournament.status = 'cancelled';
      await tournament.save();
      return;
    }
    const enabledGroups = (tournament.groups || []).filter((groupRow) => groupRow.enabled && !groupRow.blocked);
    if (!enabledGroups.length) {
      tournament.status = 'cancelled';
      await tournament.save();
      return;
    }
    tournament.status = 'active';
    tournament.startedAt = new Date();
    tournament.currentQuestionIndex = 0;
    tournament.questionStartedAt = new Date();
    this.resetQuestionAttempts(tournament);
    await tournament.save();
    await this.broadcastCurrentQuestion(tournament);
  }

  static async advanceTournament(tournament) {
    if (Number(tournament.currentQuestionIndex || 0) + 1 >= tournament.questions.length) {
      tournament.status = 'completed';
      tournament.finishedAt = new Date();
      await tournament.save();
      await this.finishTournamentBroadcast(tournament);
      return;
    }
    tournament.currentQuestionIndex = Number(tournament.currentQuestionIndex || 0) + 1;
    tournament.questionStartedAt = new Date();
    this.resetQuestionAttempts(tournament);
    await tournament.save();
    await this.broadcastCurrentQuestion(tournament);
  }

  static async finishTournamentBroadcast(tournament) {
    const topGroups = [...(tournament.groups || [])]
      .filter((groupRow) => groupRow.enabled && !groupRow.blocked)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 10);
    const ranking = topGroups.length
      ? topGroups.map((groupRow, index) => `${index + 1}. ${groupRow.groupTitle || groupRow.groupId} — ${groupRow.score || 0} نقطة`).join('\n')
      : 'لا يوجد نتائج.';
    for (const groupRow of tournament.groups || []) {
      if (!groupRow.enabled || groupRow.blocked) continue;
      const myRank = topGroups.findIndex((item) => String(item.groupId) === String(groupRow.groupId));
      await this.sendMessage(
        Number(groupRow.groupId),
        `🏆 <b>انتهت البطولة</b>\n\n` +
        `• البطولة ↤︎ ${tournament.name}\n` +
        `• نقاط قروبكم ↤︎ ${groupRow.score || 0}\n` +
        `• ترتيبكم ↤︎ ${myRank >= 0 ? myRank + 1 : '-'}\n\n` +
        `<b>توب البطولة:</b>\n${ranking}`,
        { parse_mode: 'HTML' }
      );
    }
  }

  static async processTick() {
    const now = Date.now();
    const tournaments = await Tournament.find({ status: { $in: ['scheduled', 'active'] } }).sort({ scheduledAt: 1 });
    for (const tournament of tournaments) {
      const scheduledAt = new Date(tournament.scheduledAt).getTime();
      if (tournament.status === 'scheduled') {
        if (scheduledAt - now <= this.ALERT_FIVE_MS && scheduledAt - now > this.ALERT_THREE_MS) {
          await this.sendFiveMinuteAlerts(tournament);
        }
        if (scheduledAt - now <= this.ALERT_THREE_MS && scheduledAt - now > 0) {
          await this.sendThreeMinuteCountdown(tournament);
        }
        if (now >= scheduledAt) {
          await this.startTournament(tournament);
        }
        continue;
      }
      if (tournament.status === 'active') {
        const started = new Date(tournament.questionStartedAt || Date.now()).getTime();
        if (now - started >= this.QUESTION_DURATION_MS) {
          await this.advanceTournament(tournament);
        }
      }
    }
  }
}

module.exports = TournamentChallengeHandler;
