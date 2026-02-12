const { User, Transaction } = require('../database/models');
const Formatter = require('../ui/formatter');

class EconomyManager {
  // Get user balance
  static async getBalance(userId) {
    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await this.createUser(userId);
      }
      return user.coins;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Add coins
  static async addCoins(userId, amount, reason = 'general') {
    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await this.createUser(userId);
      }

      user.coins += amount;
      user.xp += Math.floor(amount / 10);
      await user.save();

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'earn',
        amount,
        reason,
        status: 'completed'
      });

      return user.coins;
    } catch (error) {
      console.error('Error adding coins:', error);
      return null;
    }
  }

  // Remove coins
  static async removeCoins(userId, amount, reason = 'general') {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      if (user.coins < amount) {
        return null; // Insufficient balance
      }

      user.coins -= amount;
      await user.save();

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'spend',
        amount,
        reason,
        status: 'completed'
      });

      return user.coins;
    } catch (error) {
      console.error('Error removing coins:', error);
      return null;
    }
  }

  // Transfer coins
  static async transferCoins(fromUserId, toUserId, amount) {
    try {
      const fromUser = await User.findOne({ userId: fromUserId });
      const toUser = await User.findOne({ userId: toUserId });

      if (!fromUser || !toUser) return false;
      if (fromUser.coins < amount) return false;

      fromUser.coins -= amount;
      toUser.coins += amount;
      toUser.xp += Math.floor(amount / 20);

      await fromUser.save();
      await toUser.save();

      // Create transaction records
      await Transaction.create({
        userId: fromUserId,
        type: 'transfer',
        amount,
        relatedUserId: toUserId,
        reason: 'تحويل إلى مستخدم آخر',
        status: 'completed'
      });

      await Transaction.create({
        userId: toUserId,
        type: 'earn',
        amount,
        relatedUserId: fromUserId,
        reason: 'استقبال تحويل',
        status: 'completed'
      });

      return true;
    } catch (error) {
      console.error('Error transferring coins:', error);
      return false;
    }
  }

  // Daily reward
  static async claimDailyReward(userId, userFirstName = '') {
    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await this.createUser(userId, { id: userId, first_name: userFirstName });
      }

      const now = new Date();
      const lastClaimed = user.dailyReward?.lastClaimed;

      // Check if already claimed today
      if (lastClaimed && this.isSameDay(now, lastClaimed)) {
        const nextClaimTime = new Date(lastClaimed);
        nextClaimTime.setDate(nextClaimTime.getDate() + 1);
        nextClaimTime.setHours(0, 0, 0);

        const hoursLeft = Math.ceil((nextClaimTime - now) / (1000 * 60 * 60));

        return {
          success: false,
          message: `⏰ يمكنك الادعاء مرة واحدة يومياً فقط\n⏳ حاول بعد ${hoursLeft} ساعة`,
          nextClaimTime: nextClaimTime
        };
      }

      // Initialize dailyReward if not exists
      if (!user.dailyReward) {
        user.dailyReward = { streak: 0, lastClaimed: null };
      }

      // Calculate reward based on streak (bonus for consecutive claims)
      let reward = 100; // Base reward
      let bonus = 0;

      if (user.dailyReward.streak > 0) {
        bonus = Math.min(user.dailyReward.streak * 20, 200); // Max bonus 200
        reward += bonus;
      }

      user.coins += reward;
      user.xp += 50;
      user.dailyReward.lastClaimed = now;
      user.dailyReward.streak = (user.dailyReward.streak || 0) + 1;

      await user.save();

      await Transaction.create({
        userId,
        type: 'reward',
        amount: reward,
        reason: `مكافأة يومية (يوم ${user.dailyReward.streak})`,
        status: 'completed'
      });

      let message = '🎁 <b>مكافأة يومية</b>\n\n';
      message += `💰 حصلت على <b>${reward}</b> عملة!\n`;
      if (bonus > 0) {
        message += `🎁 مكافأة إضافية: <b>${bonus}</b> عملة\n`;
      }
      message += '⭐ حصلت على <b>50</b> نقطة XP\n\n';
      message += `⛓️ <b>سلسلتك المتتالية:</b> <b>${user.dailyReward.streak}</b> يوم\n`;
      message += `💵 <b>رصيدك الجديد:</b> <b>${user.coins}</b> عملة\n\n`;
      message += '✨ تذكر: ادعِ المكافأة كل يوم للحفاظ على سلسلتك!';

      return {
        success: true,
        reward: reward,
        bonus: bonus,
        streak: user.dailyReward.streak,
        totalCoins: user.coins,
        message: message
      };
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      return {
        success: false,
        message: '❌ حدث خطأ في استرجاع المكافأة'
      };
    }
  }

  // Shop system - get items
  static getShopItems() {
    return [
      { id: 1, name: '⭐ نجمة برّاقة', price: 100, emoji: '⭐' },
      { id: 2, name: '🎖️ ميدالية ذهبية', price: 250, emoji: '🎖️' },
      { id: 3, name: '👑 تاج ملكي', price: 500, emoji: '👑' },
      { id: 4, name: '🎯 درع الشرف', price: 1000, emoji: '🎯' },
      { id: 5, name: '💎 جوهرة نادرة', price: 2000, emoji: '💎' }
    ];
  }

  // Buy item
  static async buyItem(userId, itemId) {
    try {
      const items = this.getShopItems();
      const item = items.find(i => i.id === parseInt(itemId));

      if (!item) return { success: false, message: '❌ العنصر غير موجود' };

      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: '❌ المستخدم غير موجود' };

      if (user.coins < item.price) {
        return {
          success: false,
          message: `❌ رصيدك غير كافي. تحتاج ${item.price - user.coins} عملة أخرى`
        };
      }

      user.coins -= item.price;
      const existingItem = user.inventory.find(i => i.itemId === String(item.id));

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        user.inventory.push({
          itemId: String(item.id),
          itemName: item.name,
          quantity: 1,
          boughtAt: new Date()
        });
      }

      await user.save();

      return {
        success: true,
        message: `✅ تم شراء ${item.name}!\n💰 رصيدك الجديد: ${user.coins}`
      };
    } catch (error) {
      console.error('Error buying item:', error);
      return { success: false, message: '❌ حدث خطأ في الشراء' };
    }
  }

  // Create new user with initial coins
  static async createUser(userId, userData = {}) {
    try {
      const user = new User({
        userId,
        firstName: userData.first_name || 'مستخدم',
        lastName: userData.last_name || '',
        username: userData.username || '',
        coins: 100,
        xp: 0
      });
      await user.save();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Helper: Check if same day
  static isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Get user economy stats
  static async getEconomyStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
      const totalEarned = transactions
        .filter(t => t.type === 'earn')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSpent = transactions
        .filter(t => t.type === 'spend')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        balance: user.coins,
        level: user.level,
        totalEarned,
        totalSpent,
        itemsOwned: user.inventory.length,
        transactions: transactions.slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting economy stats:', error);
      return null;
    }
  }
}

module.exports = EconomyManager;
