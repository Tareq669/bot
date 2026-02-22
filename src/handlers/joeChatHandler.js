const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();

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
    if (session.history.length > 16) {
      session.history = session.history.slice(session.history.length - 16);
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

  static buildSystemInstruction(mode = 'fun') {
    const modeCfg = this.modes[mode] || this.modes.fun;
    return [
      'اسمك جو.',
      'جاوب بالعربية فقط وبلهجة فلسطينية مفهومة.',
      'ممنوع الإهانة أو خطاب الكراهية أو المحتوى الجنسي الصريح.',
      modeCfg.line,
      'خلّي الرد غالبًا مختصر (2-6 أسطر) إلا إذا طلب المستخدم تفصيل.'
    ].join(' ');
  }

  static mapHistoryToGemini(history) {
    return history
      .filter((x) => x && typeof x.content === 'string' && x.content.trim())
      .map((x) => ({
        role: x.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: x.content }]
      }));
  }

  static async callGemini(session, userText) {
    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }

    const models = [
      String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim(),
      String(process.env.GEMINI_MODEL_FALLBACK || 'gemini-1.5-flash').trim()
    ].filter(Boolean);

    const contents = [
      ...this.mapHistoryToGemini(session.history.slice(-10)),
      { role: 'user', parts: [{ text: String(userText || '') }] }
    ];

    const payload = {
      systemInstruction: {
        parts: [{ text: this.buildSystemInstruction(session.mode) }]
      },
      contents,
      generationConfig: {
        temperature: session.mode === 'funny' ? 0.9 : 0.7,
        maxOutputTokens: session.mode === 'short' ? 220 : 420
      }
    };

    let lastError = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await axios.post(url, payload, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        const candidate = response?.data?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts
          .map((p) => (typeof p?.text === 'string' ? p.text : ''))
          .join('\n')
          .trim();

        if (!text) {
          const finish = candidate?.finishReason || 'UNKNOWN';
          throw new Error(`GEMINI_EMPTY_${finish}`);
        }
        return text;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('GEMINI_ALL_MODELS_FAILED');
  }

  static async generate(session, userText) {
    const text = await this.callGemini(session, userText);
    return text;
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';

    const hasKey = Boolean(String(process.env.GEMINI_API_KEY || '').trim());
    if (!hasKey) {
      return ctx.reply(
        '⚠️ Gemini غير مفعّل بعد.\nضيف GEMINI_API_KEY في Railway Variables ثم أعد النشر.',
        { reply_markup: this.buildModeKeyboard(session.mode).reply_markup }
      );
    }

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
    if (now - (session.lastReplyAt || 0) < 1000) {
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
    } catch (error) {
      if (String(error.message || '').includes('GEMINI_API_KEY_MISSING')) {
        await ctx.reply('⚠️ لازم تضيف GEMINI_API_KEY في Railway Variables.');
      } else {
        await ctx.reply('Gemini مشغول الآن. جرب بعد لحظة.');
      }
    }
    return true;
  }
}

module.exports = JoeChatHandler;
