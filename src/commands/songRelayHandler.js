const axios = require('axios');
const { logger } = require('../utils/helpers');

class SongRelayHandler {
  static MEDIA_API_BASE_URL = String(process.env.MEDIA_API_BASE_URL || '').trim().replace(/\/+$/, '');
  static MEDIA_API_TOKEN = String(process.env.MEDIA_API_TOKEN || '').trim();
  static MEDIA_API_TIMEOUT_MS = Math.max(5000, Number(process.env.MEDIA_API_TIMEOUT_MS || 120000));

  static isConfigured() {
    return Boolean(this.MEDIA_API_BASE_URL);
  }

  static parseQueryFromText(text = '') {
    const raw = String(text || '').trim();
    return raw.replace(/^\/song(?:@\w+)?\s*/i, '').trim();
  }

  static async callMediaApi(query) {
    const headers = {};
    if (this.MEDIA_API_TOKEN) headers['x-media-token'] = this.MEDIA_API_TOKEN;
    const { data } = await axios.get(`${this.MEDIA_API_BASE_URL}/search`, {
      params: { q: query },
      headers,
      timeout: this.MEDIA_API_TIMEOUT_MS
    });
    return data || {};
  }

  static async handleSongCommand(ctx) {
    const query = this.parseQueryFromText(ctx.message?.text || '');
    if (!query) {
      return ctx.reply('❌ الصيغة:\n/song اسم الأغنية');
    }

    if (!this.isConfigured()) {
      return ctx.reply('ℹ️ خدمة الأغاني الخارجية غير مفعلة. اضبط MEDIA_API_BASE_URL أولاً.');
    }

    const waitMsg = await ctx.reply('🎧 جاري البحث والتحضير...');
    try {
      const result = await this.callMediaApi(query);
      const fileUrl = String(result?.fileUrl || '').trim();
      if (!fileUrl) {
        await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
        return ctx.reply('❌ ما قدرت أوفر ملف الأغنية حالياً.');
      }

      const title = String(result?.title || query).slice(0, 120).trim() || 'مقطع صوتي';
      await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      return ctx.replyWithAudio(
        { url: fileUrl },
        {
          title,
          caption: '♪ تم التحميل بنجاح ♪',
          reply_to_message_id: ctx.message?.message_id
        }
      );
    } catch (error) {
      logger.warn(`SONG_RELAY_FAILED query="${query}" message="${error?.message || 'unknown'}"`);
      await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      return ctx.reply('❌ فشل جلب الأغنية حالياً. جرّب بعد شوي.');
    }
  }
}

module.exports = SongRelayHandler;
