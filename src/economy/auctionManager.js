const { Auction, User } = require('../database/models');
const EconomyManager = require('./economyManager');

const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000;
const MIN_INCREMENT = 25;

const SLOT_COUNT = 5;

const AUCTION_POOL = [
  { name: '⭐ تذكرة نجمة', basePrice: 500 },
  { name: '👑 تاج ملكي', basePrice: 1000 },
  { name: '💎 جوهرة فريدة', basePrice: 2000 },
  { name: '🎖️ وسام شرف', basePrice: 750 },
  { name: '✨ أضاءة سحرية', basePrice: 600 },
  { name: '🛡️ درع أسطوري', basePrice: 2200 },
  { name: '🗡️ سيف ضياء', basePrice: 1800 },
  { name: '🔮 بلورة الحكمة', basePrice: 1400 },
  { name: '🏺 كأس الندرة', basePrice: 1200 },
  { name: '🧿 تعويذة الحماية', basePrice: 900 },
  { name: '👑 تاج الملوك', basePrice: 2500 },
  { name: '💠 حجر السماء', basePrice: 1600 },
  { name: '🌙 قلادة الهلال', basePrice: 1100 },
  { name: '🔥 شعلة الفخر', basePrice: 1300 },
  { name: '⚡ صاعقة المجد', basePrice: 2100 },
  { name: '🧭 بوصلة الكنوز', basePrice: 1500 },
  { name: '📿 مسبحة نفيسة', basePrice: 800 },
  { name: '🏆 كأس البطولات', basePrice: 1700 },
  { name: '🪙 عملة نادرة', basePrice: 1900 },
  { name: '🎟️ بطاقة كبار الشخصيات', basePrice: 2300 }
];

class AuctionManager {
  static getItems() {
    return AUCTION_POOL;
  }

  static async broadcastMessage(bot, message) {
    if (!bot) return;
    const users = await User.find({ isBanned: { $ne: true } }).select('userId');
    for (const user of users) {
      if (!user.userId) continue;
      await bot.telegram.sendMessage(user.userId, message, { parse_mode: 'HTML' }).catch(() => {});
    }
  }

  static pickItem(excludedNames = []) {
    const pool = AUCTION_POOL.filter((item) => !excludedNames.includes(item.name));
    const list = pool.length ? pool : AUCTION_POOL;
    return list[Math.floor(Math.random() * list.length)];
  }

  static formatTimeLeft(endAt) {
    const msLeft = Math.max(0, endAt.getTime() - Date.now());
    const totalMinutes = Math.ceil(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) return `${minutes} دقيقة`;
    if (minutes === 0) return `${hours} ساعة`;
    return `${hours} ساعة و${minutes} دقيقة`;
  }

  static async createAuction(item, bot) {
    const endAt = new Date(Date.now() + AUCTION_DURATION_MS);
    const auction = await Auction.create({
      itemId: item.id,
      itemName: item.name,
      basePrice: item.basePrice,
      minIncrement: MIN_INCREMENT,
      status: 'active',
      endAt
    });

    await this.broadcastMessage(
      bot,
      `🆕 <b>مزاد جديد</b>\n\n🏷️ العنصر: ${item.name}\n💰 السعر الابتدائي: ${item.basePrice} عملة`
    );

    return auction;
  }

