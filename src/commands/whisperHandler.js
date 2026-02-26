const Markup = require('telegraf/markup');

const GROUP_TYPES = new Set(['group', 'supergroup']);
const WHISPER_TTL_MS = 60 * 60 * 1000;
const WHISPER_MAX_LENGTH = 180;

class WhisperHandler {
  static whispers = new Map();

  static pendingPrivateCompose = new Map();

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static isPrivateChat(ctx) {
    return ctx?.chat?.type === 'private';
  }

  static normalizeUsername(value) {
    return String(value || '').replace(/^@/, '').trim().toLowerCase();
  }

  static escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  static cleanupExpired() {
    const now = Date.now();
    for (const [id, item] of this.whispers.entries()) {
      if (!item || (now - Number(item.createdAt || 0)) > WHISPER_TTL_MS) {
        this.whispers.delete(id);
      }
    }
    for (const [uid, pending] of this.pendingPrivateCompose.entries()) {
      const whisper = this.whispers.get(String(pending?.whisperId || ''));
      if (!pending || !whisper || (now - Number(pending.createdAt || 0)) > WHISPER_TTL_MS) {
        this.pendingPrivateCompose.delete(uid);
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
        if (username) return { id: null, username, label: `@${username}` };
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

  static buildPrivateLink(botUsername, whisperId) {
    return `https://t.me/${botUsername}?start=whisper_${encodeURIComponent(whisperId)}`;
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

    const botUsername = String(ctx.botInfo?.username || '').trim();
    if (!botUsername) {
      return ctx.reply('❌ تعذر معرفة معرف البوت، حاول مرة ثانية.');
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
    const privateLink = this.buildPrivateLink(botUsername, id);

    return ctx.reply(
      `• تم تحديد الهمسه لـ ↤︎ ${targetText}\n` +
      '• اضغط الزر لكتابة الهمسة\n' +
      '-',
      {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('✍️ اهمس هنا', privateLink)]
        ]).reply_markup
      }
    );
  }

  static async handlePrivateStart(ctx, payload) {
    if (!this.isPrivateChat(ctx)) return false;
    this.cleanupExpired();

    const p = String(payload || '').trim();
    const match = /^whisper_([a-z0-9]+)$/i.exec(p);
    if (!match) return false;

    const whisperId = match[1];
    const whisper = this.whispers.get(whisperId);
    if (!whisper) {
      await ctx.reply('❌ الهمسة منتهية أو غير موجودة.');
      return true;
    }

    if (Number(whisper.senderId || 0) !== Number(ctx.from?.id || 0)) {
      await ctx.reply('❌ هذه الهمسة ليست خاصة بك.');
      return true;
    }

    this.pendingPrivateCompose.set(Number(ctx.from.id), {
      whisperId,
      createdAt: Date.now()
    });

    await ctx.reply(
      '📝 اكتب الآن نص الهمسة هنا في الخاص.\n' +
      `• الحد الأقصى: ${WHISPER_MAX_LENGTH} حرف`
    );
    return true;
  }

  static async handlePrivateText(ctx) {
    if (!this.isPrivateChat(ctx)) return false;
    this.cleanupExpired();

    const pending = this.pendingPrivateCompose.get(Number(ctx.from?.id || 0));
    if (!pending) return false;

    const whisper = this.whispers.get(String(pending.whisperId || ''));
    if (!whisper || Number(whisper.senderId || 0) !== Number(ctx.from?.id || 0)) {
      this.pendingPrivateCompose.delete(Number(ctx.from?.id || 0));
      return false;
    }

    const body = String(ctx.message?.text || '').trim();
    if (!body) {
      await ctx.reply('❌ اكتب نص واضح للهمسة.');
      return true;
    }
    if (body.length > WHISPER_MAX_LENGTH) {
      await ctx.reply(`❌ نص الهمسة طويل. الحد الأقصى ${WHISPER_MAX_LENGTH} حرف.`);
      return true;
    }

    whisper.body = body;
    whisper.status = 'ready';
    this.whispers.set(whisper.id, whisper);
    this.pendingPrivateCompose.delete(Number(ctx.from.id));

    const targetText = whisper.targetId
      ? `<a href="tg://user?id=${Number(whisper.targetId)}">${this.escapeHtml(whisper.targetLabel)}</a>`
      : `<b>@${this.escapeHtml(whisper.targetUsername || '')}</b>`;
    const senderText = `<a href="tg://user?id=${Number(whisper.senderId)}">${this.escapeHtml(whisper.senderName || 'عضو')}</a>`;

    await ctx.telegram.sendMessage(
      Number(whisper.chatId),
      `• الهمسه لـ ↤︎ ${targetText}\n` +
      `• من ↤︎ ${senderText}\n` +
      '-',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔐 فتح الهمسة', `group:whisper:open:${whisper.id}`)]
        ]).reply_markup
      }
    ).catch(() => {});

    await ctx.reply('✅ تم إرسال الهمسة إلى الجروب.');
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
