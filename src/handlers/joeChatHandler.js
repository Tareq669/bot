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

  static detectLanguageFromText(text, userLang) {
    const raw = String(text || '');
    if (/[\u0600-\u06FF]/.test(raw)) return 'ar';
    if ((userLang || '').toLowerCase().startsWith('ar')) return 'ar';
    return 'en';
  }

  static pushHistory(session, role, content) {
    session.history.push({ role, content: String(content || '').slice(0, 1400) });
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }
  }

  static buildSystemPrompt(userFirstName, userLang, textLang) {
    const langInstruction = textLang === 'ar'
      ? 'Reply in Arabic clearly, with a light Palestinian tone.'
      : 'Reply in the same language as the user text.';

    return [
      'Your name is Joe.',
      `User first name: ${userFirstName || 'User'}.`,
      `User profile language: ${userLang || 'unknown'}.`,
      langInstruction,
      'Be concise, practical, and friendly.',
      'Avoid repetitive openings and generic filler.',
      'Default length: 2-6 lines unless user asks for detail.',
      'For technical questions: answer as clear steps.',
      'No hate/abuse/explicit sexual content.'
    ].join(' ');
  }

  static buildPrompt(session, userText, userFirstName, userLang) {
    const textLang = this.detectLanguageFromText(userText, userLang);
    const system = this.buildSystemPrompt(userFirstName, userLang, textLang);
    const context = session.history
      .map((item) => `${item.role === 'assistant' ? 'Joe' : 'User'}: ${item.content}`)
      .join('\n');

    return [
      `System:\n${system}`,
      context ? `\nConversation context:\n${context}` : '',
      `\nUser message:\n${String(userText || '')}`,
      '\nAssistant reply:'
    ].join('\n');
  }

  static async generate(session, userText, userFirstName, userLang) {
    const client = this.getClient();
    if (!client) {
      return '⚠️ خدمة الذكاء غير مفعلة. أضف GEMINI_API_KEY في Railway Variables.';
    }

    const model = this.getModelName();
    const timeoutMs = this.toInt(process.env.JOE_CHAT_TIMEOUT_MS, 4200, 1200, 30000);
    const maxOutputTokens = this.toInt(process.env.JOE_CHAT_MAX_TOKENS, 260, 64, 1024);
    const temperature = Number.isFinite(Number(process.env.JOE_CHAT_TEMPERATURE))
      ? Number(process.env.JOE_CHAT_TEMPERATURE)
      : 0.6;

    const prompt = this.buildPrompt(session, userText, userFirstName, userLang);

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOE_TIMEOUT')), timeoutMs))
    ]);

    const text = String(response?.text || '').trim();
    if (!text) throw new Error('JOE_EMPTY_RESPONSE');
    return text;
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    return ctx.reply('🤖 تم تفعيل جو. ابعت أي رسالة وأنا أرد مباشرة وبسرعة.');
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
    return ctx.reply('ℹ️ جو الآن يعمل بوضع ذكي موحد وسريع.');
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

    if (msg.length > 2500) {
      await ctx.reply('✂️ الرسالة طويلة. اختصرها قليلا.');
      return true;
    }

    const now = Date.now();
    const minInterval = this.toInt(process.env.JOE_MIN_REPLY_INTERVAL_MS, 280, 80, 5000);
    if (now - (session.lastReplyAt || 0) < minInterval) return true;
    session.lastReplyAt = now;

    if (session.pending) return true;
    session.pending = true;

    try {
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
      return true;
    } catch (error) {
      const errorText = String(error?.message || error);
      if (errorText === 'JOE_TIMEOUT') {
        await ctx.reply('⏱️ الرد تأخر. أعد السؤال بصياغة أقصر.');
      } else {
        await ctx.reply('❌ تعذر الاتصال بخدمة الذكاء حاليا. حاول بعد لحظات.');
      }
      return true;
    } finally {
      session.pending = false;
    }
  }
}

module.exports = JoeChatHandler;
