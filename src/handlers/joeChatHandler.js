const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();

  static modes = {
    fun: { label: '🎭 فوكاهي', line: 'خليك فوكاهي لطيف وردودك مرحة وخفيفة.' },
    funny: { label: '😂 مضحك', line: 'ركز على النكتة والتعليقات الطريفة بدون إساءة.' },
    plus18: { label: '🔞 18+', line: 'اسلوب للكبار وناضج فقط، بدون محتوى جنسي صريح أو مخالف.' },
    helper: { label: '🧠 مساعد', line: 'ردود عملية واضحة وخطوات مباشرة.' },
    tech: { label: '💻 تقني', line: 'حلول تقنية دقيقة مع أمثلة قصيرة.' },
    creative: { label: '🧪 مبدع', line: 'اقتراحات وأفكار مبتكرة مع لمسة ممتعة.' },
    short: { label: '⚡ سريع', line: 'اختصر جدا واجب في سطرين إلى أربعة.' }
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
    session.history.push({ role, content: String(content || '').slice(0, 2200) });
    if (session.history.length > 24) {
      session.history = session.history.slice(session.history.length - 24);
    }
  }

  static buildSystemPrompt(mode = 'fun') {
    const modeCfg = this.modes[mode] || this.modes.fun;
    return [
      'اسمك "جو" فقط.',
      'تحكي عربي بلهجة فلسطينية لطيفة ومفهومة.',
      'ممنوع خطاب الكراهية او الاهانة او التحرش او المحتوى الجنسي الصريح.',
      'لو المستخدم طلب شيء مخالف، ارفض بلطف واقترح بديل آمن.',
      modeCfg.line,
      'الافضل تكون الاجابة مختصرة (2-6 سطور) الا اذا طلب المستخدم تفصيل.',
      'لو السؤال تقني: جاوب بنقاط عملية واضحة.',
      'لا تقل ان اسمك "جو فوكاهي"، اسمك فقط "جو".'
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

  static buildChatControls() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🎛️ تغيير النمط', 'joe:open'), Markup.button.callback('🎲 رد عشوائي', 'joe:random')],
      [Markup.button.callback('🧹 مسح الذاكرة', 'joe:clear'), Markup.button.callback('⏹️ إيقاف جو', 'joe:stop')]
    ]);
  }

  static async callHfChat(messages, temperature = 0.8) {
    const model = process.env.HF_CHAT_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens: 360
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 40000
      }
    );
    const out = response?.data?.choices?.[0]?.message?.content;
    if (!out || typeof out !== 'string') throw new Error('HF chat empty response');
    return out.trim();
  }

  static async callHfFallback(messages, temperature = 0.8) {
    const model = process.env.HF_CHAT_FALLBACK_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
    const prompt = messages
      .map((m) => `${m.role === 'system' ? 'System' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 320,
          temperature,
          return_full_text: false
        },
        options: { wait_for_model: true }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 40000
      }
    );

    const data = response?.data;
    if (Array.isArray(data) && typeof data[0]?.generated_text === 'string') return data[0].generated_text.trim();
    if (typeof data?.generated_text === 'string') return data.generated_text.trim();
    throw new Error('HF fallback empty response');
  }

  static async generate(session, userText, temperature = 0.8) {
    const messages = [
      { role: 'system', content: this.buildSystemPrompt(session.mode) },
      ...session.history.slice(-14),
      { role: 'user', content: String(userText || '') }
    ];
    try {
      return await this.callHfChat(messages, temperature);
    } catch (_error) {
      return this.callHfFallback(messages, temperature);
    }
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';
    return ctx.reply(
      `🤖 هلا! أنا <b>جو</b>\n` +
        `اختر النمط اللي بناسبك وابعثلي عادي.\n` +
        `النمط الحالي: <b>${this.modes[session.mode].label}</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: this.buildModeKeyboard(session.mode).reply_markup
      }
    );
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    return ctx.reply('✅ تم إيقاف جو. إذا بدك ترجّعه اكتب /jo أو اضغط Joe من القائمة.');
  }

  static async handleClear(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.history = [];
    return ctx.reply('🧹 تمام، مسحت ذاكرة جو.');
  }

  static async handleModeCommand(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const text = String(ctx.message?.text || '').trim();
    const mode = String(text.split(/\s+/)[1] || '').toLowerCase();
    if (!mode || !this.modes[mode]) {
      return ctx.reply('🎛️ استخدم: /jomode fun|funny|plus18|helper|tech|creative|short');
    }
    const session = this.getSession(ctx.from.id);
    session.mode = mode;
    session.active = true;
    return ctx.reply(`✅ تم تحويل النمط إلى: ${this.modes[mode].label}`, {
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
      await ctx.answerCbQuery('جاهز يا بطل ✅', { show_alert: false }).catch(() => {});
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
      return ctx.reply('🧹 تم مسح ذاكرة جو.', { reply_markup: this.buildChatControls().reply_markup });
    }

    if (action === 'stop') {
      session.active = false;
      await ctx.answerCbQuery('تم الإيقاف', { show_alert: false }).catch(() => {});
      return ctx.reply('⏹️ تم إيقاف جو. للرجوع اضغط Joe مرة ثانية.');
    }

    if (action === 'random') {
      session.active = true;
      await ctx.answerCbQuery('لحظة... 🎲', { show_alert: false }).catch(() => {});
      try {
        const prompt = 'اعطيني رد خفيف وعفوي وجملة مضحكة قصيرة.';
        this.pushHistory(session, 'user', prompt);
        const out = await this.generate(session, prompt, 0.95);
        this.pushHistory(session, 'assistant', out);
        return ctx.reply(out, { reply_markup: this.buildChatControls().reply_markup });
      } catch (_error) {
        return ctx.reply('⚠️ ما زبطت هالمرة، جرّب كمان مرة.');
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
      await ctx.reply('✂️ طول الرسالة كبير. ابعت أقل من 1800 حرف.', {
        reply_markup: this.buildChatControls().reply_markup
      });
      return true;
    }

    const now = Date.now();
    if (now - (session.lastReplyAt || 0) < 1200) {
      await ctx.reply('⏳ شوي شوي عليّ يا غالي.', {
        reply_markup: this.buildChatControls().reply_markup
      });
      return true;
    }
    session.lastReplyAt = now;

    try {
      await ctx.sendChatAction('typing').catch(() => {});
      this.pushHistory(session, 'user', msg);
      const out = await this.generate(session, msg, session.mode === 'funny' ? 0.95 : 0.8);
      this.pushHistory(session, 'assistant', out);
      await ctx.reply(out || 'ما طلع معي رد هالمرة 😅', {
        reply_markup: this.buildChatControls().reply_markup
      });
    } catch (_error) {
      await ctx.reply('⚠️ جو مشغول شوي. جرّب بعد لحظة.', {
        reply_markup: this.buildChatControls().reply_markup
      });
    }
    return true;
  }
}

module.exports = JoeChatHandler;

