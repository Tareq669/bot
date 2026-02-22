const Markup = require('telegraf/markup');
const { Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const QUICK_QUESTIONS = [
  { question: 'ما عاصمة السعودية؟', answers: ['الرياض'], reward: 8 },
  { question: 'ما عاصمة مصر؟', answers: ['القاهرة', 'القاهره'], reward: 8 },
  { question: 'ما عاصمة المغرب؟', answers: ['الرباط'], reward: 8 },
  { question: 'ما عاصمة الإمارات؟', answers: ['أبوظبي', 'ابوظبي'], reward: 8 },
  { question: 'كم يوم في الأسبوع؟', answers: ['7', 'سبعة', 'سبعه'], reward: 7 },
  { question: 'كم دقيقة في الساعة؟', answers: ['60', 'ستون'], reward: 7 },
  { question: 'كم ساعة في اليوم؟', answers: ['24'], reward: 7 },
  { question: 'كم ناتج 9 + 6 ؟', answers: ['15'], reward: 6 },
  { question: 'كم ناتج 12 × 3 ؟', answers: ['36'], reward: 7 },
  { question: 'كم ناتج 100 ÷ 4 ؟', answers: ['25'], reward: 7 },
  { question: 'ما الكوكب الأحمر؟', answers: ['المريخ'], reward: 8 },
  { question: 'ما أكبر محيط في العالم؟', answers: ['المحيط الهادي', 'الهادي'], reward: 10 },
  { question: 'كم عدد القارات؟', answers: ['7'], reward: 8 },
  { question: 'من مخترع المصباح الكهربائي؟', answers: ['توماس اديسون', 'اديسون'], reward: 9 },
  { question: 'ما الغاز الذي نتنفسه؟', answers: ['الأكسجين', 'الاكسجين', 'اكسجين'], reward: 8 },
  { question: 'ما اللغة الرسمية في البرازيل؟', answers: ['البرتغالية', 'برتغالية'], reward: 10 },
  { question: 'ما أكبر قارة؟', answers: ['آسيا', 'اسيا'], reward: 9 },
  { question: 'كم ضلعًا للمثلث؟', answers: ['3'], reward: 6 },
  { question: 'ما أصغر عدد أولي؟', answers: ['2'], reward: 7 },
  { question: 'ما عاصمة اليابان؟', answers: ['طوكيو'], reward: 9 },
  { question: 'ما عاصمة ألمانيا؟', answers: ['برلين'], reward: 9 },
  { question: 'ما عاصمة فرنسا؟', answers: ['باريس'], reward: 9 },
  { question: 'ما عاصمة إيطاليا؟', answers: ['روما'], reward: 9 },
  { question: 'ما عاصمة كندا؟', answers: ['أوتاوا', 'اوتاوا'], reward: 9 },
  { question: 'كم عدد حروف اللغة العربية؟', answers: ['28'], reward: 9 },
  { question: 'ما الفصل الذي يلي الصيف؟', answers: ['الخريف'], reward: 7 },
  { question: 'ما الحيوان الملقب بسفينة الصحراء؟', answers: ['الجمل'], reward: 7 },
  { question: 'ما أكبر كوكب في المجموعة الشمسية؟', answers: ['المشتري'], reward: 9 },
  { question: 'ما أقرب كوكب للشمس؟', answers: ['عطارد'], reward: 9 },
  { question: 'في أي قارة تقع مصر؟', answers: ['أفريقيا', 'افريقيا'], reward: 8 }
];

const MCQ_QUESTIONS = [
  { question: 'ما أكبر كوكب؟', options: ['المريخ', 'المشتري', 'زحل', 'الزهرة'], answerIndex: 1, reward: 10 },
  { question: 'عاصمة اليابان؟', options: ['سيؤول', 'طوكيو', 'بكين', 'بانكوك'], answerIndex: 1, reward: 9 },
  { question: 'ناتج 9 × 7 ؟', options: ['63', '56', '72', '49'], answerIndex: 0, reward: 8 },
  { question: 'العنصر O ؟', options: ['الأكسجين', 'الهيدروجين', 'الحديد', 'الذهب'], answerIndex: 0, reward: 8 },
  { question: 'عدد القارات؟', options: ['5', '6', '7', '8'], answerIndex: 2, reward: 8 },
  { question: 'عاصمة فرنسا؟', options: ['باريس', 'روما', 'برلين', 'مدريد'], answerIndex: 0, reward: 8 },
  { question: 'كم ساعة في اليوم؟', options: ['12', '18', '24', '30'], answerIndex: 2, reward: 7 },
  { question: 'ناتج 100 ÷ 5 ؟', options: ['10', '15', '20', '25'], answerIndex: 2, reward: 7 },
  { question: 'أكبر محيط؟', options: ['الأطلسي', 'الهندي', 'الهادي', 'المتجمد'], answerIndex: 2, reward: 9 },
  { question: 'عاصمة ألمانيا؟', options: ['برلين', 'ميونخ', 'فرانكفورت', 'هامبورغ'], answerIndex: 0, reward: 8 }
];

const CAPITALS_BANK = [
  ['السعودية', 'الرياض'], ['مصر', 'القاهرة'], ['المغرب', 'الرباط'], ['الجزائر', 'الجزائر'],
  ['تونس', 'تونس'], ['الأردن', 'عمان'], ['العراق', 'بغداد'], ['سوريا', 'دمشق'],
  ['لبنان', 'بيروت'], ['الإمارات', 'أبوظبي'], ['الكويت', 'الكويت'], ['قطر', 'الدوحة'],
  ['عُمان', 'مسقط'], ['اليمن', 'صنعاء'], ['تركيا', 'أنقرة'], ['اليابان', 'طوكيو'],
  ['فرنسا', 'باريس'], ['ألمانيا', 'برلين'], ['إيطاليا', 'روما'], ['إسبانيا', 'مدريد'],
  ['كندا', 'أوتاوا'], ['أستراليا', 'كانبيرا'], ['البرازيل', 'برازيليا'], ['الأرجنتين', 'بوينس آيرس'],
  ['المكسيك', 'مكسيكو سيتي'], ['الهند', 'نيودلهي'], ['الصين', 'بكين'], ['روسيا', 'موسكو'],
  ['إندونيسيا', 'جاكرتا'], ['جنوب أفريقيا', 'بريتوريا']
];

const buildGeneratedMathMcq = () => {
  const list = [];
  for (let i = 1; i <= 140; i += 1) {
    const a = (i % 29) + 3;
    const b = (i % 17) + 2;
    const mode = i % 4;
    let question = '';
    let answer = 0;
    if (mode === 0) {
      question = `كم ناتج ${a} + ${b} ؟`;
      answer = a + b;
    } else if (mode === 1) {
      question = `كم ناتج ${a + b} - ${b} ؟`;
      answer = a;
    } else if (mode === 2) {
      question = `كم ناتج ${a} × ${b} ؟`;
      answer = a * b;
    } else {
      question = `كم ناتج ${(a * b)} ÷ ${b} ؟`;
      answer = a;
    }
    const wrong1 = answer + ((i % 5) + 1);
    const wrong2 = Math.max(0, answer - ((i % 4) + 1));
    const wrong3 = answer + ((i % 7) + 2);
    const options = [...new Set([String(answer), String(wrong1), String(wrong2), String(wrong3)])].slice(0, 4);
    while (options.length < 4) {
      options.push(String(Number(options[options.length - 1]) + 3));
    }
    list.push({
      question,
      options,
      answerIndex: options.indexOf(String(answer)),
      reward: answer >= 40 ? 10 : 8
    });
  }
  return list;
};

const buildGeneratedCapitalsMcq = () => {
  const capitals = CAPITALS_BANK.map((x) => x[1]);
  return CAPITALS_BANK.map(([country, capital], idx) => {
    const wrong = capitals.filter((c) => c !== capital).slice(idx % 10, (idx % 10) + 3);
    while (wrong.length < 3) {
      wrong.push(capitals[(idx + wrong.length + 5) % capitals.length]);
    }
    const options = [capital, ...wrong.slice(0, 3)];
    return {
      question: `ما عاصمة ${country}؟`,
      options,
      answerIndex: 0,
      reward: 9
    };
  });
};

const ALL_MCQ_QUESTIONS = [
  ...MCQ_QUESTIONS,
  ...buildGeneratedMathMcq(),
  ...buildGeneratedCapitalsMcq()
];

const DAILY_CHALLENGES = [
  { question: 'تحدي يومي: كم ناتج 14 × 7 ؟', answers: ['98'], reward: 25 },
  { question: 'تحدي يومي: اكتب اسم أطول نهر شائع عربيًا.', answers: ['النيل', 'نهر النيل'], reward: 25 },
  { question: 'تحدي يومي: ما عاصمة اليابان؟', answers: ['طوكيو'], reward: 25 },
  { question: 'تحدي يومي: ما العنصر الكيميائي O ؟', answers: ['الأكسجين', 'الاكسجين'], reward: 25 },
  { question: 'تحدي يومي: ما عاصمة تركيا؟', answers: ['أنقرة', 'انقرة'], reward: 25 },
  { question: 'تحدي يومي: ما أكبر كوكب؟', answers: ['المشتري'], reward: 25 }
];

const WORDS = [
  'مكتبة', 'مدرسة', 'هندسة', 'برمجة', 'رياضيات', 'ذكاء', 'تعاون', 'صداقة',
  'منافسة', 'تحدي', 'إنجاز', 'تطوير', 'حكمة', 'إبداع', 'نجاح', 'مغامرة',
  'تخطيط', 'إدارة', 'قيادة', 'تعلم', 'تركيز', 'حلول', 'فريق', 'سرعة'
];

const DEFAULT_VOTE_TOPICS = [
  { question: 'تصويت: أفضل وقت للعبة اليومية؟', options: ['بعد العصر', 'بعد المغرب', 'بعد العشاء'] },
  { question: 'تصويت: نزيد مستوى الصعوبة؟', options: ['نعم', 'متوسط', 'لا'] },
  { question: 'تصويت: أي لعبة تفضل؟', options: ['سؤال سريع', 'ترتيب كلمات', 'حساب ذهني', 'اختيارات'] }
];

const CELEBRATION_LINES = ['إجابة ممتازة!', 'مستوى قوي!', 'رد سريع جدًا!', 'أداء احترافي!'];

class GroupGamesHandler {
  static bot = null;
  static activeRounds = new Map();
  static roundTimers = new Map();
  static autoLoop = null;
  static activeMcq = new Map();
  static activeQuizPolls = new Map();
  static activeQuizSeries = new Map();
  static activeVotes = new Map();
  static activeVoteByChat = new Map();
  static lastQuestionByGroup = new Map();
  static questionQueues = new Map();

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

  static token(prefix = 'x') {
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
  }

  static normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value.toLowerCase().trim()
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
    if (shuffled === word && word.length > 1) return word.slice(1) + word[0];
    return shuffled;
  }

  static pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  static shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  static pickNonRepeating(items, key) {
    if (!Array.isArray(items) || items.length === 0) return null;
    if (items.length === 1) return items[0];
    const last = this.lastQuestionByGroup.get(key);
    const pool = items.filter((q) => (q.question || q.prompt || JSON.stringify(q)) !== last);
    const picked = this.pickRandom(pool.length > 0 ? pool : items);
    this.lastQuestionByGroup.set(key, picked.question || picked.prompt || JSON.stringify(picked));
    return picked;
  }

  static pickFromQueue(items, key) {
    if (!Array.isArray(items) || items.length === 0) return null;
    let state = this.questionQueues.get(key);
    if (!state || state.sourceSize !== items.length || !Array.isArray(state.queue) || state.queue.length === 0) {
      state = {
        sourceSize: items.length,
        queue: this.shuffleArray([...items])
      };
      this.questionQueues.set(key, state);
    }
    return state.queue.pop();
  }

  static parseCommandArgs(ctx) {
    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    return parts.slice(1);
  }

  static parseDifficulty(arg) {
    const x = String(arg || '').toLowerCase();
    if (['easy', 'سهل'].includes(x)) return 'easy';
    if (['medium', 'متوسط'].includes(x)) return 'medium';
    if (['hard', 'صعب'].includes(x)) return 'hard';
    return null;
  }

  static questionMatchesDifficulty(question, difficulty) {
    if (!difficulty) return true;
    const reward = Number(question?.reward || 0);
    if (difficulty === 'easy') return reward <= 7;
    if (difficulty === 'medium') return reward >= 8 && reward <= 9;
    if (difficulty === 'hard') return reward >= 10;
    return true;
  }

  static async ensureGroupRecord(ctx) {
    const groupId = String(ctx.chat.id);
    const groupTitle = ctx.chat.title || 'Unknown Group';
    const groupType = ctx.chat.type || 'group';
    const group = await Group.findOneAndUpdate(
      { groupId },
      { $set: { groupTitle, groupType, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    this.normalizeGroupState(group);
    return group;
  }

  static async ensureGroupRecordByChatId(chatId, groupTitle = 'Unknown Group', groupType = 'group') {
    const group = await Group.findOneAndUpdate(
      { groupId: String(chatId) },
      { $set: { groupTitle, groupType, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    this.normalizeGroupState(group);
    return group;
  }

  static normalizeGroupState(group) {
    if (!group.gameSystem) group.gameSystem = {};
    if (!group.gameSystem.settings) group.gameSystem.settings = { enabled: true, autoQuestions: false, intervalMinutes: 15, questionTimeoutSec: 25 };
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
    if (!group.gameSystem.tournament) group.gameSystem.tournament = { active: false, season: 1, startedAt: null, endedAt: null, rewards: { first: 100, second: 60, third: 40 } };
    if (!group.gameSystem.tournament.rewards) group.gameSystem.tournament.rewards = { first: 100, second: 60, third: 40 };

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

      const base = this.pickFromQueue(QUICK_QUESTIONS, `auto:${groupId}`);
      await this.startRoundInternal(Number(group.groupId), {
        type: 'quiz',
        prompt: `⚡ <b>سؤال تلقائي</b>\n\n${base.question}`,
        answers: base.answers,
        reward: base.reward,
        timeoutSec: Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25)
      }, true);

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
    return { type: 'daily', prompt: `🧠 <b>التحدي اليومي</b>\n\n${daily.question}`, answers: daily.answers, reward: daily.reward, timeoutSec: 120 };
  }

  static buildQuizRound(difficulty = null, groupId = null) {
    const pool = QUICK_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, difficulty));
    const effectivePool = pool.length > 0 ? pool : QUICK_QUESTIONS;
    const key = `quiz:${String(groupId || 'global')}`;
    const quiz = this.pickFromQueue(effectivePool, key);
    return { type: 'quiz', prompt: `❓ <b>سؤال سريع</b>\n\n${quiz.question}`, answers: quiz.answers, reward: quiz.reward, timeoutSec: 30 };
  }

  static buildMathRound() {
    const a = Math.floor(Math.random() * 25) + 5;
    const b = Math.floor(Math.random() * 20) + 2;
    const ops = ['+', '-', '*'];
    const op = this.pickRandom(ops);
    const answer = op === '+' ? (a + b) : op === '-' ? (a - b) : (a * b);
    return { type: 'math', prompt: `➗ <b>تحدي حساب ذهني</b>\n\nما ناتج: <b>${a} ${op} ${b}</b> ؟`, answers: [String(answer)], reward: 9, timeoutSec: 25 };
  }

  static buildWordRound() {
    const word = this.pickRandom(WORDS);
    const shuffled = this.shuffleWord(word);
    return { type: 'word', prompt: `🔤 <b>ترتيب كلمة</b>\n\nرتّب هذه الأحرف: <b>${shuffled}</b>`, answers: [word], reward: 10, timeoutSec: 35 };
  }

  static async sendQuizPoll(chatId, question, reward, timeoutSec = 25) {
    if (!this.bot) return null;
    const shuffled = this.shuffleArray(question.options.map((opt, idx) => ({ opt, original: idx })));
    const correctOptionId = shuffled.findIndex((x) => x.original === question.answerIndex);
    const options = shuffled.map((x) => x.opt);
    const openPeriod = Math.min(600, Math.max(10, Number(timeoutSec || 25)));

    const sent = await this.bot.telegram.sendPoll(Number(chatId), question.question, options, {
      type: 'quiz',
      is_anonymous: false,
      allows_multiple_answers: false,
      correct_option_id: correctOptionId,
      open_period: openPeriod,
      explanation: 'اختر الإجابة الصحيحة'
    });

    const pollId = sent?.poll?.id;
    if (!pollId) return sent;

    const cleanup = setTimeout(() => {
      this.activeQuizPolls.delete(pollId);
    }, (openPeriod + 5) * 1000);

    this.activeQuizPolls.set(pollId, {
      chatId: String(chatId),
      reward: Number(reward || 8),
      correctOptionId,
      awardedUsers: new Set(),
      cleanup
    });
    return sent;
  }

  static async handlePollAnswer(ctx) {
    const answer = ctx.update?.poll_answer;
    if (!answer) return;

    const state = this.activeQuizPolls.get(answer.poll_id);
    if (!state) return;

    const userId = Number(answer.user?.id);
    if (!userId) return;
    if (state.awardedUsers.has(userId)) return;

    const selected = Array.isArray(answer.option_ids) ? answer.option_ids : [];
    const isCorrect = selected.includes(state.correctOptionId);
    if (!isCorrect) return;

    state.awardedUsers.add(userId);

    const group = await this.ensureGroupRecordByChatId(state.chatId);
    const scoreMeta = await this.updateScore(group, answer.user, state.reward);
    group.updatedAt = new Date();
    await group.save();

    const rank = this.getUserRank(group, userId);
    await this.bot.telegram.sendMessage(
      Number(state.chatId),
      `✅ ${answer.user?.first_name || 'لاعب'} أجاب صحيحًا!\n💰 +${scoreMeta.finalReward} نقطة\n🏅 الترتيب: #${rank || '-'}`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  static getUserRank(group, userId) {
    const list = [...(group.gameSystem.scores || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
    const idx = list.findIndex((x) => Number(x.userId) === Number(userId));
    return idx >= 0 ? idx + 1 : null;
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
      row = { userId: Number(userId), username: String(userId), points: 0, weeklyPoints: 0, wins: 0, streak: 0, bestStreak: 0, lastWinDate: null, updatedAt: new Date() };
      group.gameSystem.scores.push(row);
    }
    row.points = (row.points || 0) + amount;
    row.weeklyPoints = (row.weeklyPoints || 0) + amount;
    row.updatedAt = new Date();
  }

  static async updateScore(group, user, reward) {
    this.normalizeGroupState(group);
    const weekKey = this.getWeekKey();
    if (group.gameSystem.state.weekKey !== weekKey) {
      group.gameSystem.state.weekKey = weekKey;
      group.gameSystem.scores.forEach((s) => { s.weeklyPoints = 0; });
    }

    const userId = Number(user.id);
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === userId);
    if (!row) {
      row = { userId, username: user.username || user.first_name || String(user.id), points: 0, weeklyPoints: 0, wins: 0, streak: 0, bestStreak: 0, lastWinDate: null, updatedAt: new Date() };
      group.gameSystem.scores.push(row);
    }

    row.username = user.username || user.first_name || String(user.id);
    row.points = (row.points || 0) + reward;
    row.weeklyPoints = (row.weeklyPoints || 0) + reward;
    row.wins = (row.wins || 0) + 1;
    row.updatedAt = new Date();

    const todayKey = this.getDateKey();
    const yesterdayKey = this.getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastWinKey = row.lastWinDate ? this.getDateKey(new Date(row.lastWinDate)) : '';
    if (lastWinKey === todayKey) row.streak = Math.max(1, row.streak || 1);
    else if (lastWinKey === yesterdayKey) row.streak = (row.streak || 0) + 1;
    else row.streak = 1;

    row.bestStreak = Math.max(row.bestStreak || 0, row.streak || 1);
    row.lastWinDate = new Date();

    let streakBonus = 0;
    if ((row.streak || 0) > 0 && row.streak % 3 === 0) {
      streakBonus = 3;
      row.points += streakBonus;
      row.weeklyPoints += streakBonus;
    }

    const finalReward = reward + streakBonus;
    if (group.gameSystem.tournament?.active) {
      const team = this.getUserTeam(group, userId);
      if (team) {
        team.points = (team.points || 0) + finalReward;
        team.updatedAt = new Date();
      }
    }

    return { finalReward, streakBonus, streak: row.streak || 0 };
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
    const scoreMeta = await this.updateScore(group, ctx.from, round.reward);
    if (round.type === 'daily') group.gameSystem.state.lastDailyKey = this.getDateKey();
    group.updatedAt = new Date();
    await group.save();

    const winner = ctx.from.first_name || ctx.from.username || String(ctx.from.id);
    const rank = this.getUserRank(group, ctx.from.id);
    const team = this.getUserTeam(group, ctx.from.id);
    const hype = this.pickRandom(CELEBRATION_LINES);
    const bonusLine = scoreMeta.streakBonus > 0 ? `\n🔥 بونص ستريك +${scoreMeta.streakBonus}` : '';
    const teamLine = team ? `\n👥 فريقك: ${team.name} | نقاط الفريق: ${team.points || 0}` : '';
    const rankLine = rank ? `\n🏅 ترتيبك الحالي: #${rank}` : '';

    await ctx.reply(
      `🏆 ${winner} فاز بالجولة!\n✅ الإجابة صحيحة: <b>${round.answers[0]}</b>\n💰 +${scoreMeta.finalReward} نقطة${bonusLine}\n🔥 الستريك: ${scoreMeta.streak}${rankLine}${teamLine}\n✨ ${hype}`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  static async canStartRound(ctx) {
    const group = await this.ensureGroupRecord(ctx);
    if (!group.gameSystem.settings.enabled) {
      await ctx.reply('⛔ ألعاب الجروب معطلة. فعّلها عبر /ggame on');
      return { ok: false, group };
    }
    const chatKey = String(ctx.chat.id);
    const hasActiveQuizPoll = Array.from(this.activeQuizPolls.values()).some((p) => p.chatId === chatKey);
    if (hasActiveQuizPoll) {
      await ctx.reply('⏳ يوجد سؤال Quiz نشط الآن. انتظر حتى ينتهي.');
      return { ok: false, group };
    }
    if (this.activeQuizSeries.has(chatKey)) {
      await ctx.reply('⏳ يوجد سلسلة QuizBot نشطة حاليًا.');
      return { ok: false, group };
    }
    if (this.activeRounds.has(String(ctx.chat.id))) {
      await ctx.reply('⏳ يوجد تحدي نشط الآن. جاوبوا أولاً قبل بدء لعبة جديدة.');
      return { ok: false, group };
    }
    return { ok: true, group };
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
        'الاستخدام:\n<code>/ggame on</code>\n<code>/ggame off</code>\n<code>/ggame auto on 15</code>\n<code>/ggame auto off</code>',
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

  static async handleQuizCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const args = this.parseCommandArgs(ctx);
    const difficulty = this.parseDifficulty(args[0]);
    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, difficulty));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickFromQueue(source, `quizpoll:${String(ctx.chat.id)}:${difficulty || 'all'}`);
    const timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.sendQuizPoll(ctx.chat.id, question, question.reward, timeoutSec);
  }

  static async handleMathCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildMathRound();
    round.timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleWordCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildWordRound();
    round.timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleDailyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const todayKey = this.getDateKey();
    if (group.gameSystem.state.lastDailyKey === todayKey) return ctx.reply('✅ تم لعب التحدي اليومي اليوم بالفعل. جرّب غدًا.');
    group.gameSystem.state.lastDailyKey = todayKey;
    await group.save();
    await this.startRoundInternal(ctx.chat.id, this.buildDailyRound(), false);
  }
  static async handleMcqCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const args = this.parseCommandArgs(ctx);
    const difficulty = this.parseDifficulty(args[0]);
    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, difficulty));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickFromQueue(source, `mcq:${String(ctx.chat.id)}:${difficulty || 'all'}`);
    const timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.sendQuizPoll(ctx.chat.id, question, question.reward, timeoutSec);
  }

  static async dispatchQuizSeries(chatId) {
    const session = this.activeQuizSeries.get(String(chatId));
    if (!session) return;
    if (session.remaining <= 0) {
      this.activeQuizSeries.delete(String(chatId));
      await this.bot.telegram.sendMessage(Number(chatId), '🏁 انتهت سلسلة الكويز. استخدم /gleader لعرض النتائج.').catch(() => {});
      return;
    }

    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, session.difficulty));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickFromQueue(source, `series:${String(chatId)}:${session.difficulty || 'all'}`);
    await this.sendQuizPoll(chatId, question, question.reward, session.timeoutSec);
    session.remaining -= 1;

    if (session.remaining > 0) {
      session.timer = setTimeout(() => {
        this.dispatchQuizSeries(chatId).catch(() => {});
      }, (session.timeoutSec + 3) * 1000);
    } else {
      session.timer = setTimeout(async () => {
        this.activeQuizSeries.delete(String(chatId));
        await this.bot.telegram.sendMessage(Number(chatId), '🏁 انتهت سلسلة الكويز. استخدم /gleader لعرض النتائج.').catch(() => {});
      }, (session.timeoutSec + 3) * 1000);
    }
  }

  static async handleQuizSetCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const args = this.parseCommandArgs(ctx);
    const chatKey = String(ctx.chat.id);

    if (args.length === 0) {
      const active = this.activeQuizSeries.get(chatKey);
      if (!active) {
        return ctx.reply(
          '🧩 <b>نظام QuizBot للجروب</b>\n\n' +
          'لبدء سلسلة: <code>/gquizset 5</code>\n' +
          'مع صعوبة: <code>/gquizset 7 hard</code>\n' +
          'للإيقاف: <code>/gquizset stop</code>',
          { parse_mode: 'HTML' }
        );
      }
      return ctx.reply(`⏳ سلسلة نشطة: متبقي ${active.remaining} سؤال.`);
    }

    const mode = String(args[0]).toLowerCase();
    if (['stop', 'off', 'cancel'].includes(mode)) {
      const current = this.activeQuizSeries.get(chatKey);
      if (current?.timer) clearTimeout(current.timer);
      this.activeQuizSeries.delete(chatKey);
      return ctx.reply('✅ تم إيقاف سلسلة الكويز.');
    }

    if (this.activeQuizSeries.has(chatKey)) {
      return ctx.reply('⏳ يوجد سلسلة كويز نشطة بالفعل. استخدم /gquizset stop لإيقافها أولاً.');
    }

    const count = Math.max(2, Math.min(20, parseInt(args[0] || '5', 10) || 5));
    const difficulty = this.parseDifficulty(args[1]) || null;
    const group = await this.ensureGroupRecord(ctx);
    const timeoutSec = Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25);

    this.activeQuizSeries.set(chatKey, {
      remaining: count,
      difficulty,
      timeoutSec,
      timer: null
    });

    await ctx.reply(`🚀 بدأت سلسلة QuizBot: ${count} أسئلة${difficulty ? ` (${difficulty})` : ''}.`);
    await this.dispatchQuizSeries(ctx.chat.id);
  }

  static async handleMcqCallback(ctx, token, index) {
    if (!this.isGroupChat(ctx)) return;
    const state = this.activeMcq.get(token);
    if (!state) return ctx.answerCbQuery('انتهت هذه الجولة.', { show_alert: false }).catch(() => {});
    if (String(ctx.chat.id) !== String(state.chatId)) return ctx.answerCbQuery('هذه الجولة ليست لهذا الجروب.', { show_alert: false }).catch(() => {});

    const selected = Number(index);
    if (selected !== Number(state.answerIndex)) return ctx.answerCbQuery('إجابة غير صحيحة، جرّب مرة أخرى.', { show_alert: false }).catch(() => {});

    clearTimeout(state.timer);
    this.activeMcq.delete(token);
    await ctx.answerCbQuery('إجابة صحيحة!', { show_alert: false }).catch(() => {});

    const group = await this.ensureGroupRecord(ctx);
    const scoreMeta = await this.updateScore(group, ctx.from, state.reward);
    group.updatedAt = new Date();
    await group.save();

    const rank = this.getUserRank(group, ctx.from.id);
    await ctx.reply(`✅ <b>${ctx.from.first_name || 'عضو'}</b> أجاب صحيحًا!\n💰 +${scoreMeta.finalReward} نقطة\n🏅 ترتيبك: #${rank || '-'}`, { parse_mode: 'HTML' });
  }

  static parseVoteCommand(text) {
    if (!text.includes('|')) return null;
    const parts = text.split('|').map((x) => x.trim()).filter(Boolean);
    if (parts.length < 3) return null;
    const head = parts[0].replace(/^\/gvote\s*/i, '').trim();
    const sec = parseInt(head, 10);
    const hasDuration = Number.isInteger(sec) && sec >= 20 && sec <= 600;
    const durationSec = hasDuration ? sec : 90;
    const question = hasDuration ? parts[1] : head;
    const optionStart = hasDuration ? 2 : 1;
    const options = parts.slice(optionStart, optionStart + 5);
    if (!question || options.length < 2) return null;
    return { question, options, durationSec };
  }

  static buildVoteKeyboard(session) {
    const rows = session.options.map((opt, idx) => [Markup.button.callback(`${opt} (${session.counts[idx] || 0})`, `group:vote:${session.token}:${idx}`)]);
    return Markup.inlineKeyboard(rows);
  }

  static async handleVoteCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const argsRaw = (ctx.message?.text || '').trim();
    let payload = this.parseVoteCommand(argsRaw);
    if (!payload) {
      const base = this.pickRandom(DEFAULT_VOTE_TOPICS);
      payload = { ...base, durationSec: 90 };
    }
    payload.options = this.shuffleArray(payload.options);

    // Prefer native Telegram poll so options always render on all clients.
    try {
      const pollQuestion = String(payload.question || '').trim().slice(0, 300);
      const pollOptions = payload.options
        .map((opt) => String(opt || '').trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 10);

      if (pollQuestion && pollOptions.length >= 2) {
        const openPeriod = Math.min(600, Math.max(20, Number(payload.durationSec || 90)));
        await ctx.telegram.sendPoll(ctx.chat.id, pollQuestion, pollOptions, {
          is_anonymous: false,
          allows_multiple_answers: false,
          open_period: openPeriod,
          reply_to_message_id: ctx.callbackQuery?.message?.message_id || undefined
        });
        return;
      }
    } catch (_pollError) {
      // Fall back to inline vote below.
    }

    const oldToken = this.activeVoteByChat.get(String(ctx.chat.id));
    if (oldToken) {
      const oldSession = this.activeVotes.get(oldToken);
      if (oldSession?.timer) clearTimeout(oldSession.timer);
      this.activeVotes.delete(oldToken);
    }

    const token = this.token('v');
    const session = {
      token,
      chatId: String(ctx.chat.id),
      question: payload.question,
      options: payload.options,
      votes: {},
      counts: Array(payload.options.length).fill(0),
      durationSec: payload.durationSec || 90,
      messageId: null,
      timer: null
    };

    this.activeVotes.set(token, session);
    this.activeVoteByChat.set(String(ctx.chat.id), token);

    const keyboard = this.buildVoteKeyboard(session);
    let sent = null;
    try {
      sent = await ctx.reply(`🗳️ <b>${session.question}</b>\n\n⏱️ مدة التصويت: ${session.durationSec} ثانية\nصيغة مخصصة: /gvote 120 | السؤال | خيار1 | خيار2 | خيار3`, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (_e) {
      // Fallback in case Telegram rejects markup for any reason.
      const choices = session.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      sent = await ctx.reply(`🗳️ ${session.question}\n\n${choices}\n\n⚠️ لم يتم عرض الأزرار، جرّب إصدار Telegram مختلف.`);
    }
    session.messageId = sent.message_id;
    session.timer = setTimeout(async () => {
      await this.finalizeVote(session.token);
    }, session.durationSec * 1000);
  }

  static async finalizeVote(token) {
    const session = this.activeVotes.get(token);
    if (!session) return;
    this.activeVotes.delete(token);
    if (this.activeVoteByChat.get(String(session.chatId)) === token) {
      this.activeVoteByChat.delete(String(session.chatId));
    }
    if (session.timer) clearTimeout(session.timer);

    const result = session.options.map((opt, idx) => ({ opt, count: session.counts[idx] || 0 }))
      .sort((a, b) => b.count - a.count);
    const winner = result[0];
    let message = `🧾 <b>انتهى التصويت</b>\n\nالسؤال: ${session.question}\n`;
    if (!winner || winner.count === 0) {
      message += '\nلا توجد أصوات مسجلة.';
    } else {
      message += `\n🏆 الخيار الفائز: <b>${winner.opt}</b> (${winner.count} صوت)\n\n`;
      result.forEach((r, i) => {
        message += `${i + 1}. ${r.opt} — ${r.count}\n`;
      });
    }

    await this.bot.telegram.sendMessage(Number(session.chatId), message, {
      parse_mode: 'HTML',
      reply_to_message_id: session.messageId || undefined
    }).catch(() => {});
  }

  static async handleVoteCallback(ctx, token, index) {
    if (!this.isGroupChat(ctx)) return;
    const session = this.activeVotes.get(token);
    if (!session) return ctx.answerCbQuery('هذا التصويت انتهى.', { show_alert: false }).catch(() => {});
    if (String(ctx.chat.id) !== String(session.chatId)) return ctx.answerCbQuery('تصويت لجروب آخر.', { show_alert: false }).catch(() => {});

    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= session.options.length) {
      return ctx.answerCbQuery('خيار غير صالح.', { show_alert: false }).catch(() => {});
    }

    const userId = String(ctx.from.id);
    const prev = session.votes[userId];
    if (Number.isInteger(prev)) session.counts[prev] = Math.max(0, (session.counts[prev] || 0) - 1);
    session.votes[userId] = idx;
    session.counts[idx] = (session.counts[idx] || 0) + 1;

    await ctx.answerCbQuery('تم تسجيل صوتك ✅', { show_alert: false }).catch(() => {});
    await ctx.editMessageReplyMarkup(this.buildVoteKeyboard(session).reply_markup).catch(() => {});
  }

  static async handleLeaderCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
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
    const rows = [...group.gameSystem.scores].sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0)).slice(0, 10);
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
      return ctx.reply('👥 أوامر الفرق:\n/gteam create اسم_الفريق\n/gteam join اسم_الفريق\n/gteam leave\n/gteam info');
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'create') {
      const name = args.slice(1).join(' ').trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!name) return ctx.reply('❌ اكتب اسم فريق. مثال: /gteam create الصقور');
      if (this.getUserTeam(group, userId)) return ctx.reply('❌ أنت ضمن فريق بالفعل. استخدم /gteam leave أولاً.');
      if (this.findTeamByName(group, name)) return ctx.reply('❌ هذا الاسم مستخدم بالفعل.');

      group.gameSystem.teams.push({ name, captainId: userId, members: [userId], points: 0, wins: 0, createdAt: new Date(), updatedAt: new Date() });
      await group.save();
      return ctx.reply(`✅ تم إنشاء فريق: ${name}`);
    }

    if (mode === 'join') {
      const name = args.slice(1).join(' ').trim().replace(/\s+/g, ' ');
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
      if (Number(team.captainId) === userId && team.members.length > 0) team.captainId = Number(team.members[0]);
      if (team.members.length === 0) group.gameSystem.teams = group.gameSystem.teams.filter((t) => this.normalizeText(t.name) !== this.normalizeText(team.name));
      await group.save();
      return ctx.reply('✅ تم خروجك من الفريق.');
    }

    if (mode === 'info') {
      const team = this.getUserTeam(group, userId);
      if (!team) return ctx.reply('ℹ️ أنت لست ضمن أي فريق.');
      return ctx.reply(`👥 <b>${team.name}</b>\n🧑‍✈️ القائد: <code>${team.captainId}</code>\n👤 الأعضاء: ${team.members.length}\n🏅 نقاط الفريق: ${team.points || 0}\n🏆 مرات الفوز: ${team.wins || 0}`, { parse_mode: 'HTML' });
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gteam');
  }

  static async handleTeamsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const teams = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
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
      const top = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);
      let text = '🏆 <b>حالة البطولة الأسبوعية</b>\n\n' + `الحالة: ${t.active ? '✅ نشطة' : '❌ متوقفة'}\n` + `الموسم: ${t.season}\n` + `الجوائز: ${t.rewards.first}/${t.rewards.second}/${t.rewards.third}\n\n` + '<b>المراكز الحالية:</b>\n';
      if (top.length === 0) text += 'لا توجد فرق بعد.';
      else top.forEach((team, i) => { text += `${i + 1}. ${team.name} — ${team.points || 0}\n`; });
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'start') {
      group.gameSystem.teams.forEach((team) => { team.points = 0; team.updatedAt = new Date(); });
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
      if (!Number.isInteger(first) || !Number.isInteger(second) || !Number.isInteger(third)) return ctx.reply('❌ استخدم: /gtour rewards 100 60 40');
      if (first <= 0 || second <= 0 || third <= 0 || !(first >= second && second >= third)) return ctx.reply('❌ القيم غير منطقية. يجب أن تكون first >= second >= third');
      t.rewards = { first, second, third };
      await group.save();
      return ctx.reply(`✅ تم تحديث الجوائز إلى: ${first}/${second}/${third}`);
    }

    if (mode === 'end' || mode === 'stop') {
      if (!t.active) return ctx.reply('ℹ️ لا توجد بطولة نشطة حالياً.');

      const top = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);
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
      if (top.length === 0) text += 'لا توجد فرق مشاركة.';
      else top.forEach((team, idx) => { text += `${idx + 1}. ${team.name} — ${team.points || 0} نقطة | جائزة لكل عضو: ${rewards[idx] || 0}\n`; });
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gtour status|start|end|rewards');
  }

  static async handleGamesMenuAction(ctx, action) {
    if (!this.isGroupChat(ctx)) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    if (action === 'gquiz') return this.handleQuizCommand(ctx);
    if (action === 'gmath') return this.handleMathCommand(ctx);
    if (action === 'gword') return this.handleWordCommand(ctx);
    if (action === 'gdaily') return this.handleDailyCommand(ctx);
    if (action === 'gmcq') return this.handleMcqCommand(ctx);
    if (action === 'gvote') return this.handleVoteCommand(ctx);
    if (action === 'gleader') return this.handleLeaderCommand(ctx);
    if (action === 'gweekly') return this.handleWeeklyCommand(ctx);
    return null;
  }

  static async handleGamesHelp(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❓ سؤال سريع', 'group:games:gquiz'), Markup.button.callback('🗳️ اختيارات', 'group:games:gmcq')],
      [Markup.button.callback('➗ حساب ذهني', 'group:games:gmath'), Markup.button.callback('🔤 ترتيب كلمة', 'group:games:gword')],
      [Markup.button.callback('🧠 تحدي يومي', 'group:games:gdaily'), Markup.button.callback('📊 تصويت', 'group:games:gvote')],
      [Markup.button.callback('🏁 المتصدرين', 'group:games:gleader'), Markup.button.callback('📅 سباق الأسبوع', 'group:games:gweekly')]
    ]);
    return ctx.reply(
      '🎮 <b>ألعاب الجروب التفاعلية</b>\n\n' +
      '• /gquiz سؤال سريع\n' +
      '• /gmath تحدي حساب ذهني\n' +
      '• /gword ترتيب كلمة\n' +
      '• /gdaily تحدي يومي\n' +
      '• /gmcq سؤال اختيارات بأزرار\n' +
      '• /gvote تصويت تفاعلي (مؤقت)\n' +
      'صيغة مخصصة: <code>/gvote 120 | السؤال | خيار1 | خيار2 | خيار3</code>\n' +
      '• /gquizset 5 سلسلة QuizBot\n' +
      '• /gquizset 7 hard سلسلة مع صعوبة\n' +
      '• /gquizset stop إيقاف السلسلة\n' +
      '• /gleader لوحة المتصدرين\n' +
      '• /gweekly سباق الأسبوع\n' +
      '• /ggame إعدادات نظام الألعاب (للمشرفين)\n' +
      '• /gteam إدارة فريقك\n' +
      '• /gteams ترتيب الفرق\n' +
      '• /gtour إدارة البطولة الأسبوعية (للمشرفين)\n\n' +
      'مستويات الصعوبة: <code>/gquiz easy</code> | <code>/gquiz medium</code> | <code>/gquiz hard</code>\n' +
      '<code>/gmcq easy</code> | <code>/gmcq medium</code> | <code>/gmcq hard</code>\n\n' +
      'نظام الستريك: كل 3 فوز متتالي = بونص نقاط 🔥\n' +
      'نمط الكويز الآن يعمل بأسلوب Quiz Poll مثل QuizBot.',
      { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }
    );
  }
}

module.exports = GroupGamesHandler;
