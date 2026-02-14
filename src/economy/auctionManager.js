const { Auction, User } = require('../database/models');
const EconomyManager = require('./economyManager');

const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000;
const MIN_INCREMENT = 25;

const AUCTION_ITEMS = [
  { id: 1, name: '⭐ تذكرة نجمة', basePrice: 500 },
  { id: 2, name: '👑 تاج ملكي', basePrice: 1000 },
  { id: 3, name: '💎 جوهرة فريدة', basePrice: 2000 },
  { id: 4, name: '🎖️ وسام شرف', basePrice: 750 },
  { id: 5, name: '✨ أضاءة سحرية', basePrice: 600 }
];

class AuctionManager {
  static getItems() {
    return AUCTION_ITEMS;
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

  static async createAuction(item) {
    const endAt = new Date(Date.now() + AUCTION_DURATION_MS);
    return Auction.create({
      itemId: item.id,
      itemName: item.name,
      basePrice: item.basePrice,
      minIncrement: MIN_INCREMENT,
      status: 'active',
      endAt
    });
  }

  static async ensureActiveAuctions(bot) {
    const now = Date.now();

    for (const item of AUCTION_ITEMS) {
      const active = await Auction.findOne({ itemId: item.id, status: 'active' });

      if (active && active.endAt.getTime() <= now) {
        await this.finalizeAuction(active, bot);
      }

      const stillActive = await Auction.findOne({ itemId: item.id, status: 'active' });
      if (!stillActive) {
        await this.createAuction(item);
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

    if (!winnerId) return;

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
}

module.exports = AuctionManager;
