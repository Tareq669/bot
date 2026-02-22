const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();

  static providerState = {
    gemini: { failures: 0, downUntil: 0 },
    free: { failures: 0, downUntil: 0 }
  };

  static modes = {
    fun: { label: '🎭 فوكاهي', style: 'مرح وخفيف' },
    funny: { label: '😂 مضحك', style: 'نكتة وتعليقات طريفة' },
    plus18: { label: '🔞 18+ (آمن)', style: 'ناضج بدون أي محتوى جنسي صريح' },
    helper: { label: '🧠 مساعد', style: 'عملي وخطوات واضحة' },
    tech: { label: '💻 تقني', style: 'تقني ودقيق' },
    creative: { label: '🧪 مبدع', style: 'أفكار مبتكرة' },
    short: { label: '⚡ مختصر', style: 'مختصر جدا' }
  };

  static intFromEnv(name, fallback, min = 0, max = 600000) {
    const value = Number(process.env[name]);
    if (!Number.isFinite(value)) return fallback;
    if (value < min) return fallback;
    if (value > max) return fallback;
    return Math.floor(value);
  }

  static now() {
    return Date.now();
  }

  static getProviderState(name) {
    if (!this.providerState[name]) {
      this.providerState[name] = { failures: 0, downUntil: 0 };
    }
    return this.providerState[name];
  }

  static isProviderDown(name) {
    return this.getProviderState(name).downUntil > this.now();
  }

  static markProviderSuccess(name) {
    const state = this.getProviderState(name);
    state.failures = 0;
    state.downUntil = 0;
  }

  static markProviderFailure(name, err) {
    const state = this.getProviderState(name);
    const threshold = this.intFromEnv('JOE_PROVIDER_FAIL_THRESHOLD', 2, 1, 10);
    const defaultCooldownMs = this.intFromEnv('JOE_PROVIDER_COOLDOWN_MS', 45000, 1000, 600000);
    const status = Number(err?.response?.status || 0);
    const authCooldownMs = this.intFromEnv('JOE_PROVIDER_AUTH_COOLDOWN_MS', 300000, 10000, 1800000);

    state.failures += 1;
    if (state.failures >= threshold) {
      state.downUntil = this.now() + ((status === 401 || status === 403) ? authCooldownMs : defaultCooldownMs);
    }
  }

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
    session.history.push({ role, content: String(content || '').slice(0, 1800) });
    if (session.history.length > 14) {
      session.history = session.history.slice(session.history.length - 14);
    }
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

  static buildSystemPrompt(mode = 'fun') {
    const m = this.modes[mode] || this.modes.fun;
    return [
      'اسمك جو.',
      'جاوب دائما بالعربية الواضحة وبلهجة فلسطينية بسيطة.',
      `أسلوبك الحالي: ${m.style}.`,
      'ممنوع الإهانة وخطاب الكراهية وأي محتوى جنسي صريح.',
      'رد غالبا في 2 إلى 6 أسطر إلا إذا طلب المستخدم التفصيل.',
      'إذا كان سؤال المستخدم تقنيا أو يحتاج دقة، أعط جوابا مرتب الخطوات.',
      'تجنب الردود العامة المكررة.'
    ].join(' ');
  }

  static mapHistoryToGemini(history) {
    return history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
  }

  static extractGeminiText(data) {
    return (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('\n')
      .trim();
  }

  static async callGemini(session, userText) {
    if (this.isProviderDown('gemini')) throw new Error('GEMINI_COOLDOWN');

    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error('NO_GEMINI_KEY');

    const models = [
      String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim(),
      String(process.env.GEMINI_MODEL_FALLBACK || 'gemini-1.5-flash').trim()
    ].filter(Boolean);

    const payload = {
      systemInstruction: {
        parts: [{ text: this.buildSystemPrompt(session.mode) }]
      },
      contents: [
        ...this.mapHistoryToGemini(session.history.slice(-8)),
        { role: 'user', parts: [{ text: String(userText || '') }] }
      ],
      generationConfig: {
        temperature: session.mode === 'funny' ? 0.9 : 0.7,
        maxOutputTokens: session.mode === 'short' ? 180 : 360
      }
    };

    let lastErr = null;
    const timeout = this.intFromEnv('JOE_GEMINI_TIMEOUT_MS', 6500, 1500, 30000);

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await axios.post(url, payload, {
          timeout,
          headers: { 'Content-Type': 'application/json' }
        });

        const text = this.extractGeminiText(res?.data);
        if (!text) throw new Error('EMPTY_GEMINI_TEXT');
        return text;
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error('GEMINI_FAILED');
  }

  static async callFreeProvider(session, userText) {
    if (this.isProviderDown('free')) throw new Error('FREE_COOLDOWN');

    const endpoint = String(process.env.FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai').trim();
    const model = String(process.env.FREE_CHAT_MODEL || 'openai').trim();
    const history = session.history.slice(-6)
      .map((h) => `${h.role === 'assistant' ? 'المساعد' : 'المستخدم'}: ${h.content}`)
      .join('\n');

    const prompt = [
      this.buildSystemPrompt(session.mode),
      history ? `\nالسياق:\n${history}` : '',
      `\nرسالة المستخدم:\n${String(userText || '')}`,
      '\nجاوب بالعربية فقط.'
    ].join('\n');

    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    const timeout = this.intFromEnv('JOE_FREE_TIMEOUT_MS', 5000, 1000, 20000);
    const res = await axios.get(url, {
      timeout,
      responseType: 'text',
      transformResponse: [(d) => d]
    });

    const text = typeof res?.data === 'string' ? res.data.trim() : '';
    if (!text) throw new Error('FREE_EMPTY');
    return text;
  }

  static localFallback(userText) {
    const q = String(userText || '').trim();
    if (!q) return 'احكيلي شو بدك وأنا جاهز.';

    const clean = q.toLowerCase();
    if (clean.includes('مرحبا') || clean.includes('هلا') || clean.includes('السلام')) {
      return 'ياهلا فيك 🙌 كيف فيني أساعدك اليوم؟';
    }
    if (q.includes('?') || clean.includes('كيف') || clean.includes('ليش') || clean.includes('شو')) {
      return 'سؤالك ممتاز. اكتبه بجملة وحدة واضحة أو أعطني مثال صغير وأنا بجاوبك مباشرة.';
    }

    const variants = [
      'تمام، وصلت الفكرة. ابعتلي التفاصيل الصغيرة وكمل معك بسرعة.',
      'أوكي، خلينا نمشي خطوة خطوة. شو أول نقطة بدك نحلها؟',
      'واضح عليك بدك نتيجة مباشرة. اكتب المطلوب بسطر واحد وأنا أجهز الرد.',
      'ممتاز، إذا بدك جواب أدق اذكر الهدف أو المثال اللي بدك ياه.'
    ];
    return variants[this.now() % variants.length];
  }

  static async generate(session, userText) {
    const errors = {};

    if (!this.isProviderDown('gemini')) {
      try {
        const gemini = await this.callGemini(session, userText);
        this.markProviderSuccess('gemini');
        return gemini;
      } catch (err) {
        errors.gemini = String(err?.message || err);
        this.markProviderFailure('gemini', err);
      }
    } else {
      errors.gemini = 'GEMINI_COOLDOWN';
    }

    if (!this.isProviderDown('free')) {
      try {
        const free = await this.callFreeProvider(session, userText);
        this.markProviderSuccess('free');
        return free;
      } catch (err) {
        errors.free = String(err?.message || err);
        this.markProviderFailure('free', err);
      }
    } else {
      errors.free = 'FREE_COOLDOWN';
    }

    console.error('Joe providers failed:', errors);
    return this.localFallback(userText);
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';

    return ctx.reply(
      `🤖 أهلين! أنا جو.\nاختار النمط وبعدين احكي معي بشكل طبيعي.\n\nالنمط الحالي: ${this.modes[session.mode].label}`,
      { reply_markup: this.buildModeKeyboard(session.mode).reply_markup }
    );
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    return ctx.reply('✅ تم إيقاف جو.');
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
    const [, action, arg] = data.split(':');

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
      await ctx.answerCbQuery('تم المسح', { show_alert: false }).catch(() => {});
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
      const prompt = 'أعطني رد عربي قصير ومضحك بلهجة فلسطينية.';
      this.pushHistory(session, 'user', prompt);
      const out = await this.generate(session, prompt);
      this.pushHistory(session, 'assistant', out);
      return ctx.reply(out);
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

    const now = this.now();
    const minInterval = this.intFromEnv('JOE_MIN_REPLY_INTERVAL_MS', 550, 150, 5000);
    if (now - (session.lastReplyAt || 0) < minInterval) {
      await ctx.reply('⏳ ثانية واحدة بس.');
      return true;
    }
    session.lastReplyAt = now;

    await ctx.sendChatAction('typing').catch(() => {});
    this.pushHistory(session, 'user', msg);

    const out = await this.generate(session, msg);
    this.pushHistory(session, 'assistant', out);

    await ctx.reply(out || 'ما طلع رد هالمرة، جرب مرة ثانية.');
    return true;
  }
}

module.exports = JoeChatHandler;
