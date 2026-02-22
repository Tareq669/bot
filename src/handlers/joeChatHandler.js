const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();
  static researchCache = { docs: [], fetchedAt: 0, loading: null };

  static modes = {
    fun: { label: '🎭 فوكاهي', line: 'خليك فوكاهي لطيف ومرح.' },
    funny: { label: '😂 مضحك', line: 'ركز على النكتة والتعليقات الطريفة بدون إساءة.' },
    plus18: { label: '🔞 18+ (آمن)', line: 'أسلوب ناضج للكبار فقط بدون أي محتوى جنسي صريح.' },
    helper: { label: '🧠 مساعد', line: 'جاوب بشكل عملي وخطوات واضحة.' },
    tech: { label: '💻 تقني', line: 'ركز على الدقة التقنية والحلول المباشرة.' },
    creative: { label: '🧪 مبدع', line: 'اعط أفكار مبتكرة وصياغة جذابة.' },
    short: { label: '⚡ مختصر', line: 'اختصر قدر الإمكان.' }
  };

  static getSession(userId) {
    const key = String(userId);
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        active: false,
        mode: 'fun',
        history: [],
        lastReplyAt: 0
      });
    }
    return this.sessions.get(key);
  }

  static pushHistory(session, role, content) {
    session.history.push({ role, content: String(content || '').slice(0, 2000) });
    if (session.history.length > 20) {
      session.history = session.history.slice(session.history.length - 20);
    }
  }

  static looksCorruptedText(text) {
    const t = String(text || '');
    if (!t.trim()) return true;
    if (t.includes('�') || /\?\?\?/.test(t)) return true;
    if (/[ÃØÙÐ]/.test(t)) return true;

    const letters = (t.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
    const arabic = (t.match(/[\u0600-\u06FF]/g) || []).length;
    if (letters > 20 && arabic / letters < 0.15) return true;
    return false;
  }

  static buildSystemPrompt(mode = 'fun') {
    const modeCfg = this.modes[mode] || this.modes.fun;
    return [
      'اسمك جو.',
      'جاوب بالعربية فقط وبلهجة فلسطينية مفهومة.',
      'ممنوع الإهانة أو خطاب الكراهية أو المحتوى الجنسي الصريح.',
      modeCfg.line,
      'خلّي الرد غالبًا مختصر (2-6 أسطر) إلا إذا طلب المستخدم تفصيل.'
    ].join(' ');
  }

  static buildModeKeyboard(currentMode = 'fun') {
    const mk = (id) => {
      const label = this.modes[id]?.label || id;
      const prefix = currentMode === id ? '✅ ' : '';
      return Markup.button.callback(`${prefix}${label}`, `joe:mode:${id}`);
    };

    return Markup.inlineKeyboard([
      [mk('fun'), mk('funny')],
      [mk('plus18'), mk('helper')],
      [mk('tech'), mk('creative')],
      [mk('short')],
      [Markup.button.callback('🧹 مسح الذاكرة', 'joe:clear'), Markup.button.callback('⏹️ إيقاف جو', 'joe:stop')]
    ]);
  }

  static buildPrompt(messages) {
    return messages
      .map((m) => `${m.role === 'system' ? 'System' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n') + '\nAssistant:';
  }

  static tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((x) => x.length >= 3);
  }

  static scoreDoc(queryTokens, docText) {
    if (!queryTokens.length) return 0;
    const hay = ` ${String(docText || '').toLowerCase()} `;
    let score = 0;
    for (const t of queryTokens) {
      if (hay.includes(` ${t} `)) score += 2;
      else if (hay.includes(t)) score += 1;
    }
    return score;
  }

  static pickTextFromRow(rowObj) {
    if (!rowObj || typeof rowObj !== 'object') return '';
    const preferred = ['question', 'instruction', 'input', 'query', 'prompt', 'answer', 'output', 'response', 'text', 'content', 'title', 'abstract'];
    const parts = [];
    for (const key of preferred) {
      const v = rowObj[key];
      if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    }
    if (parts.length > 0) return parts.join('\n').slice(0, 1800);

    // Generic fallback for unknown schema.
    const anyStrings = Object.values(rowObj).filter((v) => typeof v === 'string' && v.trim()).slice(0, 8);
    return anyStrings.join('\n').slice(0, 1800);
  }

  static async loadOpenResearcher() {
    const now = Date.now();
    const ttlMs = Number(process.env.OPENRESEARCHER_CACHE_TTL_MS || 60 * 60 * 1000);
    if (this.researchCache.docs.length && now - this.researchCache.fetchedAt < ttlMs) {
      return this.researchCache.docs;
    }
    if (this.researchCache.loading) return this.researchCache.loading;

    const fetchTask = (async () => {
      const endpoint = process.env.OPENRESEARCHER_ROWS_ENDPOINT
        || 'https://datasets-server.huggingface.co/rows?dataset=OpenResearcher%2FOpenResearcher-Dataset&config=seed_42&split=train&offset=0&length=300';
      const res = await axios.get(endpoint, { timeout: 30000 });
      const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      const docs = rows
        .map((r) => this.pickTextFromRow(r?.row || r))
        .filter((x) => x && x.length >= 40)
        .slice(0, 500);

      this.researchCache.docs = docs;
      this.researchCache.fetchedAt = Date.now();
      this.researchCache.loading = null;
      return docs;
    })().catch((_err) => {
      this.researchCache.loading = null;
      return this.researchCache.docs;
    });

    this.researchCache.loading = fetchTask;
    return fetchTask;
  }

  static async buildResearchContext(userText) {
    const enabled = String(process.env.JOE_RESEARCH_ENABLED || 'true').toLowerCase() !== 'false';
    if (!enabled) return '';
    const docs = await this.loadOpenResearcher();
    if (!docs.length) return '';

    const q = this.tokenize(userText).slice(0, 12);
    if (!q.length) return '';

    const ranked = docs
      .map((d) => ({ d, s: this.scoreDoc(q, d) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2)
      .map((x, i) => `[مرجع ${i + 1}]\n${x.d.slice(0, 700)}`)
      .join('\n\n');

    return ranked;
  }

  static async callFreeChat(messages) {
    const model = process.env.FREE_CHAT_MODEL || 'openai';
    const endpoint = process.env.FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai';
    const prompt = this.buildPrompt(messages);
    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;

    const response = await axios.get(url, {
      timeout: 30000,
      responseType: 'text',
      transformResponse: [(d) => d]
    });

    const out = typeof response?.data === 'string' ? response.data.trim() : '';
    if (!out) throw new Error('FREE provider returned empty response');
    return out;
  }

  static async generate(session, userText) {
    const context = await this.buildResearchContext(userText);
    const messages = [
      { role: 'system', content: this.buildSystemPrompt(session.mode) },
      ...(context ? [{ role: 'system', content: `استخدم المراجع التالية كخلفية مساعدة فقط إذا كانت مرتبطة بالسؤال:\n\n${context}` }] : []),
      ...session.history.slice(-10),
      { role: 'user', content: String(userText || '') }
    ];

    let out = await this.callFreeChat(messages);
    if (!this.looksCorruptedText(out)) return out;

    const repair = [
      ...messages,
      { role: 'user', content: 'أعد كتابة الرد السابق بالعربية الواضحة فقط وبدون أحرف مشوهة.' }
    ];
    out = await this.callFreeChat(repair);
    if (!this.looksCorruptedText(out)) return out;

    return 'ولا يهمك، صار خلل بسيط. ابعت رسالتك مرة ثانية.';
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';

    return ctx.reply(
      `🤖 أهلين! أنا جو\nاختار النمط وبعدين احكي معي عادي.\n\nالنمط الحالي: ${this.modes[session.mode].label}`,
      { reply_markup: this.buildModeKeyboard(session.mode).reply_markup }
    );
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    return ctx.reply('✅ تم إيقاف جو. إذا بدك تشغله ارجع اضغط Joe أو اكتب /jo');
  }

  static async handleClear(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.history = [];
    return ctx.reply('🧹 تم مسح الذاكرة.');
  }

  static async handleModeCommand(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const text = String(ctx.message?.text || '').trim();
    const mode = String(text.split(/\s+/)[1] || '').toLowerCase();
    if (!mode || !this.modes[mode]) {
      return ctx.reply('استخدم: /jomode fun|funny|plus18|helper|tech|creative|short');
    }

    const session = this.getSession(ctx.from.id);
    session.mode = mode;
    session.active = true;
    return ctx.reply(`✅ تم تغيير النمط إلى: ${this.modes[mode].label}`, {
      reply_markup: this.buildModeKeyboard(session.mode).reply_markup
    });
  }

  static async handleAction(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const data = String(ctx.callbackQuery?.data || '');
    if (!data.startsWith('joe:')) return;

    const session = this.getSession(ctx.from.id);
    const parts = data.split(':');
    const action = parts[1] || '';
    const arg = parts[2] || '';

    if (action === 'open') {
      session.active = true;
      await ctx.answerCbQuery('جاهز ✅', { show_alert: false }).catch(() => {});
      return ctx.editMessageReplyMarkup(this.buildModeKeyboard(session.mode).reply_markup).catch(() => {});
    }

    if (action === 'mode') {
      if (!this.modes[arg]) {
        return ctx.answerCbQuery('وضع غير معروف', { show_alert: false }).catch(() => {});
      }
      session.mode = arg;
      session.active = true;
      await ctx.answerCbQuery(`تم التبديل: ${this.modes[arg].label}`, { show_alert: false }).catch(() => {});
      return ctx.editMessageReplyMarkup(this.buildModeKeyboard(session.mode).reply_markup).catch(() => {});
    }

    if (action === 'clear') {
      session.history = [];
      await ctx.answerCbQuery('تم مسح الذاكرة', { show_alert: false }).catch(() => {});
      return ctx.reply('🧹 تم مسح الذاكرة.');
    }

    if (action === 'stop') {
      session.active = false;
      await ctx.answerCbQuery('تم الإيقاف', { show_alert: false }).catch(() => {});
      return ctx.reply('⏹️ تم إيقاف جو.');
    }

    if (action === 'random') {
      session.active = true;
      await ctx.answerCbQuery('لحظة...', { show_alert: false }).catch(() => {});
      try {
        const prompt = 'أعطني رد عربي قصير ومضحك بلهجة فلسطينية.';
        this.pushHistory(session, 'user', prompt);
        const out = await this.generate(session, prompt);
        this.pushHistory(session, 'assistant', out);
        return ctx.reply(out);
      } catch (_error) {
        return ctx.reply('صار خطأ بسيط، جرب مرة ثانية.');
      }
    }
  }

  static async handlePrivateText(ctx, text) {
    if (ctx.chat?.type !== 'private') return false;
    const session = this.getSession(ctx.from.id);
    if (!session.active) return false;

    const msg = String(text || '').trim();
    if (!msg || msg.startsWith('/')) return false;

    if (msg.length > 1800) {
      await ctx.reply('✂️ الرسالة طويلة، ابعت نص أقصر.');
      return true;
    }

    const now = Date.now();
    if (now - (session.lastReplyAt || 0) < 1200) {
      await ctx.reply('⏳ لحظة شوي :)');
      return true;
    }
    session.lastReplyAt = now;

    try {
      await ctx.sendChatAction('typing').catch(() => {});
      this.pushHistory(session, 'user', msg);
      const out = await this.generate(session, msg);
      this.pushHistory(session, 'assistant', out);
      await ctx.reply(out || 'ما طلع رد هالمرة، جرب مرة ثانية.');
    } catch (_error) {
      await ctx.reply('الخدمة المجانية مشغولة الآن. جرب بعد لحظة.');
    }
    return true;
  }
}

module.exports = JoeChatHandler;
