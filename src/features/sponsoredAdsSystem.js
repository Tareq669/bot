const Markup = require('telegraf/markup');

class SponsoredAdsSystem {
  static runtimeState = new Map();

  static adCache = { ad: null, at: 0 };

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
      cacheMs: Math.max(10, Math.min(600, parseInt(process.env.ADS_CACHE_SECONDS || '60', 10) || 60)) * 1000,
      language: String(process.env.ADS_LANGUAGE || 'ar').trim()
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
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  static parseNumericBlockId(blockId) {
    const raw = String(blockId || '').trim();
    const stripped = raw.replace(/^bot-/i, '');
    return /^\d+$/.test(stripped) ? stripped : null;
  }

  static async fetchAdsGramAd(cfg, userId) {
    if (!cfg.adsgramToken || !cfg.adsgramBlockId) return null;

    const now = Date.now();
    if (this.adCache.ad && now - this.adCache.at < cfg.cacheMs) {
      return this.adCache.ad;
    }

    const numericBlockId = this.parseNumericBlockId(cfg.adsgramBlockId);
    if (!numericBlockId) return null;

    const apiUrl =
      `https://api.adsgram.ai/advbot?` +
      `tgid=${encodeURIComponent(userId)}` +
      `&blockid=${encodeURIComponent(numericBlockId)}` +
      `&language=${encodeURIComponent(cfg.language || 'ar')}` +
      `&token=${encodeURIComponent(cfg.adsgramToken)}`;

    const response = await this.fetchWithTimeout(apiUrl, { method: 'GET' }, 6000);
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    if (!data || !data.click_url) return null;

    const ad = {
      textHtml: String(data.text_html || '<b>إعلان</b>'),
      clickUrl: String(data.click_url || ''),
      cta: String(data.button_name || 'فتح الإعلان'),
      imageUrl: String(data.image_url || ''),
      rewardUrl: String(data.reward_url || ''),
      rewardCta: String(data.button_reward_name || 'Claim reward')
    };

    this.adCache = { ad, at: now };
    return ad;
  }

  static async getAd(cfg, userId) {
    if (cfg.provider !== 'adsgram') return null;
    return this.fetchAdsGramAd(cfg, userId);
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

      const rows = [[Markup.button.url(ad.cta || 'فتح الإعلان', ad.clickUrl)]];
      if (ad.rewardUrl) {
        rows.push([Markup.button.url(ad.rewardCta || 'استلام المكافأة', ad.rewardUrl)]);
      }
      const keyboard = Markup.inlineKeyboard(rows);

      if (ad.imageUrl) {
        await ctx.replyWithPhoto(
          { url: ad.imageUrl },
          {
            caption: ad.textHtml,
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup,
            protect_content: true
          }
        );
        return;
      }

      await ctx.reply(ad.textHtml, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup,
        disable_web_page_preview: true,
        protect_content: true
      });
    } catch (_error) {
      // Never break bot flow because of ad errors.
    }
  }
}

module.exports = SponsoredAdsSystem;
