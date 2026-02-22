const axios = require('axios');
const Markup = require('telegraf/markup');

class JoeChatHandler {
  static sessions = new Map();

  static modes = {
    fun: { label: 'Fun', line: 'Be playful, friendly, and light.' },
    funny: { label: 'Funny', line: 'Prioritize humor and witty responses without insults.' },
    plus18: { label: '18+ Safe', line: 'Adult tone only, but no explicit sexual content.' },
    helper: { label: 'Helper', line: 'Give practical and structured help.' },
    tech: { label: 'Tech', line: 'Focus on technical accuracy and clear steps.' },
    creative: { label: 'Creative', line: 'Give creative ideas and fresh angles.' },
    short: { label: 'Short', line: 'Keep answers very concise.' }
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

  static looksCorruptedText(text) {
    const t = String(text || '');
    if (!t) return true;
    if (/[ÃØÙÐ]/.test(t)) return true;
    if (/\uFFFD/.test(t) || t.includes('?')) return true;

    const letters = (t.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
    const arabic = (t.match(/[\u0600-\u06FF]/g) || []).length;
    if (letters > 20 && arabic / letters < 0.12) return true;

    return false;
  }

  static buildSystemPrompt(mode = 'fun') {
    const modeCfg = this.modes[mode] || this.modes.fun;
    return [
      'Your name is Joe (Arabic: \"??\").',
      'Always reply in clear Arabic.',
      'Preferred style: light Palestinian dialect, readable and natural.',
      'No hate, harassment, explicit sexual content, or illegal guidance.',
      modeCfg.line,
      'Default response length: 2-6 short lines unless user asks for detail.',
      'If technical question: answer with actionable steps.'
    ].join(' ');
  }

  static buildModeKeyboard(currentMode = 'fun') {
    const mk = (id) => {
      const label = this.modes[id]?.label || id;
      const prefix = currentMode === id ? '? ' : '';
      return Markup.button.callback(`${prefix}${label}`, `joe:mode:${id}`);
    };
    return Markup.inlineKeyboard([
      [mk('fun'), mk('funny')],
      [mk('plus18'), mk('helper')],
      [mk('tech'), mk('creative')],
      [mk('short')],
      [Markup.button.callback('Clear Memory', 'joe:clear'), Markup.button.callback('Stop Joe', 'joe:stop')]
    ]);
  }

  static buildChatControls() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('Change Mode', 'joe:open'), Markup.button.callback('Random Reply', 'joe:random')],
      [Markup.button.callback('Clear Memory', 'joe:clear'), Markup.button.callback('Stop Joe', 'joe:stop')]
    ]);
  }

  static async callHfChat(messages, temperature = 0.75) {
    const model = process.env.HF_CHAT_MODEL || 'zai-org/GLM-4.7-Flash';
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens: 340
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

  static async callHfFallback(messages, temperature = 0.7) {
    const model = process.env.HF_CHAT_FALLBACK_MODEL || 'openai/gpt-oss-120b';
    const prompt = messages
      .map((m) => `${m.role === 'system' ? 'System' : m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
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

  static async generate(session, userText, temperature = 0.75) {
    const messages = [
      { role: 'system', content: this.buildSystemPrompt(session.mode) },
      ...session.history.slice(-14),
      { role: 'user', content: String(userText || '') }
    ];

    let out;
    try {
      out = await this.callHfChat(messages, temperature);
    } catch (_error) {
      out = await this.callHfFallback(messages, temperature);
    }

    if (!this.looksCorruptedText(out)) return out;

    const repairMessages = [
      ...messages,
      {
        role: 'user',
        content: 'Rewrite your last answer in clear Arabic only. No broken characters. Keep it natural and short.'
      }
    ];

    try {
      const fixed = await this.callHfChat(repairMessages, 0.4);
      if (!this.looksCorruptedText(fixed)) return fixed;
    } catch (_error) {
      // ignore and fallback below
    }

    return '??? ????? ????? ????? ???????. ???? ????? ??? ????? ???? ????.';
  }

  static async handleStart(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = true;
    if (!this.modes[session.mode]) session.mode = 'fun';
    return ctx.reply(
      'Joe is on. ????? ????? ?????? ???? ??? ??????.',
      {
        reply_markup: this.buildModeKeyboard(session.mode).reply_markup
      }
    );
  }

  static async handleStop(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.active = false;
    return ctx.reply('?? ????? Joe. ???? ?? ???? ??? Joe ?? /jo');
  }

  static async handleClear(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const session = this.getSession(ctx.from.id);
    session.history = [];
    return ctx.reply('?? ??? ????? Joe.');
  }

  static async handleModeCommand(ctx) {
    if (ctx.chat?.type !== 'private') return;
    const text = String(ctx.message?.text || '').trim();
    const mode = String(text.split(/\s+/)[1] || '').toLowerCase();
    if (!mode || !this.modes[mode]) {
      return ctx.reply('Use: /jomode fun|funny|plus18|helper|tech|creative|short');
    }
    const session = this.getSession(ctx.from.id);
    session.mode = mode;
    session.active = true;
    return ctx.reply(`Mode: ${this.modes[mode].label}`, {
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
      await ctx.answerCbQuery('Ready', { show_alert: false }).catch(() => {});
      return ctx.editMessageReplyMarkup(this.buildModeKeyboard(session.mode).reply_markup).catch(() => {});
    }

    if (action === 'mode') {
      if (!this.modes[arg]) {
        return ctx.answerCbQuery('Unknown mode', { show_alert: false }).catch(() => {});
      }
      session.mode = arg;
      session.active = true;
      await ctx.answerCbQuery(`Mode: ${this.modes[arg].label}`, { show_alert: false }).catch(() => {});
      return ctx.editMessageReplyMarkup(this.buildModeKeyboard(session.mode).reply_markup).catch(() => {});
    }

    if (action === 'clear') {
      session.history = [];
      await ctx.answerCbQuery('Memory cleared', { show_alert: false }).catch(() => {});
      return ctx.reply('?? ??? ???????.');
    }

    if (action === 'stop') {
      session.active = false;
      await ctx.answerCbQuery('Stopped', { show_alert: false }).catch(() => {});
      return ctx.reply('?? ????? Joe.');
    }

    if (action === 'random') {
      session.active = true;
      await ctx.answerCbQuery('Working...', { show_alert: false }).catch(() => {});
      try {
        const prompt = 'Give one short funny Arabic reply in Palestinian style.';
        this.pushHistory(session, 'user', prompt);
        const out = await this.generate(session, prompt, 0.95);
        this.pushHistory(session, 'assistant', out);
        return ctx.reply(out);
      } catch (_error) {
        return ctx.reply('??? ??? ????? ??? ??? ?????.');
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
      await ctx.reply('??????? ????? ???. ???? ?? ????.');
      return true;
    }

    const now = Date.now();
    if (now - (session.lastReplyAt || 0) < 1200) {
      await ctx.reply('???? ??? :)');
      return true;
    }
    session.lastReplyAt = now;

    try {
      await ctx.sendChatAction('typing').catch(() => {});
      this.pushHistory(session, 'user', msg);
      const out = await this.generate(session, msg, session.mode === 'funny' ? 0.95 : 0.75);
      this.pushHistory(session, 'assistant', out);
      await ctx.reply(out || '?? ??? ?? ??????? ??? ??? ?????.');
    } catch (_error) {
      await ctx.reply('Joe ????? ???. ??? ??? ????.');
    }
    return true;
  }
}

module.exports = JoeChatHandler;


