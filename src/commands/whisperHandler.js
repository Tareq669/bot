const Markup = require('telegraf/markup');

const GROUP_TYPES = new Set(['group', 'supergroup']);
const WHISPER_TTL_MS = 60 * 60 * 1000;
const WHISPER_MAX_LENGTH = 180;

class WhisperHandler {
  static whispers = new Map();

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static normalizeUsername(value) {
    return String(value || '').replace(/^@/, '').trim().toLowerCase();
  }

  static cleanupExpired() {
    const now = Date.now();
    for (const [id, item] of this.whispers.entries()) {
      if (!item || (now - Number(item.createdAt || 0)) > WHISPER_TTL_MS) {
        this.whispers.delete(id);
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

  static parseWhisperInput(ctx) {
    const text = String(ctx?.message?.text || '').trim();
    const parts = text.split(/\s+/);
    if (parts.length < 2) return { target: null, body: '' };

    const byReply = ctx?.message?.reply_to_message?.from;
    if (byReply && !byReply.is_bot) {
      const body = parts.slice(1).join(' ').trim();
      return {
        target: {
          id: Number(byReply.id),
          username: this.normalizeUsername(byReply.username || ''),
          label: byReply.first_name || byReply.username || String(byReply.id)
        },
        body
      };
    }

    const mentionTarget = this.extractMentionTarget(ctx);
    if (mentionTarget) {
      let body = text;
      if (mentionTarget.username) {
        const mentionRaw = `@${mentionTarget.username}`;
        body = body.replace(mentionRaw, ' ');
      }
      body = body.replace(/^(?:\/whisper|همس[هة])\s+/i, '').trim();
      return { target: mentionTarget, body };
    }

    const possible = String(parts[1] || '').trim();
    if (possible.startsWith('@')) {
      const username = this.normalizeUsername(possible);
      return {
        target: username ? { id: null, username, label: `@${username}` } : null,
        body: parts.slice(2).join(' ').trim()
      };
    }

    return { target: null, body: '' };
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

  static async handleWhisperCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    this.cleanupExpired();

    const parsed = this.parseWhisperInput(ctx);
    const target = parsed.target;
    const body = String(parsed.body || '').trim();

    if (!target) {
      return ctx.reply(
        '❌ الصيغة:\n' +
        'همسه @user النص\n' +
        'أو بالرد: همسه النص\n' +
        'أو: /whisper @user النص'
      );
    }

    if (!body) {
      return ctx.reply('❌ اكتب نص الهمسة بعد تحديد الشخص.');
    }

    if (body.length > WHISPER_MAX_LENGTH) {
      return ctx.reply(`❌ نص الهمسة طويل. الحد الأقصى ${WHISPER_MAX_LENGTH} حرف.`);
    }

    if (Number(target.id || 0) && Number(target.id) === Number(ctx.from?.id || 0)) {
      return ctx.reply('❌ لا يمكنك إرسال همسة لنفسك.');
    }

    if (!target.id && !target.username) {
      return ctx.reply('❌ تعذر تحديد الشخص المقصود. استخدم الرد أو @username واضح.');
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
      body,
      createdAt: Date.now()
    });

    const targetText = target.id
      ? `<a href="tg://user?id=${Number(target.id)}">${target.label}</a>`
      : `<b>@${this.normalizeUsername(target.username || '')}</b>`;

    return ctx.reply(
      `🔒 <b>همسة جديدة</b>\n` +
      `من: <b>${ctx.from?.first_name || ctx.from?.username || 'عضو'}</b>\n` +
      `إلى: ${targetText}\n\n` +
      'اضغط الزر لفتح الهمسة.',
      {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔐 فتح الهمسة', `group:whisper:open:${id}`)]
        ]).reply_markup
      }
    );
  }

  static async handleWhisperOpen(ctx, whisperId) {
    if (!this.isGroupChat(ctx)) return;
    this.cleanupExpired();

    const whisper = this.whispers.get(String(whisperId || ''));
    if (!whisper) {
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
