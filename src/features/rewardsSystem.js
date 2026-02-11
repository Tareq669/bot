const { User } = require('../database/models');

class RewardsSystem {
  /**
   * Loot Box System
   */
  static async openLootBox(userId, boxType = 'basic') {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      const boxes = {
        'basic': { cost: 100, name: 'صندوق بسيط', emoji: '📦' },
        'silver': { cost: 250, name: 'صندوق فضي', emoji: '🎁' },
        'gold': { cost: 500, name: 'صندوق ذهبي', emoji: '💎' },
        'legendary': { cost: 1000, name: 'صندوق أسطوري', emoji: '👑' }
      };

      const box = boxes[boxType];
      if (!box) return { success: false, message: 'نوع صندوق غير صحيح' };

      // Check if user has enough coins
      if (user.coins < box.cost) {
        return {
          success: false,
          message: `❌ تحتاج إلى ${box.cost} عملة لفتح ${box.name}`
        };
      }

      // Deduct cost
      user.coins -= box.cost;

      // Generate rewards based on box type
      const rewards = this.generateLootBoxRewards(boxType);

      // Apply rewards
      if (rewards.coins) user.coins += rewards.coins;
      if (rewards.xp) user.xp += rewards.xp;

      await user.save();

      return {
        success: true,
        message: this.formatLootBoxReward(box, rewards),
        rewards
      };
    } catch (error) {
      console.error('Error opening loot box:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Generate loot box rewards
   */
  static generateLootBoxRewards(boxType) {
    const rarityRoll = Math.random();
    const rewards = { coins: 0, xp: 0, items: [] };

    switch (boxType) {
      case 'basic':
        rewards.coins = Math.floor(Math.random() * 100) + 50; // 50-150
        rewards.xp = Math.floor(Math.random() * 50) + 25; // 25-75
        if (rarityRoll > 0.9) rewards.items.push('🎫 تذكرة حظ');
        break;

      case 'silver':
        rewards.coins = Math.floor(Math.random() * 250) + 150; // 150-400
        rewards.xp = Math.floor(Math.random() * 100) + 50; // 50-150
        if (rarityRoll > 0.8) rewards.items.push('⭐ مضاعف XP (ساعة)');
        if (rarityRoll > 0.95) rewards.items.push('🎁 صندوق بسيط');
        break;

      case 'gold':
        rewards.coins = Math.floor(Math.random() * 500) + 300; // 300-800
        rewards.xp = Math.floor(Math.random() * 200) + 100; // 100-300
        if (rarityRoll > 0.7) rewards.items.push('💰 مضاعف عملات (ساعة)');
        if (rarityRoll > 0.85) rewards.items.push('🎁 صندوق فضي');
        if (rarityRoll > 0.98) rewards.items.push('💎 صندوق ذهبي');
        break;

      case 'legendary':
        rewards.coins = Math.floor(Math.random() * 1000) + 500; // 500-1500
        rewards.xp = Math.floor(Math.random() * 500) + 200; // 200-700
        rewards.items.push('🌟 مضاعف كامل (3 ساعات)');
        if (rarityRoll > 0.5) rewards.items.push('💎 صندوق ذهبي');
        if (rarityRoll > 0.8) rewards.items.push('👑 لقب خاص');
        if (rarityRoll > 0.95) rewards.items.push('🎊 جائزة كبرى (5000 عملة)');
        break;
    }

    return rewards;
  }

  /**
   * Spin the Wheel of Fortune
   */
  static async spinWheel(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      const spinCost = 50;

      // Check if user has enough coins
      if (user.coins < spinCost) {
        return {
          success: false,
          message: `❌ تحتاج إلى ${spinCost} عملة لتدوير العجلة`
        };
      }

      // Check if user already spun today
      const lastSpin = user.rewards?.lastSpin;
      const today = new Date().setHours(0, 0, 0, 0);

      if (lastSpin && new Date(lastSpin).setHours(0, 0, 0, 0) === today) {
        return {
          success: false,
          message: '❌ لقد قمت بتدوير العجلة اليوم. عد غداً!'
        };
      }

      // Deduct cost
      user.coins -= spinCost;

      // Spin the wheel
      const reward = this.generateWheelReward();

      // Apply reward
      if (reward.coins) user.coins += reward.coins;
      if (reward.xp) user.xp += reward.xp;

      // Update last spin
      if (!user.rewards) user.rewards = {};
      user.rewards.lastSpin = new Date();

      await user.save();

      return {
        success: true,
        message: this.formatWheelReward(reward),
        reward
      };
    } catch (error) {
      console.error('Error spinning wheel:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Generate wheel reward
   */
  static generateWheelReward() {
    const roll = Math.random();
    const reward = { type: '', coins: 0, xp: 0, message: '' };

    if (roll < 0.05) { // 5% - Jackpot
      reward.type = 'jackpot';
      reward.coins = 1000;
      reward.xp = 500;
      reward.emoji = '🎊';
      reward.message = 'جائزة كبرى!';
    } else if (roll < 0.15) { // 10% - Gold Prize
      reward.type = 'gold';
      reward.coins = 500;
      reward.xp = 200;
      reward.emoji = '👑';
      reward.message = 'جائزة ذهبية!';
    } else if (roll < 0.35) { // 20% - Silver Prize
      reward.type = 'silver';
      reward.coins = 250;
      reward.xp = 100;
      reward.emoji = '⭐';
      reward.message = 'جائزة فضية!';
    } else if (roll < 0.60) { // 25% - Bronze Prize
      reward.type = 'bronze';
      reward.coins = 100;
      reward.xp = 50;
      reward.emoji = '🎁';
      reward.message = 'جائزة برونزية!';
    } else if (roll < 0.85) { // 25% - Small Prize
      reward.type = 'small';
      reward.coins = 50;
      reward.xp = 25;
      reward.emoji = '🎫';
      reward.message = 'جائزة صغيرة!';
    } else { // 15% - Better Luck
      reward.type = 'none';
      reward.coins = 0;
      reward.xp = 10;
      reward.emoji = '💫';
      reward.message = 'حظاً أوفر في المرة القادمة!';
    }

    return reward;
  }

  /**
   * Daily Login Rewards
   */
  static async claimDailyReward(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      const lastClaim = user.rewards?.lastDailyClaim;
      const today = new Date().setHours(0, 0, 0, 0);

      // Check if already claimed today
      if (lastClaim && new Date(lastClaim).setHours(0, 0, 0, 0) === today) {
        return {
          success: false,
          message: '❌ لقد استلمت المكافأة اليومية. عد غداً!'
        };
      }

      // Check streak
      const yesterday = new Date(today - 24 * 60 * 60 * 1000);
      const lastClaimDay = lastClaim ? new Date(lastClaim).setHours(0, 0, 0, 0) : 0;

      let streak = user.rewards?.dailyStreak || 0;

      if (lastClaimDay === yesterday.getTime()) {
        streak++; // Continue streak
      } else {
        streak = 1; // Reset streak
      }

      // Calculate rewards based on streak
      const baseCoins = 100;
      const baseXP = 50;
      const streakBonus = Math.min(streak * 10, 200); // Max 200% bonus at day 20

      const coins = baseCoins + (baseCoins * streakBonus / 100);
      const xp = baseXP + (baseXP * streakBonus / 100);

      // Apply rewards
      user.coins += coins;
      user.xp += xp;

      // Update rewards data
      if (!user.rewards) user.rewards = {};
      user.rewards.lastDailyClaim = new Date();
      user.rewards.dailyStreak = streak;

      await user.save();

      return {
        success: true,
        message: this.formatDailyReward(coins, xp, streak),
        coins,
        xp,
        streak
      };
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Format loot box reward message
   */
  static formatLootBoxReward(box, rewards) {
    let message = `${box.emoji} <b>فتح ${box.name}</b>\n\n`;
    message += '🎉 <b>المكافآت:</b>\n';
    message += `💰 ${rewards.coins} عملة\n`;
    message += `⭐ ${rewards.xp} XP\n`;

    if (rewards.items && rewards.items.length > 0) {
      message += '\n🎁 <b>مكافآت خاصة:</b>\n';
      rewards.items.forEach(item => message += `• ${item}\n`);
    }

    return message;
  }

  /**
   * Format wheel reward message
   */
  static formatWheelReward(reward) {
    let message = '🎰 <b>عجلة الحظ</b>\n\n';
    message += `${reward.emoji} <b>${reward.message}</b>\n\n`;

    if (reward.coins > 0) {
      message += `💰 +${reward.coins} عملة\n`;
    }

    if (reward.xp > 0) {
      message += `⭐ +${reward.xp} XP\n`;
    }

    return message;
  }

  /**
   * Format daily reward message
   */
  static formatDailyReward(coins, xp, streak) {
    let message = '🎁 <b>المكافأة اليومية</b>\n\n';
    message += '✅ تم استلام المكافأة بنجاح!\n\n';
    message += `💰 +${coins} عملة\n`;
    message += `⭐ +${xp} XP\n\n`;
    message += `🔥 <b>سلسلة الحضور:</b> ${streak} يوم\n`;

    if (streak >= 7) {
      message += `\n🏆 رائع! ${streak} يوم متتالي!`;
    }

    return message;
  }

  /**
   * Get available rewards info
   */
  static getRewardsInfo() {
    return '🎁 <b>نظام المكافآت</b>\n\n' +
           '📦 <b>الصناديق:</b>\n' +
           '• صندوق بسيط: 100 عملة\n' +
           '• صندوق فضي: 250 عملة\n' +
           '• صندوق ذهبي: 500 عملة\n' +
           '• صندوق أسطوري: 1000 عملة\n\n' +
           '🎰 <b>عجلة الحظ:</b>\n' +
           '• التكلفة: 50 عملة\n' +
           '• مرة واحدة يومياً\n' +
           '• جوائز حتى 1000 عملة!\n\n' +
           '🎫 <b>المكافأة اليومية:</b>\n' +
           '• مجانية!\n' +
           '• مكافآت متزايدة مع السلسلة\n' +
           '• حتى 300% مكافأة إضافية!';
  }
}

module.exports = RewardsSystem;
