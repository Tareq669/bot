const { GoogleGenAI } = require('@google/genai');

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
        pending: false
      });
    }
    return this.sessions.get(key);
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
    return String(process.env.JOE_CHAT_MODEL || 'gemini-2.5-flash-lite').trim();
  }

  static toInt(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (num < min || num > max) return fallback;
    return Math.floor(num);
  }

  static pushHistory(session, role, content) {
    session.history.push({ role, content: String(content || '').slice(0, 1200) });
    if (session.history.length > 8) {
      session.history = session.history.slice(-8);
    }
  }

  static buildPrompt(session, userText) {
    const context = session.history
      .map((item) => `${item.role === 'assistant' ? 'جو' : 'المستخدم'}: ${item.content}`)
      .join('\n');

    return [
      'أنت مساعد اسمه "جو".',
      'اكتب بالعربية فقط، وبأسلوب فلسطيني خفيف ومحترم.',
      'لا تستخدم إطالة ولا مقدمات مكررة.',
      'جاوب مباشرة بوضوح وبحد أقصى 6 أسطر إلا إذا طلب المستخدم التفصيل.',
      'إذا السؤال تقني: اعط خطوات عملية مرتبة.',
      context ? `\nالسياق السابق:\n${context}` : '',
      `\nرسالة المستخدم:\n${String(userText || '')}`,
      '\nالرد:'
    ].join('\n');
  }

  static async generate(session, userText) {
    const client = this.getClient();
    if (!client) {
      return '⚠️ خدمة الذكاء غير مفعلة حالياً. أضف GEMINI_API_KEY في Railway Variables.';
    }

    const model = this.getModelName();
    const timeoutMs = this.toInt(process.env.JOE_CHAT_TIMEOUT_MS, 5000, 1500, 30000);
    const prompt = this.buildPrompt(session, userText);

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.6,
          maxOutputTokens: 300
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOE_TIMEOUT')), timeoutMs))
    ]);

    const text = String(response?.text || '').trim();
    if (!text) {
      throw new Error('JOE_EMPTY_RESPONSE');
    }
    return text;
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    return ctx.reply(
      '🤖 تم تفعيل جو.\nاحكي معي مباشرة بأي سؤال، وسأرد عليك بسرعة.'
    );
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    session.pending = false;
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
    return ctx.reply('ℹ️ تم إلغاء أنماط جو. الآن يعمل كنظام Chat AI سريع بشكل مباشر.');
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

    const msg = String(text || '').trim();
    if (!msg || msg.startsWith('/')) return false;

    if (msg.length > 2000) {
      await ctx.reply('✂️ الرسالة طويلة. ابعتها بشكل أقصر.');
      return true;
    }

    const now = Date.now();
    const minInterval = this.toInt(process.env.JOE_MIN_REPLY_INTERVAL_MS, 350, 100, 5000);
    if (now - (session.lastReplyAt || 0) < minInterval) {
      return true;
    }
    session.lastReplyAt = now;

    if (session.pending) {
      return true;
    }

    session.pending = true;
    try {
      await ctx.sendChatAction('typing').catch(() => {});
      this.pushHistory(session, 'user', msg);

      const output = await this.generate(session, msg);
      this.pushHistory(session, 'assistant', output);

      await ctx.reply(output);
      return true;
    } catch (error) {
      const errorText = String(error?.message || error);
      if (errorText === 'JOE_TIMEOUT') {
        await ctx.reply('⏱️ الرد تأخر من المزود. جرّب صياغة أقصر وسأرد أسرع.');
      } else {
        await ctx.reply('❌ تعذر الاتصال بخدمة الذكاء حالياً. حاول بعد لحظات.');
      }
      return true;
    } finally {
      session.pending = false;
    }
  }
}

module.exports = JoeChatHandler;
