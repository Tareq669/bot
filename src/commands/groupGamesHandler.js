const { Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const QUICK_QUESTIONS = [
  { question: 'ما عاصمة السعودية؟', answers: ['الرياض'], reward: 8 },
  { question: 'كم عدد أيام الأسبوع؟', answers: ['7', 'سبعة'], reward: 7 },
  { question: 'كم ناتج 9 + 6 ؟', answers: ['15', 'خمسة عشر'], reward: 6 },
  { question: 'ما الكوكب المعروف بالكوكب الأحمر؟', answers: ['المريخ'], reward: 8 },
  { question: 'كم دقيقة في الساعة؟', answers: ['60', 'ستون'], reward: 6 },
  { question: 'ما اللغة الرسمية في البرازيل؟', answers: ['البرتغالية', 'برتغالية'], reward: 10 },
  { question: 'ما أكبر محيط في العالم؟', answers: ['المحيط الهادي', 'الهادي'], reward: 10 },
  { question: 'كم عدد القارات؟', answers: ['7', 'سبع', 'سبعة'], reward: 8 },
  { question: 'من مخترع المصباح الكهربائي (المشهور)؟', answers: ['توماس اديسون', 'اديسون'], reward: 9 },
  { question: 'ما ناتج 12 × 3 ؟', answers: ['36', 'ستة وثلاثون'], reward: 7 }
];

const DAILY_CHALLENGES = [
  { question: 'تحدي يومي: ما ناتج 14 × 7 ؟', answers: ['98', 'ثمانية وتسعون'], reward: 25 },
  { question: 'تحدي يومي: اكتب اسم أطول نهر في العالم (الجواب الشائع عربيًا).', answers: ['النيل', 'نهر النيل'], reward: 25 },
  { question: 'تحدي يومي: كم عدد حروف اللغة العربية؟', answers: ['28', 'ثمانية وعشرون'], reward: 25 },
  { question: 'تحدي يومي: ما عاصمة اليابان؟', answers: ['طوكيو'], reward: 25 },
  { question: 'تحدي يومي: ما هو العنصر الكيميائي رمزه O؟', answers: ['الاكسجين', 'الأكسجين', 'اكسجين'], reward: 25 }
];

const WORDS = [
  'مكتبة', 'مدرسة', 'هندسة', 'برمجة', 'رياضيات', 'ذكاء', 'تعاون', 'صداقة',
  'منافسة', 'تحدي', 'إنجاز', 'تطوير', 'حكمة', 'إبداع', 'نجاح'
];

class GroupGamesHandler {
  static bot = null;
  static activeRounds = new Map();
  static roundTimers = new Map();
  static autoLoop = null;

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static getDateKey(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static getWeekKey(date = new Date()) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = Math.floor((date - start) / 86400000);
    const week = Math.ceil((diff + start.getUTCDay() + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  static normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value
      .toLowerCase()
      .trim()
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
  }

  static shuffleWord(word) {
    const chars = Array.from(word);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const shuffled = chars.join('');
    if (shuffled === word && word.length > 1) {
      return word.slice(1) + word[0];
    }
    return shuffled;
  }

  static pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  static async ensureGroupRecord(ctx) {
    const groupId = String(ctx.chat.id);
    const groupTitle = ctx.chat.title || 'Unknown Group';
    const groupType = ctx.chat.type || 'group';
    const group = await Group.findOneAndUpdate(
      { groupId },
      {
        $set: { groupTitle, groupType, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    );
    this.normalizeGroupState(group);
    return group;
  }

  static normalizeGroupState(group) {
    if (!group.gameSystem) group.gameSystem = {};
    if (!group.gameSystem.settings) {
      group.gameSystem.settings = {
        enabled: true,
        autoQuestions: false,
        intervalMinutes: 15,
        questionTimeoutSec: 25
      };
    }
    if (typeof group.gameSystem.settings.enabled !== 'boolean') group.gameSystem.settings.enabled = true;
    if (typeof group.gameSystem.settings.autoQuestions !== 'boolean') group.gameSystem.settings.autoQuestions = false;
    if (!Number.isInteger(group.gameSystem.settings.intervalMinutes)) group.gameSystem.settings.intervalMinutes = 15;
    if (!Number.isInteger(group.gameSystem.settings.questionTimeoutSec)) group.gameSystem.settings.questionTimeoutSec = 25;

    if (!group.gameSystem.state) group.gameSystem.state = {};
    if (!group.gameSystem.state.lastAutoAt) group.gameSystem.state.lastAutoAt = null;
    if (!group.gameSystem.state.lastDailyKey) group.gameSystem.state.lastDailyKey = '';
    if (!group.gameSystem.state.weekKey) group.gameSystem.state.weekKey = this.getWeekKey();

    if (!Array.isArray(group.gameSystem.scores)) group.gameSystem.scores = [];
    if (!Array.isArray(group.gameSystem.teams)) group.gameSystem.teams = [];
    if (!group.gameSystem.tournament) {
      group.gameSystem.tournament = {
        active: false,
        season: 1,
        startedAt: null,
        endedAt: null,
        rewards: { first: 100, second: 60, third: 40 }
      };
    }
    if (typeof group.gameSystem.tournament.active !== 'boolean') group.gameSystem.tournament.active = false;
    if (!Number.isInteger(group.gameSystem.tournament.season)) group.gameSystem.tournament.season = 1;
    if (!group.gameSystem.tournament.rewards) group.gameSystem.tournament.rewards = { first: 100, second: 60, third: 40 };
    if (!Number.isInteger(group.gameSystem.tournament.rewards.first)) group.gameSystem.tournament.rewards.first = 100;
    if (!Number.isInteger(group.gameSystem.tournament.rewards.second)) group.gameSystem.tournament.rewards.second = 60;
    if (!Number.isInteger(group.gameSystem.tournament.rewards.third)) group.gameSystem.tournament.rewards.third = 40;

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

  static setup(bot) {
    this.bot = bot;
    if (this.autoLoop) return;
    this.autoLoop = setInterval(() => {
      this.runAutoQuestionLoop().catch(() => {});
    }, 60 * 1000);
  }

  static clearRound(groupId) {
    const key = String(groupId);
    this.activeRounds.delete(key);
    const timer = this.roundTimers.get(key);
    if (timer) clearTimeout(timer);
    this.roundTimers.delete(key);
  }

  static parseCommandArgs(ctx) {
    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    return parts.slice(1);
  }

  static async runAutoQuestionLoop() {
    const groups = await Group.find({ 'gameSystem.settings.autoQuestions': true });
    for (const group of groups) {
      this.normalizeGroupState(group);
      if (!group.gameSystem.settings.enabled) continue;

      const groupId = String(group.groupId);
      if (this.activeRounds.has(groupId)) continue;

      const intervalMinutes = Math.max(5, group.gameSystem.settings.intervalMinutes || 15);
      const lastAutoAt = group.gameSystem.state.lastAutoAt ? new Date(group.gameSystem.state.lastAutoAt).getTime() : 0;
      if (Date.now() - lastAutoAt < intervalMinutes * 60 * 1000) continue;
      if (!this.bot) continue;

      const base = this.pickRandom(QUICK_QUESTIONS);
      const timeoutSec = Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25);
      await this.startRoundInternal(
        Number(group.groupId),
        {
          type: 'quiz',
          prompt: `⚡ <b>سؤال تلقائي</b>\n\n${base.question}`,
          answers: base.answers,
          reward: base.reward,
          timeoutSec
        },
        true
      );
      group.gameSystem.state.lastAutoAt = new Date();
      await group.save();
    }
  }

  static async startRoundInternal(chatId, roundPayload, isAuto = false) {
    const groupId = String(chatId);
    this.clearRound(groupId);

    const deadline = Date.now() + roundPayload.timeoutSec * 1000;
    this.activeRounds.set(groupId, {
      ...roundPayload,
      answersNorm: roundPayload.answers.map((a) => this.normalizeText(String(a))),
      deadline
    });

    const sent = await this.bot.telegram.sendMessage(
      Number(chatId),
      `${roundPayload.prompt}\n\n⏱️ المدة: ${roundPayload.timeoutSec} ثانية\n💰 الجائزة: ${roundPayload.reward} نقطة`,
      { parse_mode: 'HTML' }
    );

    const timeout = setTimeout(async () => {
      const active = this.activeRounds.get(groupId);
      if (!active) return;
      this.clearRound(groupId);
      await this.bot.telegram.sendMessage(
        Number(chatId),
        `⌛ انتهى الوقت.\n✅ الإجابة الصحيحة: <b>${active.answers[0]}</b>${isAuto ? '\n\nسؤال تلقائي جديد لاحقًا.' : ''}`,
        { parse_mode: 'HTML', reply_to_message_id: sent.message_id }
      ).catch(() => {});
    }, roundPayload.timeoutSec * 1000);

    this.roundTimers.set(groupId, timeout);
  }

  static buildDailyRound() {
    const daily = this.pickRandom(DAILY_CHALLENGES);
    return {
      type: 'daily',
      prompt: `🧠 <b>التحدي اليومي</b>\n\n${daily.question}`,
      answers: daily.answers,
      reward: daily.reward,
      timeoutSec: 120
    };
  }

  static buildQuizRound() {
    const quiz = this.pickRandom(QUICK_QUESTIONS);
    return {
      type: 'quiz',
      prompt: `❓ <b>سؤال سريع</b>\n\n${quiz.question}`,
      answers: quiz.answers,
      reward: quiz.reward,
      timeoutSec: 30
    };
  }

  static buildMathRound() {
    const a = Math.floor(Math.random() * 25) + 5;
    const b = Math.floor(Math.random() * 20) + 2;
    const ops = ['+', '-', '*'];
    const op = this.pickRandom(ops);
    let answer = 0;
    if (op === '+') answer = a + b;
    if (op === '-') answer = a - b;
    if (op === '*') answer = a * b;
    return {
      type: 'math',
      prompt: `➗ <b>تحدي حساب ذهني</b>\n\nما ناتج: <b>${a} ${op} ${b}</b> ؟`,
      answers: [String(answer)],
      reward: 9,
      timeoutSec: 25
    };
  }

  static buildWordRound() {
    const word = this.pickRandom(WORDS);
    const shuffled = this.shuffleWord(word);
    return {
      type: 'word',
      prompt: `🔤 <b>ترتيب كلمة</b>\n\nرتّب هذه الأحرف: <b>${shuffled}</b>`,
      answers: [word],
      reward: 10,
      timeoutSec: 35
    };
  }

  static async updateScore(group, user, reward) {
    this.normalizeGroupState(group);

    const weekKey = this.getWeekKey();
    if (group.gameSystem.state.weekKey !== weekKey) {
      group.gameSystem.state.weekKey = weekKey;
      group.gameSystem.scores.forEach((s) => {
        s.weeklyPoints = 0;
      });
    }

    const userId = Number(user.id);
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === userId);
    if (!row) {
      row = {
        userId,
        username: user.username || user.first_name || String(user.id),
        points: 0,
        weeklyPoints: 0,
        wins: 0,
        streak: 0,
        bestStreak: 0,
        lastWinDate: null,
        updatedAt: new Date()
      };
      group.gameSystem.scores.push(row);
    }

    row.username = user.username || user.first_name || String(user.id);
    row.points = (row.points || 0) + reward;
    row.weeklyPoints = (row.weeklyPoints || 0) + reward;
    row.wins = (row.wins || 0) + 1;
    row.updatedAt = new Date();

    const todayKey = this.getDateKey();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayKey = this.getDateKey(yesterday);
    const lastWinKey = row.lastWinDate ? this.getDateKey(new Date(row.lastWinDate)) : '';

    if (lastWinKey === todayKey) {
      row.streak = Math.max(1, row.streak || 1);
    } else if (lastWinKey === yesterdayKey) {
      row.streak = (row.streak || 0) + 1;
    } else {
      row.streak = 1;
    }
    row.bestStreak = Math.max(row.bestStreak || 0, row.streak || 1);
    row.lastWinDate = new Date();

    if (group.gameSystem.tournament?.active) {
      const team = this.getUserTeam(group, userId);
      if (team) {
        team.points = (team.points || 0) + reward;
        team.updatedAt = new Date();
      }
    }
  }

  static normalizeTeamName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  }

  static getUserTeam(group, userId) {
    return (group.gameSystem.teams || []).find((t) => Array.isArray(t.members) && t.members.includes(Number(userId))) || null;
  }

  static findTeamByName(group, name) {
    const normalized = this.normalizeText(name);
    return (group.gameSystem.teams || []).find((t) => this.normalizeText(t.name || '') === normalized) || null;
  }

  static addRewardPointsToMember(group, userId, amount) {
    if (!amount || amount <= 0) return;
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === Number(userId));
    if (!row) {
      row = {
        userId: Number(userId),
        username: String(userId),
        points: 0,
        weeklyPoints: 0,
        wins: 0,
        streak: 0,
        bestStreak: 0,
        lastWinDate: null,
        updatedAt: new Date()
      };
      group.gameSystem.scores.push(row);
    }
    row.points = (row.points || 0) + amount;
    row.weeklyPoints = (row.weeklyPoints || 0) + amount;
    row.updatedAt = new Date();
  }

  static async handleIncomingGroupText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    if (!text || text.startsWith('/')) return false;

    const groupId = String(ctx.chat.id);
    const round = this.activeRounds.get(groupId);
    if (!round) return false;

    if (Date.now() > round.deadline) {
      this.clearRound(groupId);
      await ctx.reply(`⌛ انتهت الجولة.\n✅ الإجابة الصحيحة: ${round.answers[0]}`);
      return true;
    }

    const input = this.normalizeText(text);
    if (!round.answersNorm.includes(input)) return false;

    this.clearRound(groupId);
    const group = await this.ensureGroupRecord(ctx);
    await this.updateScore(group, ctx.from, round.reward);

    if (round.type === 'daily') {
      group.gameSystem.state.lastDailyKey = this.getDateKey();
    }
    group.updatedAt = new Date();
    await group.save();

    const winner = ctx.from.first_name || ctx.from.username || String(ctx.from.id);
    return ctx.reply(
      `🏆 ${winner} فاز بالجولة!\n✅ الإجابة صحيحة: <b>${round.answers[0]}</b>\n💰 +${round.reward} نقطة`,
      { parse_mode: 'HTML' }
    ).then(() => true);
  }

  static async handleGameToggleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);

    if (args.length === 0) {
      const s = group.gameSystem.settings;
      return ctx.reply(
        '🎮 <b>إعدادات ألعاب الجروب</b>\n\n' +
        `الحالة: ${s.enabled ? '✅ مفعلة' : '❌ معطلة'}\n` +
        `الأسئلة التلقائية: ${s.autoQuestions ? '✅' : '❌'}\n` +
        `كل: ${s.intervalMinutes} دقيقة\n` +
        `مهلة السؤال: ${s.questionTimeoutSec} ثانية\n\n` +
        'الاستخدام:\n' +
        '<code>/ggame on</code>\n' +
        '<code>/ggame off</code>\n' +
        '<code>/ggame auto on 15</code>\n' +
        '<code>/ggame auto off</code>',
        { parse_mode: 'HTML' }
      );
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'on') {
      group.gameSystem.settings.enabled = true;
      await group.save();
      return ctx.reply('✅ تم تفعيل ألعاب الجروب.');
    }
    if (mode === 'off') {
      group.gameSystem.settings.enabled = false;
      this.clearRound(ctx.chat.id);
      await group.save();
      return ctx.reply('✅ تم تعطيل ألعاب الجروب.');
    }
    if (mode === 'auto') {
      const action = String(args[1] || '').toLowerCase();
      if (action === 'on') {
        const mins = Math.max(5, parseInt(args[2] || '15', 10) || 15);
        group.gameSystem.settings.autoQuestions = true;
        group.gameSystem.settings.intervalMinutes = mins;
        await group.save();
        return ctx.reply(`✅ تم تفعيل الأسئلة التلقائية كل ${mins} دقيقة.`);
      }
      if (action === 'off') {
        group.gameSystem.settings.autoQuestions = false;
        await group.save();
        return ctx.reply('✅ تم إيقاف الأسئلة التلقائية.');
      }
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /ggame أو /ggame auto on 15');
  }

  static async canStartRound(ctx) {
    const group = await this.ensureGroupRecord(ctx);
    if (!group.gameSystem.settings.enabled) {
      await ctx.reply('⛔ ألعاب الجروب معطلة. فعّلها عبر /ggame on');
      return { ok: false, group };
    }
    if (this.activeRounds.has(String(ctx.chat.id))) {
      await ctx.reply('⏳ يوجد تحدي نشط الآن. جاوبوا أولاً قبل بدء لعبة جديدة.');
      return { ok: false, group };
    }
    return { ok: true, group };
  }

  static async handleQuizCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const round = this.buildQuizRound();
    round.timeoutSec = Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleMathCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const round = this.buildMathRound();
    round.timeoutSec = Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleWordCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const round = this.buildWordRound();
    round.timeoutSec = Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleDailyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const todayKey = this.getDateKey();
    if (group.gameSystem.state.lastDailyKey === todayKey) {
      return ctx.reply('✅ تم لعب التحدي اليومي اليوم بالفعل. جرّب غدًا.');
    }
    group.gameSystem.state.lastDailyKey = todayKey;
    await group.save();
    await this.startRoundInternal(ctx.chat.id, this.buildDailyRound(), false);
  }

  static async handleLeaderCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10);

    if (rows.length === 0) return ctx.reply('📊 لا يوجد نقاط بعد. ابدأوا عبر /gquiz');

    let text = '🏁 <b>متصدرين الجروب (إجمالي)</b>\n\n';
    rows.forEach((r, i) => {
      const name = r.username || r.userId;
      text += `${i + 1}. ${name} — ${r.points || 0} نقطة | 🔥 ستريك ${r.streak || 0}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleWeeklyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores]
      .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0))
      .slice(0, 10);

    if (rows.length === 0) return ctx.reply('📊 لا يوجد نقاط أسبوعية بعد.');

    let text = '📅 <b>سباق الأسبوع</b>\n\n';
    rows.forEach((r, i) => {
      const name = r.username || r.userId;
      text += `${i + 1}. ${name} — ${r.weeklyPoints || 0} نقطة\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleTeamCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);
    const userId = Number(ctx.from.id);

    if (args.length === 0) {
      return ctx.reply(
        '👥 أوامر الفرق:\n' +
          '/gteam create اسم_الفريق\n' +
          '/gteam join اسم_الفريق\n' +
          '/gteam leave\n' +
          '/gteam info'
      );
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'create') {
      const name = this.normalizeTeamName(args.slice(1).join(' '));
      if (!name) return ctx.reply('❌ اكتب اسم فريق. مثال: /gteam create الصقور');
      if (this.getUserTeam(group, userId)) return ctx.reply('❌ أنت ضمن فريق بالفعل. استخدم /gteam leave أولاً.');
      if (this.findTeamByName(group, name)) return ctx.reply('❌ هذا الاسم مستخدم بالفعل.');

      group.gameSystem.teams.push({
        name,
        captainId: userId,
        members: [userId],
        points: 0,
        wins: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await group.save();
      return ctx.reply(`✅ تم إنشاء فريق: ${name}`);
    }

    if (mode === 'join') {
      const name = this.normalizeTeamName(args.slice(1).join(' '));
      if (!name) return ctx.reply('❌ اكتب اسم الفريق. مثال: /gteam join الصقور');
      if (this.getUserTeam(group, userId)) return ctx.reply('❌ أنت ضمن فريق بالفعل. استخدم /gteam leave أولاً.');

      const team = this.findTeamByName(group, name);
      if (!team) return ctx.reply('❌ الفريق غير موجود.');
      team.members = Array.isArray(team.members) ? team.members : [];
      if (!team.members.includes(userId)) team.members.push(userId);
      team.updatedAt = new Date();
      await group.save();
      return ctx.reply(`✅ انضممت إلى فريق ${team.name}`);
    }

    if (mode === 'leave') {
      const team = this.getUserTeam(group, userId);
      if (!team) return ctx.reply('ℹ️ أنت لست ضمن أي فريق.');

      team.members = (team.members || []).filter((id) => Number(id) !== userId);
      if (Number(team.captainId) === userId && team.members.length > 0) {
        team.captainId = Number(team.members[0]);
      }
      if (team.members.length === 0) {
        group.gameSystem.teams = group.gameSystem.teams.filter((t) => this.normalizeText(t.name) !== this.normalizeText(team.name));
      }
      await group.save();
      return ctx.reply('✅ تم خروجك من الفريق.');
    }

    if (mode === 'info') {
      const team = this.getUserTeam(group, userId);
      if (!team) return ctx.reply('ℹ️ أنت لست ضمن أي فريق.');
      return ctx.reply(
        `👥 <b>${team.name}</b>\n` +
          `🧑‍✈️ القائد: <code>${team.captainId}</code>\n` +
          `👤 الأعضاء: ${team.members.length}\n` +
          `🏅 نقاط الفريق: ${team.points || 0}\n` +
          `🏆 مرات الفوز: ${team.wins || 0}`,
        { parse_mode: 'HTML' }
      );
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gteam');
  }

  static async handleTeamsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const teams = [...(group.gameSystem.teams || [])]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10);

    if (teams.length === 0) return ctx.reply('📊 لا توجد فرق بعد. ابدأ عبر /gteam create');

    let text = '🏟️ <b>ترتيب الفرق</b>\n\n';
    teams.forEach((t, i) => {
      text += `${i + 1}. ${t.name} — ${t.points || 0} نقطة | أعضاء: ${(t.members || []).length}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleTournamentCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);
    const t = group.gameSystem.tournament;

    if (args.length === 0 || String(args[0]).toLowerCase() === 'status') {
      const top = [...(group.gameSystem.teams || [])]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 3);
      let text =
        '🏆 <b>حالة البطولة الأسبوعية</b>\n\n' +
        `الحالة: ${t.active ? '✅ نشطة' : '❌ متوقفة'}\n` +
        `الموسم: ${t.season}\n` +
        `الجوائز: ${t.rewards.first}/${t.rewards.second}/${t.rewards.third}\n\n` +
        '<b>المراكز الحالية:</b>\n';
      if (top.length === 0) {
        text += 'لا توجد فرق بعد.';
      } else {
        top.forEach((team, i) => {
          text += `${i + 1}. ${team.name} — ${team.points || 0}\n`;
        });
      }
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'start') {
      group.gameSystem.teams.forEach((team) => {
        team.points = 0;
        team.updatedAt = new Date();
      });
      t.active = true;
      t.startedAt = new Date();
      t.endedAt = null;
      await group.save();
      return ctx.reply(`✅ تم بدء البطولة (الموسم ${t.season}). تم تصفير نقاط الفرق.`);
    }

    if (mode === 'rewards') {
      const first = parseInt(args[1] || '', 10);
      const second = parseInt(args[2] || '', 10);
      const third = parseInt(args[3] || '', 10);
      if (!Number.isInteger(first) || !Number.isInteger(second) || !Number.isInteger(third)) {
        return ctx.reply('❌ استخدم: /gtour rewards 100 60 40');
      }
      if (first <= 0 || second <= 0 || third <= 0 || !(first >= second && second >= third)) {
        return ctx.reply('❌ القيم غير منطقية. يجب أن تكون first >= second >= third');
      }
      t.rewards = { first, second, third };
      await group.save();
      return ctx.reply(`✅ تم تحديث الجوائز إلى: ${first}/${second}/${third}`);
    }

    if (mode === 'end' || mode === 'stop') {
      if (!t.active) return ctx.reply('ℹ️ لا توجد بطولة نشطة حالياً.');

      const top = [...(group.gameSystem.teams || [])]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 3);

      const rewards = [t.rewards.first, t.rewards.second, t.rewards.third];
      top.forEach((team, idx) => {
        const bonus = rewards[idx] || 0;
        team.wins = (team.wins || 0) + 1;
        (team.members || []).forEach((memberId) => this.addRewardPointsToMember(group, memberId, bonus));
      });

      t.active = false;
      t.endedAt = new Date();
      t.season = (t.season || 1) + 1;
      await group.save();

      let text = '🏁 <b>انتهت البطولة</b>\n\n';
      if (top.length === 0) {
        text += 'لا توجد فرق مشاركة.';
      } else {
        top.forEach((team, idx) => {
          text += `${idx + 1}. ${team.name} — ${team.points || 0} نقطة | جائزة لكل عضو: ${rewards[idx] || 0}\n`;
        });
      }
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gtour status|start|end|rewards');
  }

  static async handleGamesHelp(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return ctx.reply(
      '🎮 <b>ألعاب الجروب التفاعلية</b>\n\n' +
      '• /gquiz سؤال سريع\n' +
      '• /gmath تحدي حساب ذهني\n' +
      '• /gword ترتيب كلمة\n' +
      '• /gdaily تحدي يومي\n' +
      '• /gleader لوحة المتصدرين\n' +
      '• /gweekly سباق الأسبوع\n' +
      '• /ggame إعدادات نظام الألعاب (للمشرفين)\n' +
      '• /gteam إدارة فريقك\n' +
      '• /gteams ترتيب الفرق\n' +
      '• /gtour إدارة البطولة الأسبوعية (للمشرفين)\n\n' +
      'نظام الستريك: كل فوز يومي متتالي يزيد الستريك 🔥',
      { parse_mode: 'HTML' }
    );
  }
}

module.exports = GroupGamesHandler;
