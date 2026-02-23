const Markup = require('telegraf/markup');

class SponsoredAdsSystem {
  static runtimeState = new Map();

  static adCache = { ad: null, at: 0 };

  static escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static getConfig() {
    const enabledRaw = String(process.env.ADS_AUTO_ENABLED || 'false').trim().toLowerCase();
    const enabled = ['1', 'true', 'on', 'yes'].includes(enabledRaw);

    return {
      enabled,
      frequency: Math.max(4, Math.min(40, parseInt(process.env.ADS_FREQUENCY_MESSAGES || '8', 10) || 8)),
      cooldownMs:
        Math.max(60, Math.min(3600, parseInt(process.env.ADS_COOLDOWN_SECONDS || '600', 10) || 600)) * 1000,
      provider: String(process.env.ADS_PROVIDER || 'adsgram').trim().toLowerCase(),
      adsgramToken: String(process.env.ADSGRAM_TOKEN || '').trim(),
      adsgramBlockId: String(process.env.ADSGRAM_BLOCK_ID || '').trim(),
      cacheMs: Math.max(10, Math.min(600, parseInt(process.env.ADS_CACHE_SECONDS || '60', 10) || 60)) * 1000
    };
  }

  static shouldShowAd(ctx) {
    const isPrivate = ctx.chat?.type === 'private';
    const text = String(ctx.message?.text || '').trim();
    if (!isPrivate || !text) return false;
    if (text.startsWith('/')) return false;
    return true;
  }

  static runtimeForUser(userId) {
    if (!this.runtimeState.has(userId)) {
      this.runtimeState.set(userId, { count: 0, lastShownAt: 0 });
    }
    return this.runtimeState.get(userId);
  }

  static async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  static async fetchAdsGramAd(cfg, userId) {
    if (!cfg.adsgramToken || !cfg.adsgramBlockId) {
      return null;
    }

    const now = Date.now();
    if (this.adCache.ad && now - this.adCache.at < cfg.cacheMs) {
      return this.adCache.ad;
    }

    const apiUrl = `https://api.adsgram.ai/adv?block_id=${encodeURIComponent(cfg.adsgramBlockId)}&tg_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(cfg.adsgramToken)}`;
    const response = await this.fetchWithTimeout(apiUrl, { method: 'GET' }, 6000);
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || !data.banner || !data.banner.trackings || !data.banner.trackings.click_url) return null;

    const ad = {
      title: data.banner.title || 'إعلان',
      text: data.banner.description || 'محتوى ممول',
      cta: data.banner.button || 'فتح',
      clickUrl: data.banner.trackings.click_url
    };
    this.adCache = { ad, at: now };
    return ad;
  }

  static async getAd(cfg, userId) {
    if (cfg.provider === 'adsgram') {
      return this.fetchAdsGramAd(cfg, userId);
    }
    return null;
  }

  static async maybeShowAd(ctx) {
    try {
      const cfg = this.getConfig();
      if (!cfg.enabled) return;
      if (!this.shouldShowAd(ctx)) return;
      const userId = Number(ctx.from?.id || 0);
      if (!userId) return;

      const rt = this.runtimeForUser(userId);
      rt.count += 1;
      const now = Date.now();
      if (rt.count < cfg.frequency) return;
      if (now - rt.lastShownAt < cfg.cooldownMs) return;

      const ad = await this.getAd(cfg, userId);
      if (!ad?.clickUrl) return;

      rt.count = 0;
      rt.lastShownAt = now;

      const message =
        '📢 <b>إعلان</b>\n\n' +
        `🧾 <b>${this.escapeHtml(ad.title)}</b>\n` +
        `${this.escapeHtml(ad.text)}`;

      const keyboard = Markup.inlineKeyboard([[Markup.button.url(ad.cta || 'فتح الإعلان', ad.clickUrl)]]);
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup,
        disable_web_page_preview: true
      });
    } catch (_error) {
      // Never break bot flow because of ads.
    }
  }
}

module.exports = SponsoredAdsSystem;
