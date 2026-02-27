const { User, Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const ASSETS = {
  car: { name: 'سيارة', aliases: ['سيارة', 'سياره', 'السيارة', 'السياره'], buy: 150000, sellFactor: 0.7 },
  diamond: { name: 'ماسة', aliases: ['ماسة', 'ماسه', 'الماسة', 'الماسه'], buy: 220000, sellFactor: 0.7 },
  house: { name: 'بيت', aliases: ['بيت', 'البيت'], buy: 380000, sellFactor: 0.7 },
  palace: { name: 'قصر', aliases: ['قصر', 'القصر'], buy: 750000, sellFactor: 0.7 },
  villa: { name: 'فيلا', aliases: ['فيلا', 'الفيلا'], buy: 520000, sellFactor: 0.7 },
  rose: { name: 'وردة', aliases: ['وردة', 'ورده', 'ورود', 'وردة'], buy: 25000, sellFactor: 0.7 }
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
    return `${Math.floor(x).toLocaleString('en-US')} دولار 💸`;
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
      wheelDayKey: '',
      wheelPlaysToday: 0,
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
    x.wheelDayKey = String(x.wheelDayKey || '');
    x.wheelPlaysToday = Math.max(0, Number(x.wheelPlaysToday || 0));
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
    if (!user) return ctx.reply('❌ تعذر الوصول لحسابك.');
    const p = this.normalizeProfile(user.bankProfile || {});
    if (requireAccount && !p.created) return ctx.reply('❌ ما عندك حساب بنكي. اكتب: انشاء حساب بنكي');
    if (!allowWhenJailed && this.isJailed(p)) return ctx.reply('⛓️ أنت بالسجن بسبب ديون متأخرة. اكتب: سداد ديوني');
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

  static parseAssetQtyText(text, verbRegex) {
    const raw = String(text || '').trim();
    const m = new RegExp(`^${verbRegex}\\s+(.+)$`, 'i').exec(raw);
    if (!m) return null;
    const rest = String(m[1] || '').trim();
    if (!rest) return null;
    const parts = rest.split(/\s+/).filter(Boolean);
    if (!parts.length) return null;

    let qty = 1;
    let assetText = rest;

    if (/^\d+$/.test(parts[0])) {
      qty = Math.max(1, this.parseIntSafe(parts[0]));
      assetText = parts.slice(1).join(' ');
    } else if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
      qty = Math.max(1, this.parseIntSafe(parts[parts.length - 1]));
      assetText = parts.slice(0, -1).join(' ');
    }

    const assetKey = this.parseAsset(assetText);
    if (!assetKey) return null;
    return { qty, assetKey };
  }

  static async adjustGroupGiftInventory(chatId, userRef, assetKey, delta) {
    const groupId = String(chatId || '');
    const userId = Number(userRef?.id || userRef?.userId || 0);
    if (!groupId || !userId || !assetKey || !delta) return;

    const group = await Group.findOne({ groupId });
    if (!group) return;
    if (!group.gameSystem) group.gameSystem = {};
    if (!Array.isArray(group.gameSystem.scores)) group.gameSystem.scores = [];

    let row = group.gameSystem.scores.find((s) => Number(s.userId) === userId);
    if (!row) {
      group.gameSystem.scores.push({
        userId,
        username: userRef?.username || userRef?.first_name || `user_${userId}`,
        points: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        giftInventory: []
      });
      row = group.gameSystem.scores[group.gameSystem.scores.length - 1];
    }

    if (!Array.isArray(row.giftInventory)) row.giftInventory = [];
    const key = String(assetKey);
    const name = ASSETS[key]?.name || key;
    const idx = row.giftInventory.findIndex((g) => String(g?.key || '') === key);
    if (idx < 0) {
      if (delta > 0) row.giftInventory.push({ key, name, count: Number(delta) });
    } else {
      row.giftInventory[idx].count = Math.max(0, Number(row.giftInventory[idx].count || 0) + Number(delta || 0));
      row.giftInventory[idx].name = name;
      if (row.giftInventory[idx].count <= 0) row.giftInventory.splice(idx, 1);
    }

    await group.save();
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
    if (p.created) return ctx.reply('🏦 حسابك البنكي موجود بالفعل.');
    p.created = true;
    p.balance = 10000;
    user.bankProfile = p;
    await user.save();
    return ctx.reply(`✅ تم انشاء حساب بنكي.\n• رصيد البداية: ${this.fmt(p.balance)}`);
  }

  static async handleSalary(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const cd = 12 * 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.salaryLastAt || 0));
      if (left > 0) return ctx.reply(`⏳ الراتب بعد ${Math.ceil(left / 3600000)} ساعة.`);
      const base = Math.floor(15000 + Math.random() * 10000);
      const amount = this.applyBoost(base, p);
      p.balance += amount;
      p.salaryLastAt = this.now();
      return ctx.reply(`💼 تم صرف راتبك: +${this.fmt(amount)}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
  }

  static async handleTip(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const cd = 30 * 60 * 1000;
      const left = cd - (this.now() - Number(p.tipLastAt || 0));
      if (left > 0) return ctx.reply(`⏳ البخشيش بعد ${Math.ceil(left / 60000)} دقيقة.`);
      const base = Math.floor(1500 + Math.random() * 4500);
      const amount = this.applyBoost(base, p);
      p.balance += amount;
      p.tipLastAt = this.now();
      return ctx.reply(`🪙 بخشيش: +${this.fmt(amount)}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
  }

  static async handleSteal(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (meDoc, p) => {
      const target = this.parseTargetFromReply(ctx);
      if (!target) return ctx.reply('❌ الزرف يكون بالرد على رسالة الشخص.');
      if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ ما بصير تزرف حالك 😅');

      const cd = 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.stealLastAt || 0));
      if (left > 0) return ctx.reply(`⏳ الزرف بعد ${Math.ceil(left / 60000)} دقيقة.`);

      const targetDoc = await this.ensureUser(target);
      const tp = this.normalizeProfile(targetDoc.bankProfile || {});
      if (!tp.created) return ctx.reply('❌ الشخص ما عنده حساب بنكي.');
      if (tp.balance <= 0) return ctx.reply('❌ رصيد الشخص صفر.');

      p.stealLastAt = this.now();
      const ok = Math.random() < 0.55;
      if (!ok) {
        const fine = Math.min(Math.max(1000, Math.floor(p.balance * 0.03)), p.balance);
        p.balance -= fine;
        meDoc.bankProfile = p;
        targetDoc.bankProfile = tp;
        await Promise.all([meDoc.save(), targetDoc.save()]);
        return ctx.reply(`🚨 انمسكت! خسرّت غرامة ${this.fmt(fine)}\n• رصيدك: ${this.fmt(p.balance)}`);
      }

      const stealAmount = Math.max(1000, Math.floor(tp.balance * (0.01 + Math.random() * 0.07)));
      const amount = Math.min(stealAmount, tp.balance);
      tp.balance -= amount;
      p.balance += this.applyBoost(amount, p);
      meDoc.bankProfile = p;
      targetDoc.bankProfile = tp;
      await Promise.all([meDoc.save(), targetDoc.save()]);
      return ctx.reply(`🕶️ زرف ناجح: +${this.fmt(amount)}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
  }

  static async handleInvest(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const args = String(ctx.message?.text || '').trim().split(/\s+/);
      const amountArg = args.find((x) => /^\d+$/.test(x));
      const all = /فلوسي/.test(String(ctx.message?.text || ''));
      const amount = all ? Math.floor(p.balance) : (amountArg ? this.parseIntSafe(amountArg) : Math.min(50000, Math.floor(p.balance * 0.25)));
      if (!Number.isFinite(amount) || amount <= 0) return ctx.reply('❌ اكتب مبلغ صحيح للاستثمار.');
      if (p.balance < amount) return ctx.reply('❌ رصيدك غير كافي.');

      const cd = 6 * 60 * 60 * 1000;
      const left = cd - (this.now() - Number(p.investLastAt || 0));
      if (left > 0) return ctx.reply(`⏳ الاستثمار بعد ${Math.ceil(left / 3600000)} ساعة.`);

      const ratio = 0.06 + Math.random() * 0.18;
      const profit = Math.floor(amount * ratio);
      const totalGain = this.applyBoost(profit, p);
      p.investLastAt = this.now();
      p.balance += totalGain;
      return ctx.reply(
        '📈 استثمار ناجح\n' +
        `• نسبة الربح ↢ ${(ratio * 100).toFixed(1)}%\n` +
        `• مبلغ الربح ↢ ${this.fmt(totalGain)}\n` +
        `• رصيدك ↢ ${this.fmt(p.balance)}`
      );
    });
  }

  static async handleSpeculate(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const args = String(ctx.message?.text || '').trim().split(/\s+/);
      const amountArg = args.find((x) => /^\d+$/.test(x));
      const amount = this.parseIntSafe(amountArg || 0);
      if (!Number.isFinite(amount) || amount <= 0) return ctx.reply('❌ اكتب المبلغ. مثال: مضاربه 50000');
      if (p.balance < amount) return ctx.reply('❌ رصيدك غير كافي.');
      const ratio = -0.5 + Math.random() * 1.1;
      const delta = Math.floor(amount * ratio);
      p.balance = Math.max(0, p.balance + delta);
      return ctx.reply(`🎲 نتيجة المضاربة: ${delta >= 0 ? '+' : ''}${this.fmt(delta)}\n• رصيدك: ${this.fmt(p.balance)}`);
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
      if (p.luckPlaysToday >= 10) return ctx.reply('🧾 وصلت حد الحظ اليومي (10).');
      const gain = Math.floor(-5000 + Math.random() * 22000);
      p.luckPlaysToday += 1;
      if (gain >= 0) p.balance += this.applyBoost(gain, p);
      else p.balance = Math.max(0, p.balance + gain);
      return ctx.reply(`🍀 ${gain >= 0 ? 'مبروك' : 'حظ أوفر'}: ${gain >= 0 ? '+' : ''}${this.fmt(gain)}\n• رصيدك: ${this.fmt(p.balance)}\n• محاولات اليوم: ${p.luckPlaysToday}/10`);
    });
  }

  static async handleWheel(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const dayKey = this.getDateKey();
      if (p.wheelDayKey !== dayKey) {
        p.wheelDayKey = dayKey;
        p.wheelPlaysToday = 0;
      }
      if (Number(p.wheelPlaysToday || 0) >= 3) {
        return ctx.reply('🧾 وصلت حد العجلة اليومي (3 مرات).');
      }
      const cost = 500;
      if (p.balance < cost) return ctx.reply(`❌ تحتاج ${this.fmt(cost)} للعجلة.`);
      p.balance -= cost;
      p.wheelLastAt = this.now();
      p.wheelPlaysToday = Number(p.wheelPlaysToday || 0) + 1;
      const r = Math.random();
      let line = '';
      if (r < 0.05) {
        // Very rare high-value physical reward.
        p.assets.car = Number(p.assets.car || 0) + 1;
        await this.adjustGroupGiftInventory(ctx.chat.id, ctx.from, 'car', 1);
        line = '🔥 حظ قوي جدًا: ربحت سيارة';
      } else if (r < 0.1) {
        // Rare high-value physical reward.
        p.assets.diamond = Number(p.assets.diamond || 0) + 1;
        await this.adjustGroupGiftInventory(ctx.chat.id, ctx.from, 'diamond', 1);
        line = '💎 حظ قوي: ربحت ماسة';
      } else if (r < 0.2) {
        // Rare temporary multiplier reward.
        p.boost2xUntil = this.now() + (3 * 60 * 1000);
        line = '⚡ حظ قوي: ربحت x2 لمدة 3 دقائق';
      } else if (r < 0.65) {
        // Low luck cash outcome.
        const cash = Math.floor(300 + Math.random() * 900); // 300 - 1199
        p.balance += cash;
        line = `🍀 حظ قليل: ربحت ${this.fmt(cash)}`;
      } else if (r < 0.92) {
        // Good luck cash outcome.
        const cash = Math.floor(1200 + Math.random() * 3800); // 1200 - 4999
        p.balance += cash;
        line = `✅ حظ جيد: ربحت ${this.fmt(cash)}`;
      } else {
        // Strong luck cash outcome (rare).
        const cash = Math.floor(5000 + Math.random() * 10000); // 5000 - 14999
        p.balance += cash;
        line = `🚀 حظ قوي: ربحت ${this.fmt(cash)}`;
      }
      return ctx.reply(`🎡 نتيجة العجلة:\n${line}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
  }

  static async handleMyAssets(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const lines = Object.entries(ASSETS).map(([k, a]) => `• ${a.name} ↤︎ ${Number(p.assets[k] || 0)}`);
      return ctx.reply(`📦 ممتلكاتك البنكية:\n\n${lines.join('\n')}`);
    });
  }

  static async handleAssetBuyText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const parsed = this.parseAssetQtyText(ctx.message?.text || '', 'شراء');
    if (!parsed) return false;
    const { qty, assetKey } = parsed;

    await this.withBank(ctx, async (_user, p) => {
      const asset = ASSETS[assetKey];
      const cost = asset.buy * qty;
      if (p.balance < cost) return ctx.reply(`❌ رصيدك غير كافي.\n• المطلوب: ${this.fmt(cost)}\n• رصيدك: ${this.fmt(p.balance)}`);
      p.balance -= cost;
      p.assets[assetKey] = Number(p.assets[assetKey] || 0) + qty;
      await this.adjustGroupGiftInventory(ctx.chat.id, ctx.from, assetKey, qty);
      return ctx.reply(`✅ تم شراء ${qty} ${asset.name}\n• التكلفة: ${this.fmt(cost)}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
    return true;
  }

  static async handleAssetSellText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const parsed = this.parseAssetQtyText(ctx.message?.text || '', 'بيع');
    if (!parsed) return false;
    const { qty, assetKey } = parsed;

    await this.withBank(ctx, async (_user, p) => {
      const own = Number(p.assets[assetKey] || 0);
      if (own < qty) return ctx.reply(`❌ ما عندك كمية كافية. الموجود: ${own}`);
      const asset = ASSETS[assetKey];
      const payout = Math.floor(asset.buy * asset.sellFactor) * qty;
      p.assets[assetKey] = own - qty;
      p.balance += payout;
      await this.adjustGroupGiftInventory(ctx.chat.id, ctx.from, assetKey, -qty);
      return ctx.reply(`✅ تم بيع ${qty} ${asset.name}\n• المبلغ: ${this.fmt(payout)}\n• رصيدك: ${this.fmt(p.balance)}`);
    });
    return true;
  }

  static async handleAssetGiftText(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const parsed = this.parseAssetQtyText(ctx.message?.text || '', 'اهداء');
    if (!parsed) return false;
    const { qty, assetKey } = parsed;
    const target = this.parseTargetFromReply(ctx);
    if (!target) {
      await ctx.reply('❌ الإهداء يكون بالرد على الشخص.');
      return true;
    }
    if (Number(target.id) === Number(ctx.from?.id || 0)) {
      await ctx.reply('❌ لا يمكنك الإهداء لنفسك.');
      return true;
    }

    const sender = await this.ensureUser(ctx.from);
    const receiver = await this.ensureUser(target);
    const sp = this.normalizeProfile(sender.bankProfile || {});
    const rp = this.normalizeProfile(receiver.bankProfile || {});
    if (!sp.created) {
      await ctx.reply('❌ ما عندك حساب بنكي. اكتب: انشاء حساب بنكي');
      return true;
    }
    if (this.isJailed(sp)) {
      await ctx.reply('⛓️ أنت بالسجن بسبب ديون متأخرة.');
      return true;
    }
    if (!rp.created) {
      await ctx.reply('❌ المستلم ما عنده حساب بنكي.');
      return true;
    }

    const own = Number(sp.assets[assetKey] || 0);
    if (own < qty) {
      await ctx.reply(`❌ ما عندك كمية كافية. الموجود: ${own}`);
      return true;
    }
    sp.assets[assetKey] = own - qty;
    rp.assets[assetKey] = Number(rp.assets[assetKey] || 0) + qty;
    sender.bankProfile = sp;
    receiver.bankProfile = rp;
    await Promise.all([sender.save(), receiver.save()]);
    await this.adjustGroupGiftInventory(ctx.chat.id, ctx.from, assetKey, -qty);
    await this.adjustGroupGiftInventory(ctx.chat.id, target, assetKey, qty);
    const asset = ASSETS[assetKey];
    await ctx.reply(`🎁 تم اهداء ${qty} ${asset.name} بنجاح.`);
    return true;
  }

  static async handleStocksPrice(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const price = this.stockPrice();
    return ctx.reply(`📊 سعر الاسهم الآن: ${this.fmt(price)} للسهم الواحد.`);
  }

  static async handleBuyStocks(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const m = /شراء\s+اسهم(?:\s+(\d+))?/i.exec(String(ctx.message?.text || ''));
      const qty = Math.max(1, this.parseIntSafe(m?.[1] || 1));
      const price = this.stockPrice();
      const total = price * qty;
      if (p.balance < total) return ctx.reply(`❌ رصيدك غير كافي.\n• المطلوب: ${this.fmt(total)}\n• رصيدك: ${this.fmt(p.balance)}`);
      p.balance -= total;
      p.stocksUnits = Number(p.stocksUnits || 0) + qty;
      return ctx.reply(`✅ تم شراء ${qty} سهم.\n• السعر: ${this.fmt(price)}\n• التكلفة: ${this.fmt(total)}\n• أسهمك: ${p.stocksUnits}`);
    });
  }

  static async handleSellStocks(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const m = /بيع\s+اسهم(?:\s+(\d+))?/i.exec(String(ctx.message?.text || ''));
      const qty = Math.max(1, this.parseIntSafe(m?.[1] || 1));
      if (Number(p.stocksUnits || 0) < qty) return ctx.reply(`❌ ما عندك أسهم كافية. أسهمك: ${p.stocksUnits || 0}`);
      const price = this.stockPrice();
      const total = price * qty;
      p.stocksUnits = Number(p.stocksUnits || 0) - qty;
      p.balance += total;
      return ctx.reply(`✅ تم بيع ${qty} سهم.\n• السعر: ${this.fmt(price)}\n• المبلغ: ${this.fmt(total)}\n• أسهمك: ${p.stocksUnits}`);
    });
  }

  static async handleLoan(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) > 0) return ctx.reply(`❌ عندك قرض قائم: ${this.fmt(p.debtAmount)}\nاكتب: ديوني`);
      const amount = Math.floor(80000 + Math.random() * 420000);
      p.debtAmount = amount;
      p.debtDueAt = this.now() + 24 * 60 * 60 * 1000;
      p.balance += amount;
      return ctx.reply(`🏦 تم منحك قرض: ${this.fmt(amount)}\n• موعد السداد: خلال 24 ساعة\n• رصيدك: ${this.fmt(p.balance)}`);
    });
  }

  static async handlePrisonStatus(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (this.isJailed(p)) return ctx.reply('⛓️ حالتك: مسجون بسبب ديون متأخرة.');
      if (Number(p.debtAmount || 0) > 0) return ctx.reply('⚠️ عندك دين قائم لكن لسه ضمن مدة السداد.');
      return ctx.reply('✅ حالتك: لست مسجون.');
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleMyDebts(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) <= 0) return ctx.reply('✅ ما عليك أي ديون.');
      const left = Number(p.debtDueAt || 0) - this.now();
      const state = left > 0 ? `متبقي ${Math.ceil(left / 3600000)} ساعة` : 'متأخر - حالة سجن';
      return ctx.reply(`📄 ديونك:\n• المبلغ: ${this.fmt(p.debtAmount)}\n• الحالة: ${state}`);
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleTargetDebts(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const target = this.parseTargetFromReply(ctx);
    if (!target) return ctx.reply('❌ استخدمها بالرد على الشخص.');
    const doc = await this.ensureUser(target);
    const p = this.normalizeProfile(doc.bankProfile || {});
    if (!p.created) return ctx.reply('❌ الشخص ما عنده حساب بنكي.');
    if (Number(p.debtAmount || 0) <= 0) return ctx.reply('✅ ما عليه ديون.');
    const left = Number(p.debtDueAt || 0) - this.now();
    const state = left > 0 ? `متبقي ${Math.ceil(left / 3600000)} ساعة` : 'متأخر - حالة سجن';
    return ctx.reply(`📄 ديونه:\n• المبلغ: ${this.fmt(p.debtAmount)}\n• الحالة: ${state}`);
  }

  static async handleRepayMine(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      if (Number(p.debtAmount || 0) <= 0) return ctx.reply('✅ ما عليك ديون.');
      const pay = Math.min(p.balance, p.debtAmount);
      if (pay <= 0) return ctx.reply('❌ رصيدك صفر، ما تقدر تسدد.');
      p.balance -= pay;
      p.debtAmount -= pay;
      if (p.debtAmount <= 0) {
        p.debtAmount = 0;
        p.debtDueAt = 0;
        return ctx.reply(`✅ تم سداد ديونك بالكامل.\n• المدفوع: ${this.fmt(pay)}\n• رصيدك: ${this.fmt(p.balance)}`);
      }
      return ctx.reply(`✅ تم سداد جزء من الدين.\n• المدفوع: ${this.fmt(pay)}\n• المتبقي: ${this.fmt(p.debtAmount)}\n• رصيدك: ${this.fmt(p.balance)}`);
    }, { requireAccount: true, allowWhenJailed: true });
  }

  static async handleRepayTarget(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const target = this.parseTargetFromReply(ctx);
    if (!target) return ctx.reply('❌ استخدمها بالرد على الشخص.');
    if (Number(target.id) === Number(ctx.from.id)) return this.handleRepayMine(ctx);

    const payer = await this.ensureUser(ctx.from);
    const debtor = await this.ensureUser(target);
    const pp = this.normalizeProfile(payer.bankProfile || {});
    const dp = this.normalizeProfile(debtor.bankProfile || {});
    if (!pp.created || !dp.created) return ctx.reply('❌ لازم الطرفين يكون عندهم حساب بنكي.');
    if (Number(dp.debtAmount || 0) <= 0) return ctx.reply('✅ الشخص ما عليه ديون.');
    const pay = Math.min(pp.balance, dp.debtAmount);
    if (pay <= 0) return ctx.reply('❌ رصيدك غير كافٍ للسداد.');
    pp.balance -= pay;
    dp.debtAmount -= pay;
    if (dp.debtAmount <= 0) {
      dp.debtAmount = 0;
      dp.debtDueAt = 0;
    }
    payer.bankProfile = pp;
    debtor.bankProfile = dp;
    await Promise.all([payer.save(), debtor.save()]);
    return ctx.reply(`🤝 تم سداد ${this.fmt(pay)} من ديون العضو.\n• رصيدك: ${this.fmt(pp.balance)}`);
  }

  static async handleTopGroups(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const groups = await Group.find({})
      .sort({ 'statistics.messagesCount': -1 })
      .limit(20)
      .select('groupTitle statistics.messagesCount gameSystem.scores');
    if (!groups.length) return ctx.reply('ℹ️ لا توجد بيانات قروبات بعد.');
    let text = '🏆 توب القروبات (Top 20)\n\n';
    groups.forEach((g, i) => {
      const msgCount = Number(g.statistics?.messagesCount || 0);
      const players = Number(Array.isArray(g.gameSystem?.scores) ? g.gameSystem.scores.length : 0);
      text += `${i + 1}. ${g.groupTitle || 'Group'} — رسائل: ${msgCount} | لاعبين: ${players}\n`;
    });
    return ctx.reply(text);
  }

  static async handleTopActiveInGroup(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await Group.findOne({ groupId: String(ctx.chat.id) });
    const rows = Array.isArray(group?.gameSystem?.scores) ? [...group.gameSystem.scores] : [];
    if (!rows.length) return ctx.reply('ℹ️ لا توجد بيانات تفاعل بعد.');
    rows.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    const top = rows.slice(0, 10);
    let text = '🔥 توب أكثر 10 متفاعلين بالقروب\n\n';
    top.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} — ${this.fmt(r.points || 0)}\n`;
    });
    return ctx.reply(text);
  }
}

module.exports = BankGameHandler;

