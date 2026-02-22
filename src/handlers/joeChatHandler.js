const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();

  static modes = {
    fun: { label: '🎭 فوكاهي', style: 'مرِح وخفيف' },
    funny: { label: '😂 مضحك', style: 'نكتة وتعليقات طريفة' },
    plus18: { label: '🔞 18+ (آمن)', style: 'أسلوب ناضج بدون أي محتوى جنسي صريح' },
    helper: { label: '🧠 مساعد', style: 'عملي وخطوات واضحة' },
    tech: { label: '💻 تقني', style: 'تقني ودقيق' },
    creative: { label: '🧪 مبدع', style: 'أفكار مبتكرة' },
    short: { label: '⚡ مختصر', style: 'مختصر جدًا' }
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
      'الرد دائمًا بالعربية وبلهجة فلسطينية واضحة وسهلة.',
      'الأسلوب الحالي: ' + m.style + '.',
      'ممنوع الإهانة وخطاب الكراهية والمحتوى الجنسي الصريح.',
      'الرد غالبًا 2-6 أسطر إلا إذا طلب المستخدم تفصيل.'
    ].join(' ');
  }

  static mapHistoryToGemini(history) {
    return history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
  }

  static async callGemini(session, userText) {
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
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await axios.post(url, payload, {
          timeout: 12000,
          headers: { 'Content-Type': 'application/json' }
        });
        const text = (res?.data?.candidates?.[0]?.content?.parts || [])
          .map((p) => (typeof p?.text === 'string' ? p.text : ''))
          .join('\n')
          .trim();
        if (text) return text;
        throw new Error('EMPTY_GEMINI_TEXT');
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('GEMINI_FAILED');
  }

  static async callFreeProvider(session, userText) {
    const endpoint = process.env.FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai';
    const model = process.env.FREE_CHAT_MODEL || 'openai';
    const context = session.history.slice(-6).map((h) => `${h.role === 'assistant' ? 'المساعد' : 'المستخدم'}: ${h.content}`).join('\n');
    const prompt = [
      this.buildSystemPrompt(session.mode),
      context ? `\nسياق:\n${context}` : '',
      `\nسؤال المستخدم:\n${String(userText || '')}`,
      '\nجاوب بالعربية الواضحة فقط.'
    ].join('\n');

    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    const res = await axios.get(url, {
      timeout: 9000,
      responseType: 'text',
      transformResponse: [(d) => d]
    });
    const text = typeof res?.data === 'string' ? res.data.trim() : '';
    if (!text) throw new Error('FREE_EMPTY');
    return text;
  }

  static localFallback(userText) {
    const q = String(userText || '').trim();
    if (!q) return 'احكيلي شو بدك وأنا معك.';
    if (q.includes('مرحبا') || q.includes('هلا')) return 'هلا والله 🙌 شو الأخبار؟';
    if (q.endsWith('?') || q.includes('كيف')) return 'سؤال ممتاز، ابعته بشكل أقصر شوي وبجاوبك بسرعة.';
    return 'وصلت فكرتك 👌 كمل وأنا معك خطوة بخطوة.';
  }

  static async generate(session, userText) {
    try {
      return await this.callGemini(session, userText);
    } catch (gemErr) {
      try {
        return await this.callFreeProvider(session, userText);
      } catch (freeErr) {
        console.error('Joe providers failed:', {
          gemini: String(gemErr?.message || gemErr),
          free: String(freeErr?.message || freeErr)
        });
        return this.localFallback(userText);
      }
    }
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';
    return ctx.reply(
      `🤖 أهلين! أنا جو.\nاختار النمط وبعدين احكي معي عادي.\n\nالنمط الحالي: ${this.modes[session.mode].label}`,
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

    const now = Date.now();
    if (now - (session.lastReplyAt || 0) < 900) {
      await ctx.reply('⏳ لحظة شوي :)');
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

