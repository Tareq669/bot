const Markup = require('telegraf/markup');
const { User, Group } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const ASSETS = {
  car: { name: 'سيارة', aliases: ['سيارة', 'سياره', 'السيارة', 'السياره'], buy: 35, sellFactor: 0.7 },
  diamond: { name: 'ماسة', aliases: ['ماسة', 'ماسه', 'الماسة', 'الماسه'], buy: 75, sellFactor: 0.7 },
  house: { name: 'بيت', aliases: ['بيت', 'البيت'], buy: 45, sellFactor: 0.7 },
  palace: { name: 'قصر', aliases: ['قصر', 'القصر'], buy: 120, sellFactor: 0.7 },
  villa: { name: 'فيلا', aliases: ['فيلا', 'الفيلا'], buy: 70, sellFactor: 0.7 },
  rose: { name: 'وردة', aliases: ['وردة', 'ورده', 'ورود', 'وردة'], buy: 2, sellFactor: 0.7 }
};

class BankGameHandler {
  static WIFE_SLOT_LABELS = ['الاولى', 'الثانية', 'الثالثة', 'الرابعة'];
  static OWNER_ONLY_ID = 1584983530;

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

  static generateCardNumber(cardType = 'visa') {
    const digits = String(Date.now()).slice(-10) + String(Math.floor(100000 + Math.random() * 900000));
    const body = digits.slice(0, 15);
    if (cardType === 'mastercard') return `5${body}`.slice(0, 16);
    if (cardType === 'payoneer') return `6${body}`.slice(0, 16);
    return `4${body}`.slice(0, 16);
  }

