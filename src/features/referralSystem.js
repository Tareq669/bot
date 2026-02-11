const { User } = require('../database/models');
const crypto = require('crypto');

class ReferralSystem {
  /**
   * Generate unique referral code for user
   */
  static async generateReferralCode(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      // Check if user already has a code
      if (user.referral && user.referral.code) {
        return {
          success: true,
          code: user.referral.code,
          message: 'لديك رمز إحالة بالفعل'
        };
      }

      // Generate unique code
      const code = this.createUniqueCode(user.firstName);

      // Initialize referral data
      if (!user.referral) {
        user.referral = {
          code: code,
          referredBy: null,
          referrals: [],
          totalRewards: 0,
          tier: 1
        };
      } else {
        user.referral.code = code;
      }

      await user.save();

      return {
        success: true,
        code: code,
        message: '✅ تم إنشاء رمز الإحالة الخاص بك!'
      };
    } catch (error) {
      console.error('Error generating referral code:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Create unique referral code
   */
  static createUniqueCode(name) {
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    const namePart = name.substring(0, 3).toUpperCase();
    return `${namePart}${randomPart}`;
  }

  /**
   * Use referral code (when new user joins)
   */
  static async useReferralCode(newUserId, referralCode) {
    try {
      const newUser = await User.findOne({ userId: newUserId });
      if (!newUser) return { success: false, message: 'مستخدم غير موجود' };

      // Check if user already used a referral code
      if (newUser.referral && newUser.referral.referredBy) {
        return {
          success: false,
          message: '❌ لقد استخدمت رمز إحالة من قبل'
        };
      }

      // Find referrer
      const referrer = await User.findOne({ 'referral.code': referralCode });
      if (!referrer) {
        return {
          success: false,
          message: '❌ رمز الإحالة غير صحيح'
        };
      }

      // Can't refer yourself
      if (referrer.userId === newUserId) {
        return {
          success: false,
          message: '❌ لا يمكنك استخدام رمزك الخاص'
        };
      }

      // Add referral
      if (!referrer.referral.referrals) {
        referrer.referral.referrals = [];
      }

      referrer.referral.referrals.push({
        userId: newUserId,
        username: newUser.username,
        date: new Date(),
        rewardsClaimed: 0
      });

      // Calculate rewards
      const referrerReward = this.calculateReferrerReward(referrer.referral.tier);
      const newUserReward = 100; // Fixed reward for new users

      // Apply rewards
      referrer.coins += referrerReward.coins;
      referrer.xp += referrerReward.xp;
      referrer.referral.totalRewards += referrerReward.coins;

      newUser.coins += newUserReward;
      if (!newUser.referral) newUser.referral = {};
      newUser.referral.referredBy = referrer.userId;

      // Check for tier upgrade
      this.checkTierUpgrade(referrer);

      await referrer.save();
      await newUser.save();

      return {
        success: true,
        message: `✅ تم تفعيل رمز الإحالة!\n\n🎁 أنت: +${newUserReward} عملة\n💰 ${referrer.firstName}: +${referrerReward.coins} عملة`,
        referrerReward,
        newUserReward
      };
    } catch (error) {
      console.error('Error using referral code:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Calculate referrer reward based on tier
   */
  static calculateReferrerReward(tier) {
    const rewards = {
      1: { coins: 200, xp: 100 },
      2: { coins: 300, xp: 150 }, // 10+ referrals
      3: { coins: 400, xp: 200 }, // 25+ referrals
      4: { coins: 500, xp: 250 }, // 50+ referrals
      5: { coins: 750, xp: 400 }  // 100+ referrals
    };

    return rewards[tier] || rewards[1];
  }

  /**
   * Check and upgrade tier
   */
  static checkTierUpgrade(user) {
    const referralCount = user.referral.referrals.length;
    let newTier = 1;

    if (referralCount >= 100) newTier = 5;
    else if (referralCount >= 50) newTier = 4;
    else if (referralCount >= 25) newTier = 3;
    else if (referralCount >= 10) newTier = 2;

    if (newTier > user.referral.tier) {
      user.referral.tier = newTier;
      return true; // Upgraded
    }

    return false;
  }

  /**
   * Get referral statistics
   */
  static async getReferralStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.referral) {
        return {
          hasCode: false,
          code: null,
          referrals: [],
          totalReferrals: 0,
          totalRewards: 0,
          tier: 1,
          nextTierAt: 10
        };
      }

      const referrals = user.referral.referrals || [];
      const tier = user.referral.tier || 1;

      // Calculate next tier requirement
      const tierRequirements = [0, 10, 25, 50, 100];
      const nextTierAt = tierRequirements[tier] || 100;

      return {
        hasCode: !!user.referral.code,
        code: user.referral.code,
        referrals: referrals,
        totalReferrals: referrals.length,
        totalRewards: user.referral.totalRewards || 0,
        tier: tier,
        nextTierAt: nextTierAt,
        referredBy: user.referral.referredBy
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return null;
    }
  }

  /**
   * Get referral leaderboard
   */
  static async getReferralLeaderboard(limit = 10) {
    try {
      const users = await User.find({ 'referral.code': { $exists: true } })
        .sort({ 'referral.totalRewards': -1 })
        .limit(limit);

      return users.map(user => ({
        userId: user.userId,
        firstName: user.firstName,
        referrals: user.referral.referrals.length,
        totalRewards: user.referral.totalRewards,
        tier: user.referral.tier
      }));
    } catch (error) {
      console.error('Error getting referral leaderboard:', error);
      return [];
    }
  }

  /**
   * Format referral stats display
   */
  static formatReferralStats(stats) {
    if (!stats) return '❌ حدث خطأ في جلب الإحصائيات';

    if (!stats.hasCode) {
      return '📢 <b>نظام الإحالة</b>\n\n' +
             '✨ ليس لديك رمز إحالة بعد!\n' +
             'أنشئ رمزك الآن وابدأ بكسب المكافآت!\n\n' +
             '💰 <b>المكافآت:</b>\n' +
             '• 200 عملة لكل إحالة\n' +
             '• 100 XP لكل إحالة\n' +
             '• مكافآت إضافية مع الترقية!';
    }

    let message = '📢 <b>نظام الإحالة</b>\n\n';

    message += `🎫 <b>رمزك:</b> <code>${stats.code}</code>\n`;
    message += `👥 <b>الإحالات:</b> ${stats.totalReferrals}\n`;
    message += `💰 <b>إجمالي المكافآت:</b> ${stats.totalRewards.toLocaleString()} عملة\n\n`;

    // Tier info
    message += `${this.getTierEmoji(stats.tier)  } <b>المستوى ${stats.tier}</b>\n`;

    if (stats.tier < 5) {
      const remaining = stats.nextTierAt - stats.totalReferrals;
      message += `📊 ${remaining} إحالة للمستوى التالي\n\n`;
    } else {
      message += '👑 المستوى الأقصى!\n\n';
    }

    // Recent referrals
    if (stats.referrals.length > 0) {
      message += '👥 <b>آخر الإحالات:</b>\n';
      const recent = stats.referrals.slice(-5).reverse();
      recent.forEach((ref, index) => {
        const date = new Date(ref.date).toLocaleDateString('ar-SA');
        message += `${index + 1}. @${ref.username} - ${date}\n`;
      });
    }

    message += '\n💡 <i>شارك رمزك مع الأصدقاء لكسب المزيد!</i>';

    return message;
  }

  /**
   * Format referral leaderboard
   */
  static formatReferralLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      return '❌ لا توجد إحالات بعد';
    }

    let message = '🏆 <b>لوحة المتصدرين - الإحالات</b>\n\n';

    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const tierEmoji = this.getTierEmoji(user.tier);

      message += `${medal} ${tierEmoji} <b>${user.firstName}</b>\n`;
      message += `   └ ${user.referrals} إحالة | ${user.totalRewards.toLocaleString()} عملة\n\n`;
    });

