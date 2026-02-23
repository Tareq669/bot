const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');

class JoeChatHandler {
  static sessions = new Map();
  static ai = null;
  static aiKey = '';

  static getSession(userId) {
    const key = String(userId);
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        active: false,
        history: [],
        lastReplyAt: 0,
        pending: false,
        lastBusyNoticeAt: 0,
        queuedText: ''
      });
    }
    return this.sessions.get(key);
  }

  static toInt(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < min || num > max) return fallback;
    return Math.floor(num);
  }

  static toFloat(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < min || num > max) return fallback;
    return num;
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
    return String(process.env.JOE_CHAT_MODEL || 'gemini-2.5-flash-lite').replace(/\s+/g, ' ').trim();
  }

  static getFallbackModelName() {
    return String(process.env.GEMINI_MODEL_FALLBACK || 'gemini-1.5-flash').replace(/\s+/g, ' ').trim();
  }

  static getAllowList() {
    const raw = String(process.env.JOE_ALLOWLIST_IDS || '').trim();
    if (!raw) return null;
    return new Set(
      raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );
  }

  static isAuthorized(userId) {
    const allow = this.getAllowList();
    if (!allow || allow.size === 0) return true;
    return allow.has(String(userId));
  }

  static detectLanguage(text, userLang) {
    const raw = String(text || '');
    if (/[\u0600-\u06FF]/.test(raw)) return 'ar';
    if ((userLang || '').toLowerCase().startsWith('ar')) return 'ar';
    return 'en';
  }

  static pushHistory(session, role, content) {
    const limit = this.toInt(process.env.JOE_MEMORY_TURNS, 10, 4, 30);
    session.history.push({ role, content: String(content || '').slice(0, 1600) });
    if (session.history.length > limit) {
      session.history = session.history.slice(-limit);
    }
  }

  static buildSystemPrompt({ firstName, userLang, textLang }) {
    const dateNow = new Date().toISOString();
    const langLine = textLang === 'ar'
      ? 'Respond in Arabic, with natural Palestinian-friendly tone, clear and smart.'
      : 'Respond in the same language as user input.';

    return [
      'You are Joe, a helpful assistant.',
      `Current datetime: ${dateNow}`,
      `User first name: ${firstName || 'User'}`,
      `User language code: ${userLang || 'unknown'}`,
      langLine,
      'Be concise and practical.',
      'No repetitive filler or generic openers.',
      'Default answer length 2-6 lines unless detail is requested.',
      'For technical tasks, provide clear ordered steps.',
      'No hate, abuse, or explicit sexual content.'
    ].join(' ');
  }

  static buildPrompt(session, userText, firstName, userLang) {
    const textLang = this.detectLanguage(userText, userLang);
    const system = this.buildSystemPrompt({ firstName, userLang, textLang });
    const context = session.history
      .map((h) => `${h.role === 'assistant' ? 'Joe' : 'User'}: ${h.content}`)
      .join('\n');

    return [
      `System:\n${system}`,
      context ? `\nConversation context:\n${context}` : '',
      `\nUser message:\n${String(userText || '')}`,
      '\nAssistant response:'
    ].join('\n');
  }

  static async callGeminiWithModel(session, userText, firstName, userLang, model) {
    const client = this.getClient();
    if (!client) throw new Error('NO_GEMINI_KEY');

    const timeoutMs = this.toInt(process.env.JOE_CHAT_TIMEOUT_MS, 4500, 1200, 30000);
    const maxTokens = this.toInt(process.env.JOE_CHAT_MAX_TOKENS, 260, 64, 1024);
    const temperature = this.toFloat(process.env.JOE_CHAT_TEMPERATURE, 0.6, 0, 1.5);
    const prompt = this.buildPrompt(session, userText, firstName, userLang);

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOE_TIMEOUT')), timeoutMs))
    ]);

    const text = String(response?.text || '').trim();
    if (!text) throw new Error('EMPTY_GEMINI_TEXT');
    return text;
  }

  static async callGemini(session, userText, firstName, userLang) {
    const primary = this.getModelName();
    const fallback = this.getFallbackModelName();

    try {
      return await this.callGeminiWithModel(session, userText, firstName, userLang, primary);
    } catch (primaryErr) {
      if (!fallback || fallback === primary) {
        throw primaryErr;
      }
      return this.callGeminiWithModel(session, userText, firstName, userLang, fallback);
    }
  }

  static async callFreeFallback(session, userText, firstName, userLang) {
    const endpoint = String(process.env.JOE_FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai').trim().replace(/\/+$/, '');
    const model = String(process.env.JOE_FREE_CHAT_MODEL || 'openai').trim();
    const timeoutMs = this.toInt(process.env.JOE_FREE_TIMEOUT_MS, 4200, 1000, 30000);
    const textLang = this.detectLanguage(userText, userLang);
    const langInstruction = textLang === 'ar'
      ? 'الرد بالعربية فقط وبأسلوب واضح وذكي ومختصر.'
      : 'Reply in the same language as the user.';

    const context = session.history
      .slice(-6)
      .map((h) => `${h.role === 'assistant' ? 'Joe' : 'User'}: ${h.content}`)
      .join('\n');

    const prompt = [
      `Assistant name: Joe. User: ${firstName || 'User'}.`,
      langInstruction,
      'Avoid repetitive phrases.',
      context ? `Context:\n${context}` : '',
      `User message:\n${String(userText || '')}`
    ].join('\n');

    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    const res = await fetch(url, {
      method: 'GET',
      timeout: timeoutMs,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' }
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`FREE_CHAT_HTTP_${res.status}: ${body}`);
    }

    const text = String(await res.text()).trim();
    if (!text) throw new Error('EMPTY_FREE_TEXT');
    return text;
  }

  static localFallback(_userText, userLang) {
    const textLang = this.detectLanguage('', userLang);
    if (textLang === 'ar') {
      return 'حالياً مزود الذكاء مشغول. أعد إرسال سؤالك خلال ثواني بشكل مختصر وسأجاوبك فورًا.';
    }
    return 'AI provider is busy right now. Please retry in a few seconds with a shorter prompt.';
  }

  static async generate(session, userText, firstName, userLang) {
    try {
      return await this.callGemini(session, userText, firstName, userLang);
    } catch (_gemErr) {
      try {
        return await this.callFreeFallback(session, userText, firstName, userLang);
      } catch (_freeErr) {
        return this.localFallback(userText, userLang);
      }
    }
  }

  static async processOneMessage(ctx, session, msg) {
    await ctx.sendChatAction('typing').catch(() => {});
    this.pushHistory(session, 'user', msg);

    const output = await this.generate(
      session,
      msg,
      ctx.from?.first_name || '',
      ctx.from?.language_code || ''
    );

    this.pushHistory(session, 'assistant', output);
    await ctx.reply(output);
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    return ctx.reply('🤖 تم تفعيل جو. ابعث أي رسالة وسأرد بسرعة.');
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    session.pending = false;
    session.queuedText = '';
    return ctx.reply('✅ تم إيقاف جو.');
  }

  static async handleClear(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.history = [];
    return ctx.reply('🧹 تم مسح ذاكرة جو.');
  }

  static async handleModeCommand(ctx) {
    if (ctx.chat?.type !== 'private') return;
    return ctx.reply('ℹ️ جو يعمل الآن بوضع ذكي سريع.');
  }

  static async handleAction(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const data = String(ctx.callbackQuery?.data || '');
    if (!data.startsWith('joe:') && data !== 'menu:joe') return;

    if (data === 'menu:joe' || data === 'joe:open') {
      await ctx.answerCbQuery('تم تفعيل جو').catch(() => {});
      return this.handleStart(ctx);
    }
    if (data === 'joe:clear') {
      await ctx.answerCbQuery('تم مسح الذاكرة').catch(() => {});
      return this.handleClear(ctx);
    }
    if (data === 'joe:stop') {
      await ctx.answerCbQuery('تم إيقاف جو').catch(() => {});
      return this.handleStop(ctx);
    }
    await ctx.answerCbQuery('تم').catch(() => {});
  }

  static async handlePrivateText(ctx, text) {
    if (ctx.chat?.type !== 'private') return false;
    const session = this.getSession(ctx.from.id);
    if (!session.active) return false;

    if (!this.isAuthorized(ctx.from.id)) {
      await ctx.reply('⛔ هذا المساعد غير مفعل لهذا الحساب.');
      return true;
    }

    const msg = String(text || '').trim();
    if (!msg || msg.startsWith('/')) return false;

    if (msg.length > 2500) {
      await ctx.reply('✂️ الرسالة طويلة. اختصرها قليلاً.');
      return true;
    }

    const now = Date.now();
    const minInterval = this.toInt(process.env.JOE_MIN_REPLY_INTERVAL_MS, 250, 80, 5000);

    if (now - (session.lastReplyAt || 0) < minInterval) {
      if (now - (session.lastBusyNoticeAt || 0) > 1800) {
        session.lastBusyNoticeAt = now;
        await ctx.reply('لحظة صغيرة... اكتب رسالة واحدة واضحة وأنا أرد مباشرة.');
      }
      return true;
    }

    if (session.pending) {
      session.queuedText = msg;
      if (now - (session.lastBusyNoticeAt || 0) > 1800) {
        session.lastBusyNoticeAt = now;
        await ctx.reply('مستلم رسالتك. سأرد على آخر رسالة بعد ثواني.');
      }
      return true;
    }

    session.pending = true;
    session.lastReplyAt = now;

    try {
      await this.processOneMessage(ctx, session, msg);
      return true;
    } finally {
      session.pending = false;

      const queued = String(session.queuedText || '').trim();
      session.queuedText = '';
      if (queued && queued !== msg) {
        session.pending = true;
        session.lastReplyAt = Date.now();
        try {
          await this.processOneMessage(ctx, session, queued);
        } finally {
          session.pending = false;
        }
      }
    }
  }
}

module.exports = JoeChatHandler;