  static getCardTypeLabel(cardType = '') {
    const normalized = String(cardType || '').toLowerCase();
    if (normalized === 'mastercard') return 'ماستر كارد';
    if (normalized === 'payoneer') return 'بايونير';
    return 'فيزا';
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
      blockedFromGame: false,
      divorcedMenCount: 0,
      divorcedWomenCount: 0,
      cardType: '',
      cardNumber: '',
      salaryLastAt: 0,
      tipLastAt: 0,
      stealLastAt: 0,
      stealTotal: 0,
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
      debtDueAt: 0,
      marriages: {
        wives: [],
        husbandId: 0,
        husbandName: '',
        husbandMahr: 0,
        husbandSince: 0,
        wifeSlot: 0
      }
    };
  }

  static normalizeProfile(p = {}) {
    const x = { ...this.defaultBankProfile(), ...(p || {}) };
    x.balance = Math.max(0, Number(x.balance || 0));
    x.blockedFromGame = Boolean(x.blockedFromGame);
    x.divorcedMenCount = Math.max(0, Number(x.divorcedMenCount || 0));
    x.divorcedWomenCount = Math.max(0, Number(x.divorcedWomenCount || 0));
    x.cardType = String(x.cardType || '');
    x.cardNumber = String(x.cardNumber || '');
    x.salaryLastAt = Number(x.salaryLastAt || 0);
    x.tipLastAt = Number(x.tipLastAt || 0);
    x.stealLastAt = Number(x.stealLastAt || 0);
    x.stealTotal = Math.max(0, Number(x.stealTotal || 0));
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
    x.marriages = x.marriages && typeof x.marriages === 'object' ? x.marriages : {};
    x.marriages.wives = Array.isArray(x.marriages.wives)
      ? x.marriages.wives.map((wife) => ({
        slot: Math.max(1, Math.min(4, Number(wife?.slot || 0))),
        userId: Number(wife?.userId || 0),
        name: String(wife?.name || ''),
        mahr: Math.max(0, Number(wife?.mahr || 0)),
        marriedAt: Number(wife?.marriedAt || 0)
      })).filter((wife) => wife.slot && wife.userId)
      : [];
    x.marriages.wives = x.marriages.wives
      .sort((a, b) => a.slot - b.slot)
      .filter((wife, index, arr) => arr.findIndex((item) => item.slot === wife.slot) === index);
    x.marriages.husbandId = Math.max(0, Number(x.marriages.husbandId || 0));
    x.marriages.husbandName = String(x.marriages.husbandName || '');
    x.marriages.husbandMahr = Math.max(0, Number(x.marriages.husbandMahr || 0));
    x.marriages.husbandSince = Number(x.marriages.husbandSince || 0);
    x.marriages.wifeSlot = Math.max(0, Math.min(4, Number(x.marriages.wifeSlot || 0)));
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
    if (p.blockedFromGame) return ctx.reply('⛔ تم حظرك من لعبة البنك.');
    if (requireAccount && !p.created) return ctx.reply('❌ ما عندك حساب بنكي. اكتب: انشاء حساب بنكي');
    if (!allowWhenJailed && this.isJailed(p)) return ctx.reply('⛓️ أنت بالسجن بسبب ديون متأخرة. اكتب: سداد ديوني');
    const result = await fn(user, p);
    user.bankProfile = p;
    await user.save();
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, user, ctx?.from, p.balance);
    return result;
  }

  static async syncBankBalanceToGameWallet(chatId, userDoc, userRef, balance) {
    const groupId = String(chatId || '');
    const uid = Number(userRef?.id || userRef?.userId || userDoc?.userId || 0);
    if (!groupId || !uid) return;
    const safeBalance = Math.max(0, Number(balance || 0));

    // Sync global profile points to bank balance.
    const doc = userDoc || await User.findOne({ userId: uid });
    if (doc) {
      const profile = (doc.globalGameProfile && typeof doc.globalGameProfile === 'object')
        ? { ...doc.globalGameProfile }
        : {};
      profile.points = safeBalance;
      profile.migrated = true;
      doc.globalGameProfile = profile;
      await doc.save();
    }

    // Sync current group score row points to bank balance.
    const group = await Group.findOne({ groupId });
    if (!group) return;
    if (!group.gameSystem) group.gameSystem = {};
    if (!Array.isArray(group.gameSystem.scores)) group.gameSystem.scores = [];
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === uid);
    if (!row) {
      group.gameSystem.scores.push({
        userId: uid,
        username: userRef?.username || userRef?.first_name || `user_${uid}`,
        points: safeBalance,
        weeklyPoints: 0,
        monthlyPoints: 0,
        giftInventory: []
      });
      row = group.gameSystem.scores[group.gameSystem.scores.length - 1];
    }
    row.points = safeBalance;
    await group.save();
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

    // Keep global profile in sync, otherwise GroupGames sync may overwrite group row later.
    const userDoc = await User.findOne({ userId });
    if (!userDoc) return;
    const profile = (userDoc.globalGameProfile && typeof userDoc.globalGameProfile === 'object')
      ? { ...userDoc.globalGameProfile }
      : {};
    const inv = Array.isArray(profile.giftInventory)
      ? profile.giftInventory.map((x) => ({
        key: String(x?.key || ''),
        name: String(x?.name || x?.key || ''),
        count: Math.max(0, Number(x?.count || 0))
      })).filter((x) => x.key)
      : [];
    const gIdx = inv.findIndex((g) => g.key === key);
    if (gIdx < 0) {
      if (delta > 0) inv.push({ key, name, count: Number(delta) });
    } else {
      inv[gIdx].count = Math.max(0, Number(inv[gIdx].count || 0) + Number(delta || 0));
      inv[gIdx].name = name;
      if (inv[gIdx].count <= 0) inv.splice(gIdx, 1);
    }
    profile.giftInventory = inv;
    profile.migrated = true;
    userDoc.globalGameProfile = profile;
    await userDoc.save();
  }

  static parseTargetFromReply(ctx) {
    const u = ctx?.message?.reply_to_message?.from;
    if (!u || u.is_bot) return null;
    return { id: Number(u.id), username: u.username || '', first_name: u.first_name || String(u.id) };
  }

  static normalizeMarriageSlot(value) {
    const text = String(value || '').trim().toLowerCase();
    const normalized = text
      .replace(/[إأآ]/g, 'ا')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/ى/g, 'ي');
    const map = {
      '1': 1,
      'الاولى': 1,
      'الاولي': 1,
      'اولى': 1,
      'اولي': 1,
      'الأولى': 1,
      '2': 2,
      'الثانية': 2,
      'الثانيه': 2,
      'ثانية': 2,
      'ثانيه': 2,
      '3': 3,
      'الثالثة': 3,
      'الثالثه': 3,
      'ثالثة': 3,
      'ثالثه': 3,
      '4': 4,
      'الرابعة': 4,
      'الرابعه': 4,
      'رابعة': 4,
      'رابعه': 4
    };
    return map[normalized] || 0;
  }

  static getWifeSlotLabel(slot) {
    return this.WIFE_SLOT_LABELS[Math.max(0, Number(slot || 1) - 1)] || `رقم ${slot}`;
  }

  static formatMarriageLine(wife) {
    return `• الزوجة ${this.getWifeSlotLabel(wife.slot)} ↤︎ ${wife.name}\n• المهر ↤︎ ${this.fmt(wife.mahr)}\n• منذ ↤︎ ${wife.marriedAt ? new Date(wife.marriedAt).toLocaleDateString('en-GB') : 'غير معروف'}`;
  }

  static parseMarriageCommand(text, actionRegex) {
    const raw = String(text || '').trim();
    const match = actionRegex.exec(raw);
    if (!match) return null;
    const slot = this.normalizeMarriageSlot(match[1]);
    const amount = match[2] ? this.parseIntSafe(match[2]) : 0;
    return { slot, amount };
  }

  static getMarriageBySlot(profile, slot) {
    const wives = Array.isArray(profile?.marriages?.wives) ? profile.marriages.wives : [];
    return wives.find((wife) => Number(wife.slot) === Number(slot)) || null;
  }

  static async handleMarriage(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const parsed = this.parseMarriageCommand(
      ctx.message?.text || '',
      /^زواج\s+(الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])(?:\s+(\d+))?$/i
    );
    if (!parsed?.slot || !Number.isFinite(parsed.amount) || parsed.amount <= 0) {
      return ctx.reply('❌ الصيغة:\n• زواج الاولى 12000\n• زواج الثانيه 3000\nويكون بالرد على الشخص.');
    }
    const target = this.parseTargetFromReply(ctx);
    if (!target) return ctx.reply('❌ الزواج يكون بالرد على رسالة الشخص.');
    if (Number(target.id) === Number(ctx.from?.id || 0)) return ctx.reply('❌ ما بصير تتزوج نفسك.');

    const husband = await this.ensureUser(ctx.from);
    const wifeDoc = await this.ensureUser(target);
    const hp = this.normalizeProfile(husband.bankProfile || {});
    const wp = this.normalizeProfile(wifeDoc.bankProfile || {});
    if (!hp.created || !wp.created) return ctx.reply('❌ لازم الطرفين يكون عندهم حساب بنكي.');
    if (this.isJailed(hp)) return ctx.reply('⛓️ أنت بالسجن بسبب ديون متأخرة.');
    if (this.isJailed(wp)) return ctx.reply('⛓️ الطرف الثاني مسجون بسبب ديون متأخرة.');
    if (this.getMarriageBySlot(hp, parsed.slot)) {
      return ctx.reply(`❌ عندك زوجة مسجلة بالفعل في خانة ${this.getWifeSlotLabel(parsed.slot)}.`);
    }
    if ((hp.marriages?.wives || []).length >= 4) {
      return ctx.reply('❌ وصلت الحد الأقصى: 4 زوجات.');
    }
    if (Number(wp.marriages?.husbandId || 0) > 0) {
      return ctx.reply('❌ هذا العضو متزوج/ة بالفعل.');
    }
    if (hp.balance < parsed.amount) {
      return ctx.reply(`❌ رصيدك غير كافٍ للمهر.\n• المطلوب: ${this.fmt(parsed.amount)}\n• رصيدك: ${this.fmt(hp.balance)}`);
    }

    hp.balance -= parsed.amount;
    wp.balance += parsed.amount;
    hp.marriages.wives.push({
      slot: parsed.slot,
      userId: Number(target.id),
      name: target.first_name || target.username || String(target.id),
      mahr: parsed.amount,
      marriedAt: this.now()
    });
    hp.marriages.wives.sort((a, b) => a.slot - b.slot);
    wp.marriages.husbandId = Number(ctx.from.id);
    wp.marriages.husbandName = ctx.from.first_name || ctx.from.username || String(ctx.from.id);
    wp.marriages.husbandMahr = parsed.amount;
    wp.marriages.husbandSince = this.now();
    wp.marriages.wifeSlot = parsed.slot;

    husband.bankProfile = hp;
    wifeDoc.bankProfile = wp;
    await Promise.all([husband.save(), wifeDoc.save()]);
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, husband, ctx?.from, hp.balance);
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, wifeDoc, target, wp.balance);
    return ctx.reply(
      '💍 تم الزواج بنجاح\n' +
      `• الزوج ↤︎ ${ctx.from.first_name || ctx.from.username || ctx.from.id}\n` +
      `• الزوجة ${this.getWifeSlotLabel(parsed.slot)} ↤︎ ${target.first_name || target.username || target.id}\n` +
      `• المهر ↤︎ ${this.fmt(parsed.amount)}\n` +
      `• رصيدك الآن ↤︎ ${this.fmt(hp.balance)}`
    );
  }

  static async handleDivorce(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const parsed = this.parseMarriageCommand(
      ctx.message?.text || '',
      /^طلاق\s+(الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i
    );
    if (!parsed?.slot) return ctx.reply('❌ الصيغة: طلاق الاولى');

    const husband = await this.ensureUser(ctx.from);
    const hp = this.normalizeProfile(husband.bankProfile || {});
    const wife = this.getMarriageBySlot(hp, parsed.slot);
    if (!wife) return ctx.reply(`❌ ما عندك زوجة في خانة ${this.getWifeSlotLabel(parsed.slot)}.`);

    const wifeDoc = await this.ensureUser({ id: wife.userId, first_name: wife.name, username: wife.name });
    const wp = this.normalizeProfile(wifeDoc.bankProfile || {});
    hp.marriages.wives = (hp.marriages.wives || []).filter((item) => Number(item.slot) !== Number(parsed.slot));
    if (Number(wp.marriages?.husbandId || 0) === Number(ctx.from.id)) {
      wp.marriages.husbandId = 0;
      wp.marriages.husbandName = '';
      wp.marriages.husbandMahr = 0;
      wp.marriages.husbandSince = 0;
      wp.marriages.wifeSlot = 0;
      wp.divorcedWomenCount = Math.max(0, Number(wp.divorcedWomenCount || 0)) + 1;
    }
    husband.bankProfile = hp;
    wifeDoc.bankProfile = wp;
    await Promise.all([husband.save(), wifeDoc.save()]);
    return ctx.reply(`💔 تم طلاق الزوجة ${this.getWifeSlotLabel(parsed.slot)} ↤︎ ${wife.name}`);
  }

  static async handleDivorceAll(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const husband = await this.ensureUser(ctx.from);
    const hp = this.normalizeProfile(husband.bankProfile || {});
    const wives = [...(hp.marriages?.wives || [])];
    if (!wives.length) return ctx.reply('❌ ما عندك زوجات مسجلات.');
    for (const wife of wives) {
      const wifeDoc = await this.ensureUser({ id: wife.userId, first_name: wife.name, username: wife.name });
      const wp = this.normalizeProfile(wifeDoc.bankProfile || {});
      if (Number(wp.marriages?.husbandId || 0) === Number(ctx.from.id)) {
        wp.marriages.husbandId = 0;
        wp.marriages.husbandName = '';
        wp.marriages.husbandMahr = 0;
        wp.marriages.husbandSince = 0;
        wp.marriages.wifeSlot = 0;
        wp.divorcedWomenCount = Math.max(0, Number(wp.divorcedWomenCount || 0)) + 1;
      }
      wifeDoc.bankProfile = wp;
      await wifeDoc.save();
    }
    hp.marriages.wives = [];
    husband.bankProfile = hp;
    await husband.save();
    return ctx.reply(`💔 تم طلاق زوجاتك كلهن.\n• العدد ↤︎ ${wives.length}`);
  }

  static async handleKhula(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const wifeDoc = await this.ensureUser(ctx.from);
    const wp = this.normalizeProfile(wifeDoc.bankProfile || {});
    if (Number(wp.marriages?.husbandId || 0) <= 0) return ctx.reply('❌ ما عندك زوج حتى يتم الخلع.');
    const husbandDoc = await this.ensureUser({
      id: wp.marriages.husbandId,
      first_name: wp.marriages.husbandName,
      username: wp.marriages.husbandName
    });
    const hp = this.normalizeProfile(husbandDoc.bankProfile || {});
    const slot = Number(wp.marriages.wifeSlot || 0);
    hp.marriages.wives = (hp.marriages.wives || []).filter((item) => Number(item.slot) !== slot || Number(item.userId) !== Number(ctx.from.id));
    wp.marriages.husbandId = 0;
    wp.marriages.husbandName = '';
    wp.marriages.husbandMahr = 0;
    wp.marriages.husbandSince = 0;
    wp.marriages.wifeSlot = 0;
    wp.divorcedWomenCount = Math.max(0, Number(wp.divorcedWomenCount || 0)) + 1;
    hp.divorcedMenCount = Math.max(0, Number(hp.divorcedMenCount || 0)) + 1;
    husbandDoc.bankProfile = hp;
    wifeDoc.bankProfile = wp;
    await Promise.all([husbandDoc.save(), wifeDoc.save()]);
    return ctx.reply('⚖️ تم الخلع بنجاح.');
  }

  static async handleMarriageInfo(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const doc = await this.ensureUser(ctx.from);
    const p = this.normalizeProfile(doc.bankProfile || {});
    const wives = p.marriages?.wives || [];
    if (!wives.length && Number(p.marriages?.husbandId || 0) <= 0) {
      return ctx.reply('💤 لا يوجد زواج مسجل عندك.');
    }
    if (wives.length) {
      let text = '💍 زواجي\n\n';
      wives.forEach((wife) => {
        text += `${this.formatMarriageLine(wife)}\n\n`;
      });
      return ctx.reply(text.trim());
    }
    return ctx.reply(
      '💍 زواجي\n\n' +
      `• الزوج ↤︎ ${p.marriages.husbandName || p.marriages.husbandId}\n` +
      `• ترتيبي ↤︎ ${this.getWifeSlotLabel(p.marriages.wifeSlot || 1)}\n` +
      `• المهر ↤︎ ${this.fmt(p.marriages.husbandMahr || 0)}`
    );
  }

  static async handleWivesList(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const doc = await this.ensureUser(ctx.from);
    const p = this.normalizeProfile(doc.bankProfile || {});
    const wives = p.marriages?.wives || [];
    if (!wives.length) return ctx.reply('❌ ما عندك زوجات مسجلات.');
    let text = '👰 زوجاتي\n\n';
    wives.forEach((wife) => {
      text += `${this.formatMarriageLine(wife)}\n\n`;
    });
    return ctx.reply(text.trim());
  }

  static async handleSpecificWife(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const match = /^زوجتي\s+(الاولى|الأولى|اولى|الثانية|الثانيه|ثانية|الثالثة|الثالثه|ثالثة|الرابعة|الرابعه|رابعة|[1-4])$/i.exec(String(ctx.message?.text || '').trim());
    const slot = this.normalizeMarriageSlot(match?.[1] || '');
    if (!slot) return ctx.reply('❌ الصيغة: زوجتي الاولى');
    const doc = await this.ensureUser(ctx.from);
    const p = this.normalizeProfile(doc.bankProfile || {});
    const wife = this.getMarriageBySlot(p, slot);
    if (!wife) return ctx.reply(`❌ ما عندك زوجة ${this.getWifeSlotLabel(slot)}.`);
    return ctx.reply(`👰 ${this.formatMarriageLine(wife)}`);
  }

  static async handleTopMarried(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const users = await User.find({ 'bankProfile.marriages.wives.0': { $exists: true } })
      .select('firstName username bankProfile')
      .limit(200);
    if (!users.length) return ctx.reply('ℹ️ لا يوجد متزوجين بعد.');
    const top = users
      .map((user) => {
        const p = this.normalizeProfile(user.bankProfile || {});
        const firstWife = (p.marriages?.wives || []).find((wife) => Number(wife.slot) === 1) || p.marriages?.wives?.[0] || null;
        return {
          name: user.firstName || user.username || String(user.userId),
          wifeName: firstWife?.name || 'غير معروف',
          mahr: Number(firstWife?.mahr || 0)
        };
      })
      .filter((row) => row.mahr > 0)
      .sort((a, b) => b.mahr - a.mahr)
      .slice(0, 10);
    if (!top.length) return ctx.reply('ℹ️ لا يوجد بيانات زواج كافية بعد.');
    let text = '💍 توب المتزوجين\n\n';
    top.forEach((row, index) => {
      text += `${index + 1}. ${row.name} — الزوجة الاولى: ${row.wifeName} | المهر: ${this.fmt(row.mahr)}\n`;
    });
    return ctx.reply(text);
  }

  static async handleDeleteMarried(ctx) {
    if (!this.isGroupChat(ctx)) return;
    if (Number(ctx.from?.id || 0) !== this.OWNER_ONLY_ID) {
      return ctx.reply('❌ هذا الأمر للمالك الأساسي فقط.');
    }
    const users = await User.find({
      $or: [
        { 'bankProfile.marriages.wives.0': { $exists: true } },
        { 'bankProfile.marriages.husbandId': { $gt: 0 } }
      ]
    });
    for (const user of users) {
      const p = this.normalizeProfile(user.bankProfile || {});
      p.marriages = this.defaultBankProfile().marriages;
      user.bankProfile = p;
      await user.save();
    }
    return ctx.reply(`🗑️ تم حذف المتزوجين من النظام.\n• العدد ↤︎ ${users.length}`);
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
    return ctx.reply(
      '↢ عشان تسوي حساب لازم تختار نوع البطاقة\n\n' +
      '↤︎ الفيزا\n' +
      '↤︎ ماستر كارد\n' +
      '↤︎ بايونير\n\n' +
      '- اضغط للنسخ',
      Markup.inlineKeyboard([
        [Markup.button.callback('↤︎ فيزا', 'bank:create:visa')],
        [Markup.button.callback('↤︎ ماستر كارد', 'bank:create:mastercard')],
        [Markup.button.callback('↤︎ بايونير', 'bank:create:payoneer')]
      ])
    );
  }

  static async handleCreateAccountCard(ctx, cardType) {
    const user = await this.ensureUser(ctx.from);
    const p = this.normalizeProfile(user.bankProfile || {});
    if (p.created) {
      await ctx.answerCbQuery('الحساب موجود بالفعل');
      return ctx.reply('🏦 حسابك البنكي موجود بالفعل.');
    }
    p.created = true;
    p.cardType = String(cardType || 'visa');
    p.cardNumber = this.generateCardNumber(p.cardType);
    const globalPoints = Math.max(0, Number(user?.globalGameProfile?.points || 0));
    p.balance = Math.max(10000, Number(p.balance || 0), globalPoints);
    user.bankProfile = p;
    await user.save();
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, user, ctx?.from, p.balance);
    await ctx.answerCbQuery('تم إنشاء الحساب');
    const displayName = String(ctx.from?.first_name || 'المستخدم');
    return ctx.reply(
      `↢ وسوينا لك حساب في البنك باسم (${displayName} 💳)\n\n` +
      `↢ رقم حسابك ↢ ( ${p.cardNumber} )\n` +
      `↢ نوع البطاقة ↢ ( ${this.getCardTypeLabel(p.cardType)} )\n` +
      `↢ فلوسك ↢ ( ${this.fmt(p.balance)} )`
    );
  }

  static async handleSalary(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
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
        await this.syncBankBalanceToGameWallet(ctx?.chat?.id, targetDoc, target, tp.balance);
        return ctx.reply(`🚨 انمسكت! خسرّت غرامة ${this.fmt(fine)}\n• رصيدك: ${this.fmt(p.balance)}`);
      }

      const stealAmount = Math.max(1000, Math.floor(tp.balance * (0.01 + Math.random() * 0.07)));
      const amount = Math.min(stealAmount, tp.balance);
      tp.balance -= amount;
      p.balance += this.applyBoost(amount, p);
      p.stealTotal = Math.max(0, Number(p.stealTotal || 0)) + amount;
      meDoc.bankProfile = p;
      targetDoc.bankProfile = tp;
      await Promise.all([meDoc.save(), targetDoc.save()]);
      await this.syncBankBalanceToGameWallet(ctx?.chat?.id, targetDoc, target, tp.balance);
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

    const asset = ASSETS[assetKey];
    const cost = Number(asset.buy || 0) * qty;
    if (Number(sp.balance || 0) < cost) {
      await ctx.reply(`❌ فلوسك ما تكفي للإهداء. المطلوب: ${this.fmt(cost)}`);
      return true;
    }

    sp.balance = Number(sp.balance || 0) - cost;
    rp.assets[assetKey] = Number(rp.assets[assetKey] || 0) + qty;
    sender.bankProfile = sp;
    receiver.bankProfile = rp;
    await Promise.all([sender.save(), receiver.save()]);
    await this.adjustGroupGiftInventory(ctx.chat.id, target, assetKey, qty);
    await this.syncBankBalanceToGameWallet(ctx.chat.id, sender, ctx.from, sp.balance);
    const senderMention = `<a href="tg://user?id=${Number(ctx.from?.id || 0)}">${String(ctx.from?.first_name || ctx.from?.username || 'عضو').replace(/[<&>]/g, '')}</a>`;
    const receiverMention = `<a href="tg://user?id=${Number(target.id || 0)}">${String(target.first_name || target.username || 'عضو').replace(/[<&>]/g, '')}</a>`;
    await ctx.reply(
      '🎁 <b>عملية اهداء</b>\n\n' +
      `• الاهداء من : ${senderMention}\n` +
      `• نوع الهدية : ${asset.name}\n` +
      `• عدد : ${qty}\n` +
      `• المستلم : ${receiverMention}\n` +
      `• تكلفة الاهداء : ${this.fmt(cost)}`,
      {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id
      }
    );
    return true;
  }

  static async handleAccountInfo(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return this.withBank(ctx, async (_user, p) => {
      const totalAssets = Object.values(p.assets || {}).reduce((sum, value) => sum + Number(value || 0), 0);
      return ctx.reply(
        '🏦 حسابي\n\n' +
        `• نوع البطاقة ↤︎ ${this.getCardTypeLabel(p.cardType)}\n` +
        `• رقم البطاقة ↤︎ \`${p.cardNumber || 'غير محدد'}\`\n` +
        `• فلوسي ↤︎ ${this.fmt(p.balance)}\n` +
        `• أسهمي ↤︎ ${Number(p.stocksUnits || 0)}\n` +
        `• ديوني ↤︎ ${this.fmt(p.debtAmount || 0)}\n` +
        `• ممتلكاتي ↤︎ ${totalAssets}`,
        { parse_mode: 'Markdown' }
      );
    }, { requireAccount: true, allowWhenJailed: true });
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
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, payer, ctx?.from, pp.balance);
    await this.syncBankBalanceToGameWallet(ctx?.chat?.id, debtor, target, dp.balance);
    return ctx.reply(`🤝 تم سداد ${this.fmt(pay)} من ديون العضو.\n• رصيدك: ${this.fmt(pp.balance)}`);
  }

  static async handleTopGroups(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const groups = await Group.find({})
      .sort({ 'statistics.messagesCount': -1 })
      .limit(20)
      .select('groupTitle statistics.messagesCount gameSystem.scores');
    if (!groups.length) return ctx.reply('ℹ️ لا توجد بيانات قروبات بعد.');
    let text = 'توب اكثر 20 قروب :\n\n';
    groups.forEach((g, i) => {
      const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const msgCount = Number(g.statistics?.messagesCount || 0).toLocaleString('en-US');
      const name = String(g.groupTitle || 'Group').trim() || 'Group';
      text += `${rank} ) ${msgCount}   l  ${name}\n`;
    });
    return ctx.reply(text);
  }

  static async handleTopGames(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const groups = await Group.find({})
      .limit(50)
      .select('groupTitle gameSystem.scores');
    if (!groups.length) return ctx.reply('ℹ️ لا توجد بيانات ألعاب بعد.');

    const rows = groups.map((g) => {
      const scores = Array.isArray(g.gameSystem?.scores) ? g.gameSystem.scores : [];
      const gameScore = scores.reduce((sum, row) => {
        return sum
          + Number(row?.messageCount || 0)
          + Number(row?.weeklyPoints || 0)
          + Number(row?.monthlyPoints || 0);
      }, 0);
      return {
        title: String(g.groupTitle || 'Group').trim() || 'Group',
        score: Math.max(0, Number(gameScore || 0))
      };
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    if (!rows.length || rows.every((x) => x.score <= 0)) {
      return ctx.reply('• لا يوجد احد فالتوب');
    }

    let text = 'توب اكثر 20 قروب يلعبون :\n\n';
    rows.forEach((row, i) => {
      const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      text += `${rank} ) ${Number(row.score || 0).toLocaleString('en-US')}   l  ${row.title}\n`;
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

  static async handleTopThieves(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const users = await User.find({ 'bankProfile.stealTotal': { $gt: 0 } })
      .select('userId firstName username bankProfile.stealTotal')
      .sort({ 'bankProfile.stealTotal': -1 })
      .limit(20)
      .lean();

    if (!users.length) return ctx.reply('• لا يوجد احد فالتوب');

    let text = 'توب اكثر 20 شخص حرامية فلوس:\n\n';
    users.forEach((u, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      const stolen = Math.max(0, Number(u?.bankProfile?.stealTotal || 0)).toLocaleString('en-US');
      const name = String(u.firstName || u.username || `user_${u.userId}`).trim() || `user_${u.userId}`;
      text += `${rank} ) ${stolen} 💰 l ${name}\n`;
    });

    return ctx.reply(text);
  }

  static isCheaterUser(userDoc, profile) {
    const balance = Math.max(0, Number(profile?.balance || 0));
    const firstName = String(userDoc?.firstName || '').trim();
    const username = String(userDoc?.username || '').trim();
    const hasAtSignInName = firstName.includes('@');
    const absurdBalance = balance > 9_000_000_000_000_000;
    const hasAtInUsername = username.startsWith('@');
    return hasAtSignInName || hasAtInUsername || absurdBalance;
  }

  static async handleTopMoney(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const users = await User.find({ 'bankProfile.created': true })
      .select('userId firstName username bankProfile')
      .limit(500);

    if (!users.length) return ctx.reply('• لا يوجد احد فالتوب');

    const rows = [];
    for (const user of users) {
      const p = this.normalizeProfile(user.bankProfile || {});
      if (this.isCheaterUser(user, p)) {
        p.balance = 0;
        p.blockedFromGame = true;
        user.bankProfile = p;
        await user.save();
        continue;
      }
      if (p.blockedFromGame) continue;
      rows.push({
        userId: Number(user.userId || 0),
        name: String(user.firstName || user.username || `user_${user.userId}`),
        balance: Math.max(0, Number(p.balance || 0))
      });
    }

    rows.sort((a, b) => b.balance - a.balance);
    const top = rows.slice(0, 30);
    if (!top.length) return ctx.reply('• لا يوجد احد فالتوب');

    let text = 'توب اغنى 30 شخص :\n\n';
    top.forEach((row, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      const amount = Math.max(0, Number(row.balance || 0)).toLocaleString('en-US');
      text += `${rank} ) ${amount} 💰 l ${row.name}\n`;
    });
    return ctx.reply(text);
  }

  static async handleTopDivorcedWomen(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const users = await User.find({ 'bankProfile.divorcedWomenCount': { $gt: 0 } })
      .select('firstName username bankProfile.divorcedWomenCount')
      .sort({ 'bankProfile.divorcedWomenCount': -1 })
      .limit(20)
      .lean();

    if (!users.length) return ctx.reply('• لا يوجد احد فالتوب');

    let text = 'توب اكثر 20 مطلقه بالبوت :\n\n';
    users.forEach((u, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      const count = Math.max(0, Number(u?.bankProfile?.divorcedWomenCount || 0));
      const name = String(u.firstName || u.username || 'no').trim() || 'no';
      text += `${rank} ) ${count} 🙎🏻‍♀️ l ${name}\n`;
    });
    text += ' ━━━━━━━━━\n\n-';
    return ctx.reply(text);
  }

  static async handleTopDivorcedMen(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const users = await User.find({ 'bankProfile.divorcedMenCount': { $gt: 0 } })
      .select('firstName username bankProfile.divorcedMenCount')
      .sort({ 'bankProfile.divorcedMenCount': -1 })
      .limit(20)
      .lean();

    if (!users.length) return ctx.reply('• لا يوجد احد فالتوب');

    let text = 'توب اكثر 20 مخلوع بالبوت :\n\n';
    users.forEach((u, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      const count = Math.max(0, Number(u?.bankProfile?.divorcedMenCount || 0));
      const name = String(u.firstName || u.username || 'no').trim() || 'no';
      text += `${rank} ) ${count} 🙎🏻‍♂️ l ${name}\n`;
    });
    text += ' ━━━━━━━━━\n\n-';
    return ctx.reply(text);
  }
}

module.exports = BankGameHandler;
