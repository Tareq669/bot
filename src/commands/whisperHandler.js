const Markup = require('telegraf/markup');

const GROUP_TYPES = new Set(['group', 'supergroup']);
const WHISPER_TTL_MS = 60 * 60 * 1000;
const WHISPER_MAX_LENGTH = 180;

class WhisperHandler {
  static whispers = new Map();

  static pendingCompose = new Map();

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static normalizeUsername(value) {
    return String(value || '').replace(/^@/, '').trim().toLowerCase();
  }

  static mentionText(target) {
    if (!target) return 'غير معروف';
    if (target.id) {
      const label = String(target.label || target.username || target.id);
      return `<a href="tg://user?id=${Number(target.id)}">${this.escapeHtml(label)}</a>`;
    }
    const uname = this.normalizeUsername(target.username || '');
    return uname ? `<b>@${this.escapeHtml(uname)}</b>` : 'غير معروف';
  }

  static escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static cleanupExpired() {
    const now = Date.now();
    for (const [id, item] of this.whispers.entries()) {
      if (!item || (now - Number(item.createdAt || 0)) > WHISPER_TTL_MS) {
        this.whispers.delete(id);
      }
    }
    for (const [k, item] of this.pendingCompose.entries()) {
      if (!item || (now - Number(item.createdAt || 0)) > WHISPER_TTL_MS) {
        this.pendingCompose.delete(k);
      }
    }
  }

  static extractMentionTarget(ctx) {
    const entities = Array.isArray(ctx?.message?.entities) ? ctx.message.entities : [];
    const text = String(ctx?.message?.text || '');

    for (const entity of entities) {
      if (entity?.type === 'text_mention' && entity.user?.id) {
        return {
          id: Number(entity.user.id),
          username: this.normalizeUsername(entity.user.username || ''),
          label: entity.user.first_name || entity.user.username || String(entity.user.id)
        };
      }
      if (entity?.type === 'mention') {
        const raw = text.slice(entity.offset, entity.offset + entity.length);
        const username = this.normalizeUsername(raw);
        if (username) {
          return { id: null, username, label: `@${username}` };
        }
      }
    }
    return null;
  }

  static parseTargetOnly(ctx) {
    const text = String(ctx?.message?.text || '').trim();
    const parts = text.split(/\s+/);

    const byReply = ctx?.message?.reply_to_message?.from;
    if (byReply && !byReply.is_bot) {
      return {
        id: Number(byReply.id),
        username: this.normalizeUsername(byReply.username || ''),
        label: byReply.first_name || byReply.username || String(byReply.id)
      };
    }

    if (parts.length < 2) return null;

    const mentionTarget = this.extractMentionTarget(ctx);
    if (mentionTarget) return mentionTarget;

    const second = String(parts[1] || '').trim();
    if (second.startsWith('@')) {
      const username = this.normalizeUsername(second);
      if (!username) return null;
      return { id: null, username, label: `@${username}` };
    }

    return null;
  }

  static canOpenWhisper(whisper, user) {
    if (!whisper || !user) return false;
    const userId = Number(user.id || 0);
    const username = this.normalizeUsername(user.username || '');

    if (userId && userId === Number(whisper.senderId || 0)) return true;
    if (userId && Number(whisper.targetId || 0) && userId === Number(whisper.targetId || 0)) return true;
    if (!whisper.targetId && whisper.targetUsername && username && username === whisper.targetUsername) return true;
    return false;
  }

  static composeKey(chatId, userId) {
    return `${Number(chatId || 0)}:${Number(userId || 0)}`;
  }

  static async handleWhisperCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    this.cleanupExpired();

    const target = this.parseTargetOnly(ctx);
    if (!target) {
      return ctx.reply(
        '❌ الصيغة:\n' +
        'همسه @user\n' +
        'أو بالرد: همسه\n' +
        'أو: /whisper @user'
      );
    }

    if (Number(target.id || 0) && Number(target.id) === Number(ctx.from?.id || 0)) {
      return ctx.reply('❌ لا يمكنك إرسال همسة لنفسك.');
    }

    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    this.whispers.set(id, {
      id,
      chatId: Number(ctx.chat.id),
      senderId: Number(ctx.from?.id || 0),
      senderName: ctx.from?.first_name || ctx.from?.username || 'عضو',
      targetId: target.id ? Number(target.id) : null,
      targetUsername: target.id ? '' : this.normalizeUsername(target.username || ''),
      targetLabel: target.label || (target.username ? `@${target.username}` : 'عضو'),
      body: '',
      status: 'draft',
      createdAt: Date.now()
    });

    const targetText = this.mentionText(target);