    return message;
  }

  /**
   * Get tier emoji
   */
  static getTierEmoji(tier) {
    const emojis = {
      1: '🥉',
      2: '🥈',
      3: '🥇',
      4: '💎',
      5: '👑'
    };
    return emojis[tier] || '⭐';
  }

  /**
   * Get referral info message
   */
  static getReferralInfo() {
    return '📢 <b>نظام الإحالة</b>\n\n' +
           '💰 <b>المكافآت:</b>\n' +
           '• 200 عملة لك عن كل إحالة\n' +
           '• 100 عملة للمستخدم الجديد\n' +
           '• مكافآت إضافية مع\n\n' +
           '🏆 <b>المستويات:</b>\n' +
           '🥉 مستوى 1: 200 عملة/إحالة\n' +
           '🥈 مستوى 2 (10+): 300 عملة/إحالة\n' +
           '🥇 مستوى 3 (25+): 400 عملة/إحالة\n' +
           '💎 مستوى 4 (50+): 500 عملة/إحالة\n' +
           '👑 مستوى 5 (100+): 750 عملة/إحالة\n\n' +
           '📝 <b>كيفية الاستخدام:</b>\n' +
           '1. أنشئ رمز الإحالة الخاص بك\n' +
           '2. شارك الرمز مع أصدقائك\n' +
           '3. عندما يستخدمون رمزك، تكسبان معاً!\n\n' +
           '✨ كلما زاد عدد إحالاتك، زادت مكافآتك!';
  }
}

module.exports = ReferralSystem;
