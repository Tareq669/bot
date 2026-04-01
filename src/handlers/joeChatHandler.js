const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');

const GROUP_TYPES = new Set(['group', 'supergroup']);

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
        history: [],
        pending: false,
        queuedText: '',
        lastReplyAt: 0
      });
    }
    return this.sessions.get(key);
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
    let out = String(text || '').trim();
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    out = out.replace(/^\s*```[\s\S]*?```/g, '').trim();
    if (this.isLikelyPromoOutput(out)) {
      return 'خلّينا نكمّل بدون روابط دعائية. اكتب سؤالك بشكل مباشر وأنا معك.';
    }
    if (!out) out = 'وضح سؤالك أكثر شوي.';
    return out.slice(0, 2000);
  }

  static isLikelyPromoOutput(text) {
    const raw = String(text || '');
    if (!raw) return false;
    const lower = raw.toLowerCase();
    const hasTelegramLink = /https?:\/\/t\.me\/[a-z0-9_]+/i.test(raw);
    const promoSignals = [
      'join the bot',
      'start now',
      'think you’re the funniest',
      "think you're the funniest",
      'best memes',
      'battle',
      'conquer',
      'memefightsbot'
    ];
    const promoScore = promoSignals.reduce((sum, signal) => sum + (lower.includes(signal) ? 1 : 0), 0);
    return hasTelegramLink && promoScore >= 2;
  }

  static isFreeFallbackAllowed() {
    const raw = String(process.env.JOE_ALLOW_FREE_FALLBACK || 'false').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(raw);
  }

  static pushHistory(session, role, content) {
    const limit = this.toInt(process.env.JOE_MEMORY_TURNS, 12, 6, 30);
    session.history.push({ role, content: String(content || '').slice(0, 900) });
    if (session.history.length > limit) session.history = session.history.slice(-limit);
  }

  static buildPrompt(session, userText, firstName, userLang) {
    const textLang = this.detectLanguage(userText, userLang);
    const langRule = textLang === 'ar'
      ? 'اكتب بالعربية الواضحة وبلهجة فلسطينية بسيطة، بدون تطويل.'
      : 'Reply in the same language as the user.';

    const system = [
      'اسمك جو.',
      langRule,
      `اسم المستخدم: ${firstName || 'مستخدم'}.`,
      'لا تخترع معلومات، وإذا مش متأكد قل: مش متأكد.',
      'إذا السؤال غير واضح اسأل سؤال توضيحي واحد.'
    ].join('\n');

    const context = session.history
      .map((h) => `${h.role === 'assistant' ? 'جو' : 'المستخدم'}: ${h.content}`)
      .join('\n');

    return `${system}\n\nالسياق:\n${context}\n\nرسالة المستخدم:\n${userText}\n\nرد جو:`;
  }

  static async callGeminiWithModel(session, userText, firstName, userLang, model) {
    const client = this.getClient();
    if (!client) throw new Error('NO_GEMINI_KEY');

    const timeoutMs = this.toInt(process.env.JOE_CHAT_TIMEOUT_MS, 7000, 1500, 30000);
    const maxTokens = this.toInt(process.env.JOE_CHAT_MAX_TOKENS, 220, 64, 1024);
    const temperature = this.toFloat(process.env.JOE_CHAT_TEMPERATURE, 0.4, 0.2, 0.7);
    const prompt = this.buildPrompt(session, userText, firstName, userLang);

    const response = await Promise.race([
      client.models.generateContent({
        model,
        contents: prompt,
        config: { temperature, maxOutputTokens: maxTokens }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('JOE_TIMEOUT')), timeoutMs))
    ]);

    return this.cleanOutput(response?.text || '');
  }

  static async callFreeFallback(session, userText, firstName, userLang) {
    const endpoint = String(process.env.JOE_FREE_CHAT_ENDPOINT || 'https://text.pollinations.ai').trim().replace(/\/+$/, '');
    const model = String(process.env.JOE_FREE_CHAT_MODEL || 'openai-large').trim();
    const timeoutMs = this.toInt(process.env.JOE_FREE_TIMEOUT_MS, 5000, 1000, 30000);
    const textLang = this.detectLanguage(userText, userLang);
    const langInstruction = textLang === 'ar' ? 'الرد بالعربية الفلسطينية الواضحة فقط.' : 'Reply in user language.';

    const context = session.history
      .slice(-8)
      .map((h) => `${h.role}: ${h.content}`)
      .join('\n');

    const prompt = [
      'اسمك جو.',
      langInstruction,
      'رد مختصر وواضح.',
      `المستخدم: ${firstName || 'مستخدم'}`,
      context ? `سياق:\n${context}` : '',
      `رسالة:\n${String(userText || '')}`
    ].join('\n');

    const url = `${endpoint}/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}`;
    const res = await fetch(url, {
      method: 'GET',
      timeout: timeoutMs,
      headers: { 'User-Agent': 'JoeGroupBot/1.0' }
    });

    if (!res.ok) throw new Error(`FREE_CHAT_HTTP_${res.status}`);
    return this.cleanOutput(await res.text());
  }

  static getLocalFallback(userText) {
    const t = String(userText || '').trim();
    if (!t) return 'وضح سؤالك أكثر شوي.';
    if (t.length <= 20) return 'تمام، وضحلي أكثر بجملة قصيرة.';
    return 'وصلت الفكرة. إذا بدك جواب أدق، حدد المطلوب أكثر.';
  }

  static async generate(session, userText, firstName, userLang) {
    const freeAllowed = this.isFreeFallbackAllowed();
    const freeFirst = freeAllowed && ['1', 'true', 'yes', 'on'].includes(String(process.env.JOE_USE_FREE_FIRST || 'false').toLowerCase());

    if (freeFirst) {
      try { return await this.callFreeFallback(session, userText, firstName, userLang); } catch (_) {}
      try { return await this.callGeminiWithModel(session, userText, firstName, userLang, this.getModelName()); } catch (_) {}
      return this.getLocalFallback(userText);
    }

    try { return await this.callGeminiWithModel(session, userText, firstName, userLang, this.getModelName()); } catch (_) {}
    try { return await this.callGeminiWithModel(session, userText, firstName, userLang, this.getFallbackModelName()); } catch (_) {}
    if (freeAllowed) {
      try { return await this.callFreeFallback(session, userText, firstName, userLang); } catch (_) {}
    }
    return this.getLocalFallback(userText);
  }

  static async handleAction(_ctx) {
    // no-op: custom modes/actions removed by request
  }

  static async handleGroupText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    const session = this.getSession(ctx.chat.id);
    const msg = String(text || '').trim();
    if (!msg) return false;

    if (/^(جو|جو\s*مساعدة|جو\s*menu)$/i.test(msg)) {
      await ctx.reply(
        'جو جاهز ✅\n' +
        'للاستخدام اكتب: <code>جو + سؤالك</code>',
        { parse_mode: 'HTML' }
      );
      return true;
    }

    if (!/^جو[\s,:،-]+/i.test(msg)) return false;
    const userText = msg.replace(/^جو[\s,:،-]+/i, '').trim();
    if (!userText) return false;

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
      this.pushHistory(session, 'user', userText);
      const output = await this.generate(
        session,
        userText,
        ctx.from?.first_name || '',
        ctx.from?.language_code || ''
      );
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
