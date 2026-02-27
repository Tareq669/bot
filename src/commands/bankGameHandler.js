const { User, Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const ASSETS = {
  car: { name: 'Ø³ÙŠØ§Ø±Ø©', aliases: ['Ø³ÙŠØ§Ø±Ø©', 'Ø³ÙŠØ§Ø±Ù‡', 'Ø§Ù„Ø³ÙŠØ§Ø±Ø©', 'Ø§Ù„Ø³ÙŠØ§Ø±Ù‡'], buy: 150000, sellFactor: 0.7 },
  diamond: { name: 'Ù…Ø§Ø³Ø©', aliases: ['Ù…Ø§Ø³Ø©', 'Ù…Ø§Ø³Ù‡', 'Ø§Ù„Ù…Ø§Ø³Ø©', 'Ø§Ù„Ù…Ø§Ø³Ù‡'], buy: 220000, sellFactor: 0.7 },
  house: { name: 'Ø¨ÙŠØª', aliases: ['Ø¨ÙŠØª', 'Ø§Ù„Ø¨ÙŠØª'], buy: 380000, sellFactor: 0.7 },
  palace: { name: 'Ù‚ØµØ±', aliases: ['Ù‚ØµØ±', 'Ø§Ù„Ù‚ØµØ±'], buy: 750000, sellFactor: 0.7 },
  villa: { name: 'ÙÙŠÙ„Ø§', aliases: ['ÙÙŠÙ„Ø§', 'Ø§Ù„ÙÙŠÙ„Ø§'], buy: 520000, sellFactor: 0.7 },
  rose: { name: 'ÙˆØ±Ø¯Ø©', aliases: ['ÙˆØ±Ø¯Ø©', 'ÙˆØ±Ø¯Ù‡', 'ÙˆØ±ÙˆØ¯', 'ÙˆØ±Ø¯Ø©'], buy: 25000, sellFactor: 0.7 }
};

class BankGameHandler {
  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static now() {
    return Date.now();
  }

  static getDateKey(date = new Date()) {
    const d = new Date(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  static fmt(n) {
    const x = Number.isFinite(Number(n)) ? Number(n) : 0;
    return `${Math.floor(x).toLocaleString('en-US')} Ø¯ÙˆÙ„Ø§Ø± ðŸ’¸`;
  }

  static parseIntSafe(v) {
    const normalized = String(v || '')
      .replace(/[\u0660-\u0669]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[\u06F0-\u06F9]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const out = parseInt(normalized, 10);
    return Number.isInteger(out) ? out : NaN;
  }

  static defaultBankProfile() {
    return {
      created: false,
      balance: 0,
      salaryLastAt: 0,
      tipLastAt: 0,
      stealLastAt: 0,
      investLastAt: 0,
      luckLastAt: 0,
      luckDayKey: '',
      luckPlaysToday: 0,
      wheelLastAt: 0,
      boost2xUntil: 0,
      assets: {},
      stocksUnits: 0,
      debtAmount: 0,
      debtDueAt: 0
    };
  }

  static normalizeProfile(p = {}) {
    const x = { ...this.defaultBankProfile(), ...(p || {}) };
    x.balance = Math.max(0, Number(x.balance || 0));
    x.salaryLastAt = Number(x.salaryLastAt || 0);
    x.tipLastAt = Number(x.tipLastAt || 0);
    x.stealLastAt = Number(x.stealLastAt || 0);
    x.investLastAt = Number(x.investLastAt || 0);
    x.luckLastAt = Number(x.luckLastAt || 0);
    x.luckDayKey = String(x.luckDayKey || '');
    x.luckPlaysToday = Math.max(0, Number(x.luckPlaysToday || 0));
    x.wheelLastAt = Number(x.wheelLastAt || 0);
    x.boost2xUntil = Number(x.boost2xUntil || 0);
    x.stocksUnits = Math.max(0, Number(x.stocksUnits || 0));
    x.debtAmount = Math.max(0, Number(x.debtAmount || 0));
    x.debtDueAt = Number(x.debtDueAt || 0);
    x.assets = x.assets && typeof x.assets === 'object' ? x.assets : {};
    Object.keys(ASSETS).forEach((k) => {
      x.assets[k] = Math.max(0, Number(x.assets[k] || 0));
    });
    return x;
  }

  static async ensureUser(userRef) {
    const userId = Number(userRef?.id || userRef?.userId || 0);
    if (!userId) return null;
    const doc = await User.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          firstName: userRef?.first_name || userRef?.firstName || userRef?.username || `user_${userId}`,
          username: userRef?.username || '',
          joinDate: new Date()
        }
      },
      { upsert: true, new: true }
    );
    doc.bankProfile = this.normalizeProfile(doc.bankProfile || {});
    return doc;
  }

  static isJailed(profile) {
    return Number(profile.debtAmount || 0) > 0 && Number(profile.debtDueAt || 0) > 0 && this.now() > Number(profile.debtDueAt || 0);
  }

  static async withBank(ctx, fn, { requireAccount = true, allowWhenJailed = false } = {}) {
    const user = await this.ensureUser(ctx.from);
    if (!user) return ctx.reply('âŒ ØªØ¹Ø°Ø± Ø§Ù„ÙˆØµÙˆÙ„ Ù„Ø­Ø³Ø§Ø¨Ùƒ.');
    const p = this.normalizeProfile(user.bankProfile || {});
    if (requireAccount && !p.created) return ctx.reply('âŒ Ù…Ø§ Ø¹Ù†Ø¯Ùƒ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ. Ø§ÙƒØªØ¨: Ø§Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ');
    if (!allowWhenJailed && this.isJailed(p)) return ctx.reply('â›“ï¸ Ø£Ù†Øª Ø¨Ø§Ù„Ø³Ø¬Ù† Ø¨Ø³Ø¨Ø¨ Ø¯ÙŠÙˆÙ† Ù…ØªØ£Ø®Ø±Ø©. Ø§ÙƒØªØ¨: Ø³Ø¯Ø§Ø¯ Ø¯ÙŠÙˆÙ†ÙŠ');
    const result = await fn(user, p);
    user.bankProfile = p;
    await user.save();
    return result;
  }

  static applyBoost(amount, p) {
    const base = Number(amount || 0);
    if (base <= 0) return 0;
    return this.now() <= Number(p.boost2xUntil || 0) ? base * 2 : base;
  }

  static parseAsset(input) {
    const t = String(input || '').trim().toLowerCase();
    for (const [key, a] of Object.entries(ASSETS)) {
      if (a.aliases.some((x) => String(x).toLowerCase() === t)) return key;
    }
    return null;
  }

  static parseTargetFromReply(ctx) {
    const u = ctx?.message?.reply_to_message?.from;
    if (!u || u.is_bot) return null;
    return { id: Number(u.id), username: u.username || '', first_name: u.first_name || String(u.id) };
  }

  static stockPrice() {
    const bucket = Math.floor(this.now() / (5 * 60 * 1000));
    let seed = (bucket * 1103515245 + 12345) >>> 0;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed % 600) - 300;
    const trend = Math.sin(bucket / 6) * 220;
    return Math.max(100, Math.round(1000 + trend + noise));
  }

  static async handleCreateAccount(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const user = await this.ensureUser(ctx.from);
    const p = this.normalizeProfile(user.bankProfile || {});
    if (p.created) return ctx.reply('ðŸ¦ Ø­Ø³Ø§Ø¨Ùƒ Ø§Ù„Ø¨Ù†ÙƒÙŠ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„.');
    p.created = true;
    p.balance = 10000;
    user.bankProfile = p;
    await user.save();
    return ctx.reply(`âœ… ØªÙ… Ø§Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ.\nâ€¢ Ø±ØµÙŠØ¯ Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©: ${this.fmt(p.balance)}`);
  }

  static async handleSalary(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const cd = 12 * 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.salaryLastAt || 0));
      if (left > 0) return ctx.reply(`â³ Ø§Ù„Ø±Ø§ØªØ¨ Ø¨Ø¹Ø¯ ${Math.ceil(left / 3600000)} Ø³Ø§Ø¹Ø©.`);
      const base = Math.floor(15000 + Math.random() * 10000);
      const amount = this.applyBoost(base, p);
      p.balance += amount;
      p.salaryLastAt = this.now();
      return ctx.reply(`ðŸ’¼ ØªÙ… ØµØ±Ù Ø±Ø§ØªØ¨Ùƒ: +${this.fmt(amount)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handleTip(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const cd = 30 * 60 * 1000;
      const left = cd - (this.now() - Number(p.tipLastAt || 0));
      if (left > 0) return ctx.reply(`â³ Ø§Ù„Ø¨Ø®Ø´ÙŠØ´ Ø¨Ø¹Ø¯ ${Math.ceil(left / 60000)} Ø¯Ù‚ÙŠÙ‚Ø©.`);
      const base = Math.floor(1500 + Math.random() * 4500);
      const amount = this.applyBoost(base, p);
      p.balance += amount;
      p.tipLastAt = this.now();
      return ctx.reply(`ðŸª™ Ø¨Ø®Ø´ÙŠØ´: +${this.fmt(amount)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handleSteal(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (meDoc, p) => {
      const target = this.parseTargetFromReply(ctx);
      if (!target) return ctx.reply('âŒ Ø§Ù„Ø²Ø±Ù ÙŠÙƒÙˆÙ† Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø´Ø®Øµ.');
      if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('âŒ Ù…Ø§ Ø¨ØµÙŠØ± ØªØ²Ø±Ù Ø­Ø§Ù„Ùƒ ðŸ˜…');

      const cd = 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.stealLastAt || 0));
      if (left > 0) return ctx.reply(`â³ Ø§Ù„Ø²Ø±Ù Ø¨Ø¹Ø¯ ${Math.ceil(left / 60000)} Ø¯Ù‚ÙŠÙ‚Ø©.`);

      const targetDoc = await this.ensureUser(target);
      const tp = this.normalizeProfile(targetDoc.bankProfile || {});
      if (!tp.created) return ctx.reply('âŒ Ø§Ù„Ø´Ø®Øµ Ù…Ø§ Ø¹Ù†Ø¯Ù‡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ.');
      if (tp.balance <= 0) return ctx.reply('âŒ Ø±ØµÙŠØ¯ Ø§Ù„Ø´Ø®Øµ ØµÙØ±.');

      p.stealLastAt = this.now();
      const ok = Math.random() < 0.55;
      if (!ok) {
        const fine = Math.min(Math.max(1000, Math.floor(p.balance * 0.03)), p.balance);
        p.balance -= fine;
        meDoc.bankProfile = p;
        targetDoc.bankProfile = tp;
        await Promise.all([meDoc.save(), targetDoc.save()]);
        return ctx.reply(`ðŸš¨ Ø§Ù†Ù…Ø³ÙƒØª! Ø®Ø³Ø±Ù‘Øª ØºØ±Ø§Ù…Ø© ${this.fmt(fine)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
      }

      const stealAmount = Math.max(1000, Math.floor(tp.balance * (0.01 + Math.random() * 0.07)));
      const amount = Math.min(stealAmount, tp.balance);
      tp.balance -= amount;
      p.balance += this.applyBoost(amount, p);
      meDoc.bankProfile = p;
      targetDoc.bankProfile = tp;
      await Promise.all([meDoc.save(), targetDoc.save()]);
      return ctx.reply(`ðŸ•¶ï¸ Ø²Ø±Ù Ù†Ø§Ø¬Ø­: +${this.fmt(amount)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handleInvest(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const args = String(ctx.message?.text || '').trim().split(/\s+/);
      const amountArg = args.find((x) => /^\d+$/.test(x));
      const all = /ÙÙ„ÙˆØ³ÙŠ/.test(String(ctx.message?.text || ''));
      const amount = all ? Math.floor(p.balance) : (amountArg ? this.parseIntSafe(amountArg) : Math.min(50000, Math.floor(p.balance * 0.25)));
      if (!Number.isFinite(amount) || amount <= 0) return ctx.reply('âŒ Ø§ÙƒØªØ¨ Ù…Ø¨Ù„Øº ØµØ­ÙŠØ­ Ù„Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±.');
      if (p.balance < amount) return ctx.reply('âŒ Ø±ØµÙŠØ¯Ùƒ ØºÙŠØ± ÙƒØ§ÙÙŠ.');

      const cd = 6 * 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.investLastAt || 0));
      if (left > 0) return ctx.reply(`â³ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø± Ø¨Ø¹Ø¯ ${Math.ceil(left / 3600000)} Ø³Ø§Ø¹Ø©.`);

      const ratio = 0.06 + Math.random() * 0.18;
      const profit = Math.floor(amount * ratio);
      const totalGain = this.applyBoost(profit, p);
      p.investLastAt = this.now();
      p.balance += totalGain;
      return ctx.reply(
        'ðŸ“ˆ Ø§Ø³ØªØ«Ù…Ø§Ø± Ù†Ø§Ø¬Ø­\n' +
        `â€¢ Ù†Ø³Ø¨Ø© Ø§Ù„Ø±Ø¨Ø­ â†¢ ${(ratio * 100).toFixed(1)}%\n` +
        `â€¢ Ù…Ø¨Ù„Øº Ø§Ù„Ø±Ø¨Ø­ â†¢ ${this.fmt(totalGain)}\n` +
        `â€¢ Ø±ØµÙŠØ¯Ùƒ â†¢ ${this.fmt(p.balance)}`
      );
    });
  }

  static async handleSpeculate(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const args = String(ctx.message?.text || '').trim().split(/\s+/);
      const amountArg = args.find((x) => /^\d+$/.test(x));
      const amount = this.parseIntSafe(amountArg || 0);
      if (!Number.isFinite(amount) || amount <= 0) return ctx.reply('âŒ Ø§ÙƒØªØ¨ Ø§Ù„Ù…Ø¨Ù„Øº. Ù…Ø«Ø§Ù„: Ù…Ø¶Ø§Ø±Ø¨Ù‡ 50000');
      if (p.balance < amount) return ctx.reply('âŒ Ø±ØµÙŠØ¯Ùƒ ØºÙŠØ± ÙƒØ§ÙÙŠ.');
      const ratio = -0.5 + Math.random() * 1.1;
      const delta = Math.floor(amount * ratio);
      p.balance = Math.max(0, p.balance + delta);
      return ctx.reply(`ðŸŽ² Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù…Ø¶Ø§Ø±Ø¨Ø©: ${delta >= 0 ? '+' : ''}${this.fmt(delta)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handleLuck(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const key = this.getDateKey();
      if (p.luckDayKey !== key) {
        p.luckDayKey = key;
        p.luckPlaysToday = 0;
      }
      if (p.luckPlaysToday >= 10) return ctx.reply('ðŸ§¾ ÙˆØµÙ„Øª Ø­Ø¯ Ø§Ù„Ø­Ø¸ Ø§Ù„ÙŠÙˆÙ…ÙŠ (10).');
      const gain = Math.floor(-5000 + Math.random() * 22000);
      p.luckPlaysToday += 1;
      if (gain >= 0) p.balance += this.applyBoost(gain, p);
      else p.balance = Math.max(0, p.balance + gain);
      return ctx.reply(`ðŸ€ ${gain >= 0 ? 'Ù…Ø¨Ø±ÙˆÙƒ' : 'Ø­Ø¸ Ø£ÙˆÙØ±'}: ${gain >= 0 ? '+' : ''}${this.fmt(gain)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}\nâ€¢ Ù…Ø­Ø§ÙˆÙ„Ø§Øª Ø§Ù„ÙŠÙˆÙ…: ${p.luckPlaysToday}/10`);
    });
  }

  static async handleWheel(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const cost = 5000000;
      if (p.balance < cost) return ctx.reply(`âŒ ØªØ­ØªØ§Ø¬ ${this.fmt(cost)} Ù„Ù„Ø¹Ø¬Ù„Ø©.`);
      p.balance -= cost;
      const r = Math.random();
      let line = '';
      if (r < 0.22) {
        p.assets.car = Number(p.assets.car || 0) + 1;
        line = 'ðŸš— Ø±Ø¨Ø­Øª: Ø³ÙŠØ§Ø±Ø©';
      } else if (r < 0.44) {
        p.assets.diamond = Number(p.assets.diamond || 0) + 1;
        line = 'ðŸ’Ž Ø±Ø¨Ø­Øª: Ù…Ø§Ø³Ø©';
      } else if (r < 0.62) {
        p.boost2xUntil = this.now() + (3 * 60 * 1000);
        line = 'âš¡ Ø±Ø¨Ø­Øª: x2 Ù„Ù…Ø¯Ø© 3 Ø¯Ù‚Ø§Ø¦Ù‚';
      } else {
        const cash = Math.floor(250000 + Math.random() * 1500000);
        p.balance += cash;
        line = `ðŸ’° Ø±Ø¨Ø­Øª: ${this.fmt(cash)}`;
      }
      return ctx.reply(`ðŸŽ¡ Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¹Ø¬Ù„Ø©:\n${line}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handleMyAssets(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const lines = Object.entries(ASSETS).map(([k, a]) => `â€¢ ${a.name} â†¤ï¸Ž ${Number(p.assets[k] || 0)}`);
      return ctx.reply(`ðŸ“¦ Ù…Ù…ØªÙ„ÙƒØ§ØªÙƒ Ø§Ù„Ø¨Ù†ÙƒÙŠØ©:\n\n${lines.join('\n')}`);
    });
  }

  static async handleAssetBuyText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const m = /^Ø´Ø±Ø§Ø¡\s+(\d+)\s+(.+)$/i.exec(String(ctx.message?.text || '').trim());
    if (!m) return false;
    const qty = Math.max(1, this.parseIntSafe(m[1]));
    const assetKey = this.parseAsset(m[2]);
    if (!assetKey) return false;

    await this.withBank(ctx, async (_user, p) => {
      const asset = ASSETS[assetKey];
      const cost = asset.buy * qty;
      if (p.balance < cost) return ctx.reply(`âŒ Ø±ØµÙŠØ¯Ùƒ ØºÙŠØ± ÙƒØ§ÙÙŠ.\nâ€¢ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${this.fmt(cost)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
      p.balance -= cost;
      p.assets[assetKey] = Number(p.assets[assetKey] || 0) + qty;
      return ctx.reply(`âœ… ØªÙ… Ø´Ø±Ø§Ø¡ ${qty} ${asset.name}\nâ€¢ Ø§Ù„ØªÙƒÙ„ÙØ©: ${this.fmt(cost)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
    return true;
  }

  static async handleAssetSellText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const m = /^Ø¨ÙŠØ¹\s+(\d+)\s+(.+)$/i.exec(String(ctx.message?.text || '').trim());
    if (!m) return false;
    const qty = Math.max(1, this.parseIntSafe(m[1]));
    const assetKey = this.parseAsset(m[2]);
    if (!assetKey) return false;

    await this.withBank(ctx, async (_user, p) => {
      const own = Number(p.assets[assetKey] || 0);
      if (own < qty) return ctx.reply(`âŒ Ù…Ø§ Ø¹Ù†Ø¯Ùƒ ÙƒÙ…ÙŠØ© ÙƒØ§ÙÙŠØ©. Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯: ${own}`);
      const asset = ASSETS[assetKey];
      const payout = Math.floor(asset.buy * asset.sellFactor) * qty;
      p.assets[assetKey] = own - qty;
      p.balance += payout;
      return ctx.reply(`âœ… ØªÙ… Ø¨ÙŠØ¹ ${qty} ${asset.name}\nâ€¢ Ø§Ù„Ù…Ø¨Ù„Øº: ${this.fmt(payout)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
    return true;
  }

  static async handleAssetGiftText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const m = /^Ø§Ù‡Ø¯Ø§Ø¡\s+(\d+)\s+(.+)$/i.exec(String(ctx.message?.text || '').trim());
    if (!m) return false;
    const qty = Math.max(1, this.parseIntSafe(m[1]));
    const assetKey = this.parseAsset(m[2]);
    if (!assetKey) return false;
    const target = this.parseTargetFromReply(ctx);
    if (!target) {
      await ctx.reply('âŒ Ø§Ù„Ø¥Ù‡Ø¯Ø§Ø¡ ÙŠÙƒÙˆÙ† Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø®Øµ.');
      return true;
    }
    if (Number(target.id) === Number(ctx.from?.id || 0)) {
      await ctx.reply('âŒ Ù„Ø§ ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø¥Ù‡Ø¯Ø§Ø¡ Ù„Ù†ÙØ³Ùƒ.');
      return true;
    }

    const sender = await this.ensureUser(ctx.from);
    const receiver = await this.ensureUser(target);
    const sp = this.normalizeProfile(sender.bankProfile || {});
    const rp = this.normalizeProfile(receiver.bankProfile || {});
    if (!sp.created) {
      await ctx.reply('âŒ Ù…Ø§ Ø¹Ù†Ø¯Ùƒ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ. Ø§ÙƒØªØ¨: Ø§Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ');
      return true;
    }
    if (this.isJailed(sp)) {
      await ctx.reply('â›“ï¸ Ø£Ù†Øª Ø¨Ø§Ù„Ø³Ø¬Ù† Ø¨Ø³Ø¨Ø¨ Ø¯ÙŠÙˆÙ† Ù…ØªØ£Ø®Ø±Ø©.');
      return true;
    }
    if (!rp.created) {
      await ctx.reply('âŒ Ø§Ù„Ù…Ø³ØªÙ„Ù… Ù…Ø§ Ø¹Ù†Ø¯Ù‡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ.');
      return true;
    }

    const own = Number(sp.assets[assetKey] || 0);
    if (own < qty) {
      await ctx.reply(`âŒ Ù…Ø§ Ø¹Ù†Ø¯Ùƒ ÙƒÙ…ÙŠØ© ÙƒØ§ÙÙŠØ©. Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯: ${own}`);
      return true;
    }
    sp.assets[assetKey] = own - qty;
    rp.assets[assetKey] = Number(rp.assets[assetKey] || 0) + qty;
    sender.bankProfile = sp;
    receiver.bankProfile = rp;
    await Promise.all([sender.save(), receiver.save()]);
    const asset = ASSETS[assetKey];
    await ctx.reply(`ðŸŽ ØªÙ… Ø§Ù‡Ø¯Ø§Ø¡ ${qty} ${asset.name} Ø¨Ù†Ø¬Ø§Ø­.`);
    return true;
  }

  static async handleStocksPrice(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const price = this.stockPrice();
    return ctx.reply(`ðŸ“Š Ø³Ø¹Ø± Ø§Ù„Ø§Ø³Ù‡Ù… Ø§Ù„Ø¢Ù†: ${this.fmt(price)} Ù„Ù„Ø³Ù‡Ù… Ø§Ù„ÙˆØ§Ø­Ø¯.`);
  }

  static async handleBuyStocks(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const m = /Ø´Ø±Ø§Ø¡\s+Ø§Ø³Ù‡Ù…(?:\s+(\d+))?/i.exec(String(ctx.message?.text || ''));
      const qty = Math.max(1, this.parseIntSafe(m?.[1] || 1));
      const price = this.stockPrice();
      const total = price * qty;
      if (p.balance < total) return ctx.reply(`âŒ Ø±ØµÙŠØ¯Ùƒ ØºÙŠØ± ÙƒØ§ÙÙŠ.\nâ€¢ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${this.fmt(total)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
      p.balance -= total;
      p.stocksUnits = Number(p.stocksUnits || 0) + qty;
      return ctx.reply(`âœ… ØªÙ… Ø´Ø±Ø§Ø¡ ${qty} Ø³Ù‡Ù….\nâ€¢ Ø§Ù„Ø³Ø¹Ø±: ${this.fmt(price)}\nâ€¢ Ø§Ù„ØªÙƒÙ„ÙØ©: ${this.fmt(total)}\nâ€¢ Ø£Ø³Ù‡Ù…Ùƒ: ${p.stocksUnits}`);
    });
  }

  static async handleSellStocks(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const m = /Ø¨ÙŠØ¹\s+Ø§Ø³Ù‡Ù…(?:\s+(\d+))?/i.exec(String(ctx.message?.text || ''));
      const qty = Math.max(1, this.parseIntSafe(m?.[1] || 1));
      if (Number(p.stocksUnits || 0) < qty) return ctx.reply(`âŒ Ù…Ø§ Ø¹Ù†Ø¯Ùƒ Ø£Ø³Ù‡Ù… ÙƒØ§ÙÙŠØ©. Ø£Ø³Ù‡Ù…Ùƒ: ${p.stocksUnits || 0}`);
      const price = this.stockPrice();
      const total = price * qty;
      p.stocksUnits = Number(p.stocksUnits || 0) - qty;
      p.balance += total;
      return ctx.reply(`âœ… ØªÙ… Ø¨ÙŠØ¹ ${qty} Ø³Ù‡Ù….\nâ€¢ Ø§Ù„Ø³Ø¹Ø±: ${this.fmt(price)}\nâ€¢ Ø§Ù„Ù…Ø¨Ù„Øº: ${this.fmt(total)}\nâ€¢ Ø£Ø³Ù‡Ù…Ùƒ: ${p.stocksUnits}`);
    });
  }

  static async handleLoan(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) > 0) return ctx.reply(`âŒ Ø¹Ù†Ø¯Ùƒ Ù‚Ø±Ø¶ Ù‚Ø§Ø¦Ù…: ${this.fmt(p.debtAmount)}\nØ§ÙƒØªØ¨: Ø¯ÙŠÙˆÙ†ÙŠ`);
      const amount = Math.floor(80000 + Math.random() * 420000);
      p.debtAmount = amount;
      p.debtDueAt = this.now() + 24 * 60 * 60 * 1000;
      p.balance += amount;
      return ctx.reply(`ðŸ¦ ØªÙ… Ù…Ù†Ø­Ùƒ Ù‚Ø±Ø¶: ${this.fmt(amount)}\nâ€¢ Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø³Ø¯Ø§Ø¯: Ø®Ù„Ø§Ù„ 24 Ø³Ø§Ø¹Ø©\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    });
  }

  static async handlePrisonStatus(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (this.isJailed(p)) return ctx.reply('â›“ï¸ Ø­Ø§Ù„ØªÙƒ: Ù…Ø³Ø¬ÙˆÙ† Ø¨Ø³Ø¨Ø¨ Ø¯ÙŠÙˆÙ† Ù…ØªØ£Ø®Ø±Ø©.');
      if (Number(p.debtAmount || 0) > 0) return ctx.reply('âš ï¸ Ø¹Ù†Ø¯Ùƒ Ø¯ÙŠÙ† Ù‚Ø§Ø¦Ù… Ù„ÙƒÙ† Ù„Ø³Ù‡ Ø¶Ù…Ù† Ù…Ø¯Ø© Ø§Ù„Ø³Ø¯Ø§Ø¯.');
      return ctx.reply('âœ… Ø­Ø§Ù„ØªÙƒ: Ù„Ø³Øª Ù…Ø³Ø¬ÙˆÙ†.');
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleMyDebts(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) <= 0) return ctx.reply('âœ… Ù…Ø§ Ø¹Ù„ÙŠÙƒ Ø£ÙŠ Ø¯ÙŠÙˆÙ†.');
      const left = Number(p.debtDueAt || 0) - this.now();
      const state = left > 0 ? `Ù…ØªØ¨Ù‚ÙŠ ${Math.ceil(left / 3600000)} Ø³Ø§Ø¹Ø©` : 'Ù…ØªØ£Ø®Ø± - Ø­Ø§Ù„Ø© Ø³Ø¬Ù†';
      return ctx.reply(`ðŸ“„ Ø¯ÙŠÙˆÙ†Ùƒ:\nâ€¢ Ø§Ù„Ù…Ø¨Ù„Øº: ${this.fmt(p.debtAmount)}\nâ€¢ Ø§Ù„Ø­Ø§Ù„Ø©: ${state}`);
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleTargetDebts(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const target = this.parseTargetFromReply(ctx);
    if (!target) return ctx.reply('âŒ Ø§Ø³ØªØ®Ø¯Ù…Ù‡Ø§ Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø®Øµ.');
    const doc = await this.ensureUser(target);
    const p = this.normalizeProfile(doc.bankProfile || {});
    if (!p.created) return ctx.reply('âŒ Ø§Ù„Ø´Ø®Øµ Ù…Ø§ Ø¹Ù†Ø¯Ù‡ Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ.');
    if (Number(p.debtAmount || 0) <= 0) return ctx.reply('âœ… Ù…Ø§ Ø¹Ù„ÙŠÙ‡ Ø¯ÙŠÙˆÙ†.');
    const left = Number(p.debtDueAt || 0) - this.now();
    const state = left > 0 ? `Ù…ØªØ¨Ù‚ÙŠ ${Math.ceil(left / 3600000)} Ø³Ø§Ø¹Ø©` : 'Ù…ØªØ£Ø®Ø± - Ø­Ø§Ù„Ø© Ø³Ø¬Ù†';
    return ctx.reply(`ðŸ“„ Ø¯ÙŠÙˆÙ†Ù‡:\nâ€¢ Ø§Ù„Ù…Ø¨Ù„Øº: ${this.fmt(p.debtAmount)}\nâ€¢ Ø§Ù„Ø­Ø§Ù„Ø©: ${state}`);
  }

  static async handleRepayMine(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) <= 0) return ctx.reply('âœ… Ù…Ø§ Ø¹Ù„ÙŠÙƒ Ø¯ÙŠÙˆÙ†.');
      const pay = Math.min(p.balance, p.debtAmount);
      if (pay <= 0) return ctx.reply('âŒ Ø±ØµÙŠØ¯Ùƒ ØµÙØ±ØŒ Ù…Ø§ ØªÙ‚Ø¯Ø± ØªØ³Ø¯Ø¯.');
      p.balance -= pay;
      p.debtAmount -= pay;
      if (p.debtAmount <= 0) {
        p.debtAmount = 0;
        p.debtDueAt = 0;
        return ctx.reply(`âœ… ØªÙ… Ø³Ø¯Ø§Ø¯ Ø¯ÙŠÙˆÙ†Ùƒ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.\nâ€¢ Ø§Ù„Ù…Ø¯ÙÙˆØ¹: ${this.fmt(pay)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
      }
      return ctx.reply(`âœ… ØªÙ… Ø³Ø¯Ø§Ø¯ Ø¬Ø²Ø¡ Ù…Ù† Ø§Ù„Ø¯ÙŠÙ†.\nâ€¢ Ø§Ù„Ù…Ø¯ÙÙˆØ¹: ${this.fmt(pay)}\nâ€¢ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ: ${this.fmt(p.debtAmount)}\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(p.balance)}`);
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleRepayTarget(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const target = this.parseTargetFromReply(ctx);
    if (!target) return ctx.reply('âŒ Ø§Ø³ØªØ®Ø¯Ù…Ù‡Ø§ Ø¨Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø®Øµ.');
    if (Number(target.id) === Number(ctx.from.id)) return this.handleRepayMine(ctx);

    const payer = await this.ensureUser(ctx.from);
    const debtor = await this.ensureUser(target);
    const pp = this.normalizeProfile(payer.bankProfile || {});
    const dp = this.normalizeProfile(debtor.bankProfile || {});
    if (!pp.created || !dp.created) return ctx.reply('âŒ Ù„Ø§Ø²Ù… Ø§Ù„Ø·Ø±ÙÙŠÙ† ÙŠÙƒÙˆÙ† Ø¹Ù†Ø¯Ù‡Ù… Ø­Ø³Ø§Ø¨ Ø¨Ù†ÙƒÙŠ.');
    if (Number(dp.debtAmount || 0) <= 0) return ctx.reply('âœ… Ø§Ù„Ø´Ø®Øµ Ù…Ø§ Ø¹Ù„ÙŠÙ‡ Ø¯ÙŠÙˆÙ†.');
    const pay = Math.min(pp.balance, dp.debtAmount);
    if (pay <= 0) return ctx.reply('âŒ Ø±ØµÙŠØ¯Ùƒ ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ù„Ø³Ø¯Ø§Ø¯.');
    pp.balance -= pay;
    dp.debtAmount -= pay;
    if (dp.debtAmount <= 0) {
      dp.debtAmount = 0;
      dp.debtDueAt = 0;
    }
    payer.bankProfile = pp;
    debtor.bankProfile = dp;
    await Promise.all([payer.save(), debtor.save()]);
    return ctx.reply(`ðŸ¤ ØªÙ… Ø³Ø¯Ø§Ø¯ ${this.fmt(pay)} Ù…Ù† Ø¯ÙŠÙˆÙ† Ø§Ù„Ø¹Ø¶Ùˆ.\nâ€¢ Ø±ØµÙŠØ¯Ùƒ: ${this.fmt(pp.balance)}`);
  }

  static async handleTopGroups(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const groups = await Group.find({})
      .sort({ 'statistics.messagesCount': -1 })
      .limit(20)
      .select('groupTitle statistics.messagesCount gameSystem.scores');
    if (!groups.length) return ctx.reply('â„¹ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù‚Ø±ÙˆØ¨Ø§Øª Ø¨Ø¹Ø¯.');
    let text = 'ðŸ† ØªÙˆØ¨ Ø§Ù„Ù‚Ø±ÙˆØ¨Ø§Øª (Top 20)\n\n';
    groups.forEach((g, i) => {
      const msgCount = Number(g.statistics?.messagesCount || 0);
      const players = Number(Array.isArray(g.gameSystem?.scores) ? g.gameSystem.scores.length : 0);
      text += `${i + 1}. ${g.groupTitle || 'Group'} â€” Ø±Ø³Ø§Ø¦Ù„: ${msgCount} | Ù„Ø§Ø¹Ø¨ÙŠÙ†: ${players}\n`;
    });
    return ctx.reply(text);
  }

  static async handleTopActiveInGroup(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await Group.findOne({ groupId: String(ctx.chat.id) });
    const rows = Array.isArray(group?.gameSystem?.scores) ? [...group.gameSystem.scores] : [];
    if (!rows.length) return ctx.reply('â„¹ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØªÙØ§Ø¹Ù„ Ø¨Ø¹Ø¯.');
    rows.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    const top = rows.slice(0, 10);
    let text = 'ðŸ”¥ ØªÙˆØ¨ Ø£ÙƒØ«Ø± 10 Ù…ØªÙØ§Ø¹Ù„ÙŠÙ† Ø¨Ø§Ù„Ù‚Ø±ÙˆØ¨\n\n';
    top.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} â€” ${this.fmt(r.points || 0)}\n`;
    });
    return ctx.reply(text);
  }
}

module.exports = BankGameHandler;