    return ctx.reply(
      `• تم تحديد الهمسه لـ ↤︎ ${targetText}\n` +
      '• اضغط الزر لكتابة الهمسة\n' +
      '-',
      {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('✍️ اهمس هنا', `group:whisper:compose:${id}`)]
        ]).reply_markup
      }
    );
  }

  static async handleWhisperCompose(ctx, whisperId) {
    if (!this.isGroupChat(ctx)) return;
    this.cleanupExpired();

    const whisper = this.whispers.get(String(whisperId || ''));
    if (!whisper) {
      return ctx.answerCbQuery('❌ الهمسة منتهية أو غير موجودة.', { show_alert: true }).catch(() => {});
    }

    if (Number(whisper.chatId || 0) !== Number(ctx.chat?.id || 0)) {
      return ctx.answerCbQuery('❌ هذه الهمسة ليست لهذا الجروب.', { show_alert: true }).catch(() => {});
    }

    if (Number(ctx.from?.id || 0) !== Number(whisper.senderId || 0)) {
      return ctx.answerCbQuery('❌ فقط المرسل يكتب نص الهمسة.', { show_alert: true }).catch(() => {});
    }

    const key = this.composeKey(ctx.chat?.id, ctx.from?.id);
    this.pendingCompose.set(key, {
      whisperId: whisper.id,
      createdAt: Date.now()
    });

    await ctx.answerCbQuery('✅ اكتب نص الهمسة الآن برسالة واحدة.').catch(() => {});
    return ctx.reply('📝 اكتب الآن نص الهمسة في رسالة واحدة.', {
      reply_to_message_id: ctx.callbackQuery?.message?.message_id
    });
  }

  static async handlePotentialComposeText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    this.cleanupExpired();
    const composedMessageId = ctx?.message?.message_id;

    const key = this.composeKey(ctx.chat?.id, ctx.from?.id);
    const pending = this.pendingCompose.get(key);
    if (!pending) return false;

    const whisper = this.whispers.get(String(pending.whisperId || ''));
    if (!whisper || Number(whisper.senderId || 0) !== Number(ctx.from?.id || 0)) {
      this.pendingCompose.delete(key);
      return false;
    }

    const body = String(ctx.message?.text || '').trim();
    if (!body) {
      if (composedMessageId) {
        await ctx.deleteMessage(composedMessageId).catch(() => {});
      }
      return ctx.reply('❌ اكتب نص واضح للهمسة.');
    }
    if (body.length > WHISPER_MAX_LENGTH) {
      if (composedMessageId) {
        await ctx.deleteMessage(composedMessageId).catch(() => {});
      }
      return ctx.reply(`❌ نص الهمسة طويل. الحد الأقصى ${WHISPER_MAX_LENGTH} حرف.`);
    }

    whisper.body = body;
    whisper.status = 'ready';
    this.whispers.set(whisper.id, whisper);
    this.pendingCompose.delete(key);

    const targetText = whisper.targetId
      ? `<a href="tg://user?id=${Number(whisper.targetId)}">${this.escapeHtml(whisper.targetLabel)}</a>`
      : `<b>@${this.escapeHtml(whisper.targetUsername || '')}</b>`;
    const senderText = `<a href="tg://user?id=${Number(whisper.senderId)}">${this.escapeHtml(whisper.senderName || 'عضو')}</a>`;

    await ctx.reply(
      `• الهمسه لـ ↤︎ ${targetText}\n` +
      `• من ↤︎ ${senderText}\n` +
      '-',
      {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔐 فتح الهمسة', `group:whisper:open:${whisper.id}`)]
        ]).reply_markup
      }
    );
    if (composedMessageId) {
      await ctx.deleteMessage(composedMessageId).catch(() => {});
    }
    return true;
  }

  static async handleWhisperOpen(ctx, whisperId) {
    if (!this.isGroupChat(ctx)) return;
    this.cleanupExpired();

    const whisper = this.whispers.get(String(whisperId || ''));
    if (!whisper || !whisper.body) {
      return ctx.answerCbQuery('❌ الهمسة منتهية أو غير موجودة.', { show_alert: true }).catch(() => {});
    }

    if (Number(whisper.chatId || 0) !== Number(ctx.chat?.id || 0)) {
      return ctx.answerCbQuery('❌ هذه الهمسة ليست لهذا الجروب.', { show_alert: true }).catch(() => {});
    }

    if (!this.canOpenWhisper(whisper, ctx.from)) {
      return ctx.answerCbQuery('❌ هذه الهمسة ليست لك.', { show_alert: true }).catch(() => {});
    }

    return ctx.answerCbQuery(`💌 ${whisper.body}`, { show_alert: true }).catch(() => {});
  }
}

module.exports = WhisperHandler;
