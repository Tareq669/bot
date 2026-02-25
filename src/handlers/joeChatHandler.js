const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');
const Markup = require('telegraf/markup');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const MODE_MAP = {
  funny: { label: 'فوكاهي', instruction: 'تكلم بأسلوب مرح وخفيف باللهجة الفلسطينية.' },
  friendly: { label: 'صاحب', instruction: 'تكلم كصاحب قريب. دافئ ومباشر.' },
  smart: { label: 'ذكي', instruction: 'تكلم بشكل عملي ومرتب. ركز على الحل.' },
  roast: { label: 'مشاكس', instruction: 'مزح خفيف محترم، بدون تجريح.' }
};

const DAILY_PACK = [
  'سؤال اليوم: شو خطوة صغيرة بتعملها اليوم وبتخلي بكرا أحسن؟',
  'نصيحة اليوم: اشتغل 25 دقيقة تركيز و5 دقايق راحة.',
  'تحدي اليوم: اكتب هدف واحد بسيط وابدأ فيه الآن.',
  'فكرة اليوم: رتب مهامك: مهم جدا، مهم، لاحقا.',
  'قاعدة اليوم: خلص الأصعب أول.'
];

const JOKES = [
  'مرة واحد كتب خطة يومه... أول بند: نام.',
  'قاله: ليش متوتر؟ قاله: النت بطيء وأنا أسرع منه.',
  'مرة واحد اشترى دفتر تنظيم... ضيّعه بنفس اليوم.',
  'قاله: خلصت شغلك؟ قاله: خلصت أفكر أبلش.',
  'أنا مو كسول... أنا بوفر طاقة للمستقبل.'
];

const SMART_REPLIES = [
  { test: /(تعبان|طفشان|زهقان|مضغوط|زعلان)/i, reply: 'فاهمك. بدك نحكي شوي ولا أعطيك خطة سريعة من 3 خطوات؟' },
  { test: /(مرحبا|هلا|السلام عليكم|هاي)/i, reply: 'هلا فيك! اكتب "جو + سؤالك" وأنا معك.' },
  { test: /(ما فهمت|مش فاهم)/i, reply: 'ولا يهمك. وضحلي بجملة واحدة بس وأنا أبسطها.' }
];

const CANNED_REPLIES = [
  { test: /^(كيفك|كيف حالك|شو اخبارك|شو أخبارك|اخبارك|أخبارك)$/i, replies: ['منيح والحمد لله 😄 وإنت كيفك؟', 'تمام يا زعيم 👌 إنت شو أخبارك؟', 'الحمد لله تمام، طمني عنك 🌟'] },
  { test: /^(مرحبا|هلا|السلام عليكم|هاي|hello|hi)$/i, replies: ['هلا فيك 👋 شو بتحب نعمل؟', 'أهلين! احكيلي شو بدك 🙌', 'يا مرحب! جاهز أساعدك 💪'] },
  { test: /^(شكرا|شكرًا|يسلمو|يعطيك العافية|ثانكس|thanks)$/i, replies: ['العفو يا غالي 🌹', 'ولا يهمك، بالخدمة 🙏', 'تسلم يا محترم ❤️'] },
  { test: /^(مين انت|من انت|شو انت|شو اسمك)$/i, replies: ['أنا جو، مساعد الجروب 🤖', 'اسمي جو، صاحِبكم هون بالجروب 😎'] },
  { test: /^(نكتة|نكته|ضحكني)$/i, replies: JOKES },
  { test: /^(يومي|اليومي|نصيحة)$/i, replies: DAILY_PACK },
  { test: /(احبك|بحبك|love you)/i, replies: ['حبيبي 😄 خلينا نضل أصحاب ونكمل إنجاز.', 'محبة واحترام يا غالي 🌹'] },
  { test: /(باي|سلام|مع السلامة|مع السلامه|bye)/i, replies: ['مع السلامة 👋 إذا احتجتني أنا هون.', 'سلام يا بطل ✨'] }
];

