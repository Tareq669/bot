const axios = require('axios');

class JoeChatHandler {
  static sessions = new Map();

  static getUserSession(userId) {
    const key = String(userId);
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        active: false,
        mode: 'fun',
        history: []
      });
    }
    return this.sessions.get(key);
  }

  static buildSystemPrompt(mode = 'fun') {
    let modeLine = 'خليك فوكاهي خفيف ومرح.';
    if (mode === 'helper') modeLine = 'ركز على المساعدة العملية مع لمسة خفيفة جدًا.';
    if (mode === 'balanced') modeLine = 'وازن بين الجدية والفكاهة.';

    return (
      'اسمك "جو". ' +
      'تحكي عربي بلهجة فلسطينية لطيفة ومفهومة. ' +
      'لا تستخدم أسلوب جارح أو تنمّر أو محتوى مخالف. ' +
      `${modeLine} ` +
      'جاوب باختصار غالبًا (2-6 أسطر). ' +
      'لو السؤال تقني، أعطِ خطوات واضحة. ' +
      'لا تقول إن اسمك جو فوكاهي؛ اسمك فقط جو.'
    );
  }

  static pushHistory(session, role, content) {
    session.history.push({ role, content: String(content || '').slice(0, 2000) });
    if (session.history.length > 20) {
      session.history = session.history.slice(session.history.length - 20);
    }
  }

  static async callHfChatCompletions(messages) {
    const model = process.env.HF_CHAT_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model,
        messages,
        temperature: 0.8,
        max_tokens: 350
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 35000
      }
    );

    const text = response?.data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') throw new Error('HF chat completion returned empty text');
    return text.trim();
  }

  static async callHfInferenceFallback(messages) {
    const model = process.env.HF_CHAT_FALLBACK_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
    const prompt = messages
      .map((m) => `${m.role === 'system' ? 'System' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 280,
          temperature: 0.8,
          return_full_text: false
        },
        options: { wait_for_model: true }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 35000
      }
    );

    const data = response?.data;
    if (Array.isArray(data) && typeof data[0]?.generated_text === 'string') {
      return data[0].generated_text.trim();
    }
    if (typeof data?.generated_text === 'string') {
      return data.generated_text.trim();
    }
    throw new Error('HF inference fallback returned empty text');
  }

  static async generateReply(session, userText) {
    const messages = [
      { role: 'system', content: this.buildSystemPrompt(session.mode) },
      ...session.history.slice(-12),
      { role: 'user', content: String(userText || '') }
    ];

    try {
      return await this.callHfChatCompletions(messages);
    } catch (_err) {
      return this.callHfInferenceFallback(messages);
    }
  }

  static async handleStart(ctx) {
    const s = this.getUserSession(ctx.from.id);
    s.active = true;
    if (!s.mode) s.mode = 'fun';
    return ctx.reply(
      '🤖 أهلين! أنا <b>جو</b> 😄\n' +
        'دردشة فوكاهية بلهجة فلسطينية داخل الخاص.\n\n' +
        'الأوامر:\n' +
        '• /jo تشغيل\n' +
        '• /jooff إيقاف\n' +
        '• /jomode fun|balanced|helper\n' +
        '• /joclear مسح الذاكرة',
      { parse_mode: 'HTML' }
    );
  }

  static async handleStop(ctx) {
    const s = this.getUserSession(ctx.from.id);
    s.active = false;
    return ctx.reply('✅ تم إيقاف دردشة جو.');
  }

  static async handleMode(ctx) {
    const text = String(ctx.message?.text || '').trim();
    const arg = text.split(/\s+/)[1];
    if (!arg) {
      return ctx.reply('ℹ️ الوضع الحالي: ' + this.getUserSession(ctx.from.id).mode + '\nاستخدم: /jomode fun|balanced|helper');
    }
    const mode = String(arg).toLowerCase();
    if (!['fun', 'balanced', 'helper'].includes(mode)) {
      return ctx.reply('❌ وضع غير صالح. الخيارات: fun | balanced | helper');
    }
    const s = this.getUserSession(ctx.from.id);
    s.mode = mode;
    s.active = true;
    return ctx.reply(`✅ تم تغيير وضع جو إلى: ${mode}`);
  }

  static async handleClear(ctx) {
    const s = this.getUserSession(ctx.from.id);
    s.history = [];
    return ctx.reply('🧹 تم مسح ذاكرة جو لهذه الجلسة.');
  }

  static async handlePrivateText(ctx, text) {
    if (ctx.chat?.type !== 'private') return false;
    const s = this.getUserSession(ctx.from.id);
    if (!s.active) return false;

    const userText = String(text || '').trim();
    if (!userText || userText.startsWith('/')) return false;

    // Basic anti-spam guard for very long prompts.
    if (userText.length > 1800) {
      await ctx.reply('🧠 خفّفلي النص شوي يا زلمة 😅\nابعت رسالة أقصر من 1800 حرف.');
      return true;
    }

    try {
      await ctx.sendChatAction('typing').catch(() => {});
      this.pushHistory(s, 'user', userText);
      const reply = await this.generateReply(s, userText);
      this.pushHistory(s, 'assistant', reply);
      await ctx.reply(reply || 'مش قادر أرد هلأ، جرّب بعد شوي 🙏');
    } catch (_error) {
      await ctx.reply('⚠️ جو معلّق شوي هسه. جرّب كمان مرة بعد لحظة.');
    }
    return true;
  }
}

module.exports = JoeChatHandler;