  static async ensureActiveAuctions(bot) {
    const now = Date.now();

    const activeAuctions = await Auction.find({ status: 'active' });
    const activeNames = activeAuctions.map((auction) => auction.itemName);

    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
      const active = await Auction.findOne({ itemId: slot, status: 'active' });

      if (active && active.endAt.getTime() <= now) {
        await this.finalizeAuction(active, bot);
      }

      const stillActive = await Auction.findOne({ itemId: item.id, status: 'active' });
      if (!stillActive) {
        const picked = this.pickItem(activeNames);
        activeNames.push(picked.name);
        await this.createAuction({ id: slot, ...picked }, bot);
      }
    }
  }

  static async finalizeExpiredAuctions(bot) {
    const expired = await Auction.find({ status: 'active', endAt: { $lte: new Date() } });
    for (const auction of expired) {
      await this.finalizeAuction(auction, bot);
    }
  }

  static async finalizeAuction(auction, bot) {
    if (!auction || auction.status !== 'active') return;

    auction.status = 'ended';
    await auction.save();

    const winnerId = auction.highestBid?.userId;
    const winnerAmount = auction.highestBid?.amount || 0;

    if (!winnerId) {
      await this.broadcastMessage(
        bot,
        `⏹️ <b>انتهى المزاد</b>\n\n🏷️ العنصر: ${auction.itemName}\nلم يتم تسجيل مزايدات.`
      );
      return;
    }

    const user = await User.findOne({ userId: winnerId });
    if (!user) return;

    user.inventory = user.inventory || [];
    user.inventory.push({
      itemId: `auction:${auction.itemId}`,
      itemName: auction.itemName,
      quantity: 1,
      boughtAt: new Date()
    });

    await user.save();

    if (bot) {
      await bot.telegram
        .sendMessage(
          winnerId,
          `🎉 <b>فزت بالمزاد!</b>\n\n` +
            `🏷️ العنصر: ${auction.itemName}\n` +
            `💰 السعر النهائي: ${winnerAmount} عملة`,
          { parse_mode: 'HTML' }
        )
        .catch(() => {});
    }

    const winnerName = user.firstName || (user.username ? `@${user.username}` : `مستخدم ${winnerId}`);
    await this.broadcastMessage(
      bot,
      `✅ <b>انتهى المزاد</b>\n\n🏷️ العنصر: ${auction.itemName}\n` +
        `🏆 الفائز: ${winnerName}\n💰 السعر النهائي: ${winnerAmount} عملة`
    );
  }

  static async getActiveAuctions(bot) {
    await this.ensureActiveAuctions(bot);
    return Auction.find({ status: 'active' }).sort({ itemId: 1 });
  }

  static async getAuctionByItemId(itemId) {
    return Auction.findOne({ itemId, status: 'active' });
  }

  static async placeBid(userId, itemId, amount, bot) {
    const auction = await this.getAuctionByItemId(itemId);
    if (!auction) {
      return { ok: false, message: '❌ لا يوجد مزاد نشط لهذا العنصر حالياً.' };
    }

    if (auction.endAt.getTime() <= Date.now()) {
      await this.finalizeAuction(auction, bot);
      return { ok: false, message: '⏳ انتهى المزاد للتو. افتح المزاد من جديد.' };
    }

    const minBid = auction.highestBid?.amount
      ? auction.highestBid.amount + auction.minIncrement
      : auction.basePrice;

    if (!Number.isFinite(amount) || amount < minBid) {
      return { ok: false, message: `❌ أقل مزايدة ممكنة: ${minBid} عملة.` };
    }

    const updatedBalance = await EconomyManager.removeCoins(
      userId,
      amount,
      `مزايدة على ${auction.itemName}`
    );

    if (updatedBalance === null) {
      return { ok: false, message: '❌ رصيدك غير كافٍ لهذه المزايدة.' };
    }

    if (auction.highestBid?.userId) {
      await EconomyManager.addCoins(
        auction.highestBid.userId,
        auction.highestBid.amount,
        `استرداد مزايدة على ${auction.itemName}`
      ).catch(() => {});
    }

    auction.highestBid = { userId, amount };
    auction.lastBidAt = new Date();
    auction.bids.push({ userId, amount });
    await auction.save();

    const bidder = await User.findOne({ userId }).select('firstName username');
    const bidderName = bidder?.firstName || (bidder?.username ? `@${bidder.username}` : `مستخدم ${userId}`);

    await this.broadcastMessage(
      bot,
      `📣 <b>مزايدة جديدة</b>\n\n` +
        `👤 ${bidderName}\n🏷️ ${auction.itemName}\n💰 ${amount} عملة`
    );

    return {
      ok: true,
      message:
        `✅ تم تسجيل مزايدتك على ${auction.itemName}\n` +
        `💰 المزايدة الحالية: ${amount} عملة\n` +
        `⏳ الوقت المتبقي: ${this.formatTimeLeft(auction.endAt)}`,
      balance: updatedBalance
    };
  }

  static formatAuctionList(auctions) {
    const lines = auctions.map((auction) => {
      const currentBid = auction.highestBid?.amount || auction.basePrice;
      const timeLeft = this.formatTimeLeft(auction.endAt);
      return `${auction.itemId}. ${auction.itemName} - ${currentBid} عملة (⏳ ${timeLeft})`;
    });

    return (
      '🎪 <b>سوق المزاد</b>\n\n' +
      `${lines.join('\n')}\n\n` +
      `💰 أرسل رقم العنصر للمزايدة أو اكتب (إلغاء)`
    );
  }

  static async sendTimeLeftNotifications(bot) {
    const auctions = await Auction.find({ status: 'active' });
    const now = Date.now();
    const reminderWindowMs = 5 * 60 * 60 * 1000;

    for (const auction of auctions) {
      const timeLeft = auction.endAt.getTime() - now;
      if (timeLeft <= 0) continue;

      const lastReminder = auction.lastReminderAt?.getTime() || 0;
      if (now - lastReminder < reminderWindowMs) continue;

      if (timeLeft <= reminderWindowMs) {
        auction.lastReminderAt = new Date();
        await auction.save();

        await this.broadcastMessage(
          bot,
          `⏳ <b>تنبيه مزاد</b>\n\n` +
            `تبقى وقت قليل على: ${auction.itemName}\n` +
            `⏰ المتبقي: ${this.formatTimeLeft(auction.endAt)}`
        );
      }
    }
  }
}

module.exports = AuctionManager;