class JoeChatHandler {
  static sessions = new Map();
  static ai = null;
  static aiKey = '';

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static getSession(chatId) {
    const key = String(chatId);
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        active: true,
        mode: 'friendly',
        history: [],
        pending: false,
        queuedText: '',
        lastReplyAt: 0,
        statsByUser: {},
        miniGame: null,
        lastDailyKey: ''
      });
    }
    return this.sessions.get(key);
  }

  static pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items[Math.floor(Math.random() * items.length)];
  }

  static getKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('😄 فوكاهي', 'group:joe:mode:funny'),
        Markup.button.callback('🤝 صاحب', 'group:joe:mode:friendly')
      ],
      [
        Markup.button.callback('🧠 ذكي', 'group:joe:mode:smart'),
        Markup.button.callback('😏 مشاكس', 'group:joe:mode:roast')
      ],
      [
        Markup.button.callback('📅 يومي', 'group:joe:daily'),
        Markup.button.callback('😂 ضحكني', 'group:joe:joke')
      ],
      [Markup.button.callback('🎮 لعبة', 'group:joe:game')]
    ]);
  }

  static toInt(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return Math.floor(n);
  }

  static toFloat(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return n;
  }

  static detectLanguage(text, userLang) {
    const raw = String(text || '');
    if (/[\u0600-\u06FF]/.test(raw)) return 'ar';
    if ((userLang || '').toLowerCase().startsWith('ar')) return 'ar';
    return 'en';
  }

  static getClient() {
    const key = String(process.env.GEMINI_API_KEY || '').trim();
    if (!key) return null;
    if (!this.ai || this.aiKey !== key) {
      this.ai = new GoogleGenAI({ apiKey: key });
      this.aiKey = key;
    }
    return this.ai;
  }

  static getModelName() {
    return String(process.env.JOE_CHAT_MODEL || 'gemini-2.0-flash').trim();
  }

  static getFallbackModelName() {
    return String(process.env.GEMINI_MODEL_FALLBACK || 'gemini-1.5-flash').trim();
  }

  static cleanOutput(text) {
    let out = String(text || '');
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    out = out.replace(/^\s*```[\s\S]*?```/g, '').trim();
    if (!out) out = 'وضحلي أكثر شو بدك بالضبط؟';
    return out.slice(0, 2000);
  }

  static getLocalFallback(userText) {
    const text = String(userText || '').trim();
    if (!text) return 'وضحلي أكثر شو بدك بالضبط؟';
    if (text.length <= 20) return 'تمام وصلتني 👍 كمللي سؤالك بكلمتين زيادة.';
    return 'وصلت فكرتك. إذا بدك جواب أدق، حدد المطلوب أكثر شوي.';
  }

  static getCannedReply(userText) {
    const text = String(userText || '').trim();
    if (!text) return null;
    for (const item of CANNED_REPLIES) {
      if (item.test.test(text)) {
        return this.pickRandom(item.replies);
      }
    }
    return null;
  }

  static pushHistory(session, role, content) {
    const limit = this.toInt(process.env.JOE_MEMORY_TURNS, 15, 8, 30);
    session.history.push({ role, content: String(content || '').slice(0, 1000) });
    if (session.history.length > limit) session.history = session.history.slice(-limit);
  }

  static getUserTitle(session, userId) {
    const stats = session.statsByUser[String(userId)] || { messages: 0 };
    const m = Number(stats.messages || 0);
    if (m >= 300) return 'نجم الجروب';
    if (m >= 120) return 'قائد التفاعل';
    if (m >= 50) return 'نشّيط';
    return 'جديد';
  }

  static buildSystemPrompt({ firstName, userLang, textLang, mode, title }) {
    const modeMeta = MODE_MAP[mode] || MODE_MAP.friendly;
    const langRule = textLang === 'ar' ? 'اكتب بالعربية الفلسطينية البسيطة فقط.' : 'Respond in the user language.';
    return [
      'اسمك جو.',
      langRule,
      modeMeta.instruction,
      `اسم المستخدم: ${firstName || 'مستخدم'}.`,
      `لغة المستخدم: ${userLang || 'unknown'}.`,
      `رتبته في الجروب: ${title}.`,
      'الرد قصير ومباشر.',
      'إذا السؤال مش واضح اسأل سؤال توضيحي واحد.',
      'لا تخترع معلومات، وإذا مش متأكد قل: مش متأكد.',
      'ممنوع إظهار التفكير الداخلي أو <think>.',
      'أمثلة:',
      'User: مرحبا',
      'Assistant: هلا فيك! شو بتحب أساعدك فيه؟',
      'User: ما فهمت',
      'Assistant: ولا يهمك، وضحلي أكتر شو قصدك؟'
    ].join('\n');
  }

  static buildPrompt(session, userText, firstName, userLang, title) {
    const textLang = this.detectLanguage(userText, userLang);
    const system = this.buildSystemPrompt({ firstName, userLang, textLang, mode: session.mode, title });
    const context = session.history.map((h) => `${h.role === 'assistant' ? 'جو' : 'المستخدم'}: ${h.content}`).join('\n');
    return `${system}\n\nالسياق:\n${context}\n\nرسالة المستخدم:\n${userText}\n\nرد جو:`;
  }

  static async callGeminiWithModel(session, userText, firstName, userLang, title, model) {
    const client = this.getClient();
    if (!client) throw new Error('NO_GEMINI_KEY');
    const timeoutMs = this.toInt(process.env.JOE_CHAT_TIMEOUT_MS, 7000, 1500, 30000);
    const maxTokens = this.toInt(process.env.JOE_CHAT_MAX_TOKENS, 220, 64, 1024);
    const temperature = this.toFloat(process.env.JOE_CHAT_TEMPERATURE, 0.4, 0.2, 0.7);
    const prompt = this.buildPrompt(session, userText, firstName, userLang, title);

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: prompt,
        config: { temperature, maxOutputTokens: maxTokens }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOE_TIMEOUT')), timeoutMs))
    ]);

    return this.cleanOutput(String(response?.text || ''));
  }

  static async callFreeFallback(session, userText, firstName, userLang) {
    const endpoint = String(process.env.JOE_FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai').trim().replace(/\/+$/, '');
    const model = String(process.env.JOE_FREE_CHAT_MODEL || 'openai-large').trim();
    const timeoutMs = this.toInt(process.env.JOE_FREE_TIMEOUT_MS, 5000, 1000, 30000);
    const textLang = this.detectLanguage(userText, userLang);
    const modeMeta = MODE_MAP[session.mode] || MODE_MAP.friendly;
    const langInstruction = textLang === 'ar' ? 'الرد بالعربية الفلسطينية الواضحة فقط.' : 'Reply in user language.';
    const context = session.history.slice(-8).map((h) => `${h.role}: ${h.content}`).join('\n');
    const prompt = [
      'اسمك جو.',
      modeMeta.instruction,
      langInstruction,
      'رد قصير بدون تكرار.',
      `المستخدم: ${firstName || 'مستخدم'}`,
      context ? `سياق:\n${context}` : '',
      `رسالة:\n${String(userText || '')}`
    ].join('\n');

    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    const res = await fetch(url, { method: 'GET', timeout: timeoutMs, headers: { 'User-Agent': 'JoeGroupBot/1.0' } });
    if (!res.ok) throw new Error(`FREE_CHAT_HTTP_${res.status}`);
    return this.cleanOutput(await res.text());
  }

  static async generate(session, userText, firstName, userLang, title) {
    const canned = this.getCannedReply(userText);
    if (canned) return canned;

    const freeFirst = ['1', 'true', 'yes', 'on'].includes(String(process.env.JOE_USE_FREE_FIRST || 'false').toLowerCase());
    if (freeFirst) {
      try { return await this.callFreeFallback(session, userText, firstName, userLang); } catch (_) {}
      try { return await this.callGeminiWithModel(session, userText, firstName, userLang, title, this.getModelName()); } catch (_) {}
      return this.getLocalFallback(userText);
    }

    try { return await this.callGeminiWithModel(session, userText, firstName, userLang, title, this.getModelName()); } catch (_) {}
    try { return await this.callGeminiWithModel(session, userText, firstName, userLang, title, this.getFallbackModelName()); } catch (_) {}
    try { return await this.callFreeFallback(session, userText, firstName, userLang); } catch (_) {}
    return this.getLocalFallback(userText);
  }

  static dailyMessage(session) {
    session.lastDailyKey = new Date().toISOString().slice(0, 10);
    return `📅 يومي:\n${this.pickRandom(DAILY_PACK)}`;
  }

  static startMiniGame(session, userId) {
    const bank = [
      { q: 'رتّب الكلمة: ر م ض ا ن', a: 'رمضان' },
      { q: 'كم ناتج 15 + 7 ؟', a: '22' },
      { q: 'إيموجي لغز: 🌊🏝️ (كلمة)', a: 'جزيرة' }
    ];
    const pick = this.pickRandom(bank);
    session.miniGame = {
      answer: String(pick.a).toLowerCase().trim(),
      ownerId: Number(userId),
      startedAt: Date.now()
    };
    return `🎮 لعبة جو:\n${pick.q}\n\nجاوب برسالة وحدة.`;
  }

  static async handleAction(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const data = String(ctx.callbackQuery?.data || '');
    if (!data.startsWith('group:joe:')) return;

    const session = this.getSession(ctx.chat.id);
    const action = data.replace('group:joe:', '');

    if (action.startsWith('mode:')) {
      const mode = action.split(':')[1];
      if (MODE_MAP[mode]) {
        session.mode = mode;
        await ctx.answerCbQuery(`وضع جو: ${MODE_MAP[mode].label}`).catch(() => {});
        await ctx.reply(`✅ تم تغيير وضع جو إلى: ${MODE_MAP[mode].label}`);
        return;
      }
    }
    if (action === 'daily') {
      await ctx.answerCbQuery('تم').catch(() => {});
      await ctx.reply(this.dailyMessage(session));
      return;
    }
    if (action === 'joke') {
      await ctx.answerCbQuery('تم').catch(() => {});
      await ctx.reply(`😂 ${this.pickRandom(JOKES)}`);
      return;
    }
    if (action === 'game') {
      await ctx.answerCbQuery('تم').catch(() => {});
      await ctx.reply(this.startMiniGame(session, ctx.from.id));
      return;
    }
    await ctx.answerCbQuery('تم').catch(() => {});
  }

  static async handleGroupText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    const session = this.getSession(ctx.chat.id);
    const msg = String(text || '').trim();
    if (!msg) return false;

    if (/^(جو|جو\s*مساعدة|جو\s*menu)$/i.test(msg)) {
      await ctx.reply(
        '🤖 <b>جو - مساعد الجروب</b>\n\n' +
        'اكتب:\n' +
        '• <code>جو + سؤالك</code>\n' +
        '• <code>جو يومي</code>\n' +
        '• <code>جو ضحكني</code>\n' +
        '• <code>جو لعبة</code>\n' +
        '• <code>وضع جو فوكاهي</code>',
        { parse_mode: 'HTML', reply_markup: this.getKeyboard().reply_markup }
      );
      return true;
    }

    if (/^وضع\s*جو\s+(.+)$/i.test(msg)) {
      const raw = msg.replace(/^وضع\s*جو\s+/i, '').trim();
      const selected = Object.entries(MODE_MAP).find(([, v]) => v.label === raw)?.[0];
      if (selected) {
        session.mode = selected;
        await ctx.reply(`✅ تم تغيير وضع جو إلى: ${MODE_MAP[selected].label}`);
      } else {
        await ctx.reply('❌ المتاح: فوكاهي، صاحب، ذكي، مشاكس');
      }
      return true;
    }

    if (/^جو\s*يومي$/i.test(msg)) {
      await ctx.reply(this.dailyMessage(session));
      return true;
    }
    if (/^جو\s*(ضحكني|نكتة|نكته)$/i.test(msg)) {
      await ctx.reply(`😂 ${this.pickRandom(JOKES)}`);
      return true;
    }
    if (/^جو\s*(لعبة|لعبه|تسلية|تسليه)$/i.test(msg)) {
      await ctx.reply(this.startMiniGame(session, ctx.from.id));
      return true;
    }

    if (session.miniGame) {
      const answer = msg.toLowerCase().trim();
      if (answer === session.miniGame.answer) {
        session.miniGame = null;
        const uid = String(ctx.from.id);
        session.statsByUser[uid] = session.statsByUser[uid] || { messages: 0, wins: 0 };
        session.statsByUser[uid].wins += 1;
        await ctx.reply(`🏆 ${ctx.from.first_name} فاز بالجولة!`);
        return true;
      }
    }

    const smart = SMART_REPLIES.find((r) => r.test.test(msg));
    if (smart && msg.length < 40) {
      await ctx.reply(smart.reply, { reply_to_message_id: ctx.message.message_id });
      return true;
    }

    if (!/^جو[\s,:،-]+/i.test(msg)) return false;
    const userText = msg.replace(/^جو[\s,:،-]+/i, '').trim();
    if (!userText) return false;

    const cannedAfterPrefix = this.getCannedReply(userText);
    if (cannedAfterPrefix) {
      await ctx.reply(cannedAfterPrefix, { reply_to_message_id: ctx.message.message_id });
      return true;
    }

    const uid = String(ctx.from.id);
    session.statsByUser[uid] = session.statsByUser[uid] || { messages: 0, wins: 0 };
    session.statsByUser[uid].messages += 1;

    const minInterval = this.toInt(process.env.JOE_MIN_REPLY_INTERVAL_MS, 250, 80, 5000);
    if (Date.now() - session.lastReplyAt < minInterval) return true;

    if (session.pending) {
      session.queuedText = userText;
      return true;
    }

    session.pending = true;
    session.lastReplyAt = Date.now();
    try {
      await ctx.sendChatAction('typing').catch(() => {});
      const title = this.getUserTitle(session, ctx.from.id);
      this.pushHistory(session, 'user', userText);
      const output = await this.generate(session, userText, ctx.from?.first_name || '', ctx.from?.language_code || '', title);
      this.pushHistory(session, 'assistant', output);
      await ctx.reply(output, { reply_to_message_id: ctx.message.message_id });
      return true;
    } finally {
      session.pending = false;
      session.queuedText = '';
    }
  }
}

module.exports = JoeChatHandler;
