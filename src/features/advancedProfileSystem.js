const { User } = require('../database/models');

class AdvancedProfileSystem {
  /**
   * Award badge to user
   */
  static async awardBadge(userId, badgeData) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      if (!user.badgeDetails) {
        user.badgeDetails = [];
      }

      // Check if already has badge
      if (user.badgeDetails.some(b => b.id === badgeData.id)) {
        return { success: false, message: 'لديك هذه الشارة بالفعل' };
      }

      user.badgeDetails.push({
        id: badgeData.id,
        name: badgeData.name,
        description: badgeData.description,
        icon: badgeData.icon,
        earnedAt: new Date(),
        source: badgeData.source || 'manual'
      });

      if (!user.badges) {
        user.badges = [];
      }
      if (!user.badges.includes(badgeData.name)) {
        user.badges.push(badgeData.name);
      }

      await user.save();

      return {
        success: true,
        message: `🎖️ تم الحصول على شارة "${badgeData.name}"!`
      };
    } catch (error) {
      console.error('Error awarding badge:', error);
      return { success: false };
    }
  }

  /**
   * Check and award achievement badges
   */
  static async checkAndAwardBadges(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      const newBadges = [];

      // 1. First Steps - Complete 10 actions
      if (user.xp >= 50) {
        const result = await this.awardBadge(userId, {
          id: 'first_steps',
          name: 'الخطوات الأولى',
          description: 'أكمل أول 50 XP',
          icon: '👣',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 2. Quran Master - Complete 10 khatmahs
      if ((user.khatmaProgress?.completionCount || 0) >= 10) {
        const result = await this.awardBadge(userId, {
          id: 'quran_master',
          name: 'حافظ القرآن',
          description: 'أكمل 10 ختمات',
          icon: '📖',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 3. Wealthy - Have 10000 coins
      if (user.coins >= 10000) {
        const result = await this.awardBadge(userId, {
          id: 'wealthy',
          name: 'الثروة',
          description: 'اجمع 10000 عملة',
          icon: '💰',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 4. Game Master - Win 50 games
      if ((user.gamesPlayed?.wins || 0) >= 50) {
        const result = await this.awardBadge(userId, {
          id: 'game_master',
          name: 'بطل الألعاب',
          description: 'فز بـ 50 لعبة',
          icon: '🎮',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 5. Social Butterfly - Get 25 referrals
      if (user.referral && user.referral.referrals.length >= 25) {
        const result = await this.awardBadge(userId, {
          id: 'social_butterfly',
          name: 'الناشر',
          description: 'احصل على 25 إحالة',
          icon: '🦋',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 6. Charity Champion - Record 50 charities
      if (user.charity && user.charity.length >= 50) {
        const result = await this.awardBadge(userId, {
          id: 'charity_champion',
          name: 'بطل الخير',
          description: 'سجل 50 صدقة',
          icon: '💝',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 7. Devoted - Login 100 days
      const loginDays = user.streak?.current || user.dailyReward?.streak || 0;
      if (loginDays >= 100) {
        const result = await this.awardBadge(userId, {
          id: 'devoted',
          name: 'المواظب',
          description: 'سجل دخول 100 يوم متتالي',
          icon: '🔥',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      // 8. Knowledge Seeker - Read from library 100 times
      if ((user.interactions?.contentViewed || 0) >= 100) {
        const result = await this.awardBadge(userId, {
          id: 'knowledge_seeker',
          name: 'طالب العلم',
          description: 'اقرأ من المكتبة 100 مرة',
          icon: '📚',
          source: 'achievement'
        });
        if (result.success) newBadges.push(result.message);
      }

      return newBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  /**
   * Get user's profile data
   */
  static async getProfileData(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const level = user.level || Math.floor(user.xp / 1000);
      const nextLevelXP = (level + 1) * 1000;
      const currentLevelXP = user.xp % 1000;

      return {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        profilePic: user.profilePic,
        bio: user.bio,

        level,
        xp: user.xp,
        nextLevelXP,
        levelProgress: (currentLevelXP / 1000) * 100,

        coins: user.coins,
        totalEarned: user.totalEarnings || 0,

        badges: user.badgeDetails || [],

        stats: {
          totalKhatma: user.khatmaProgress?.completionCount || 0,
          totalGamesPlayed: user.gamesPlayed?.total || 0,
          totalGamesWon: user.gamesPlayed?.wins || 0,
          winRate: user.gamesPlayed?.total ? ((user.gamesPlayed.wins / user.gamesPlayed.total) * 100).toFixed(1) : 0,
          charities: (user.charity || []).length,
          loginStreak: user.streak?.current || user.dailyReward?.streak || 0,
          goals: user.goals?.filter(g => g.status === 'active').length || 0,
          memorization: user.memorization?.stats?.totalVerses || 0
        },

        joinDate: user.joinDate,
        lastActive: user.lastActive,

        referrals: user.referral?.referrals?.length || 0,
        goals: user.goals?.filter(g => g.status === 'active').length || 0,
        memorization: user.memorization?.stats?.totalVerses || 0
      };
    } catch (error) {
      console.error('Error getting profile data:', error);
      return null;
    }
  }

  /**
   * Update profile info
   */
  static async updateProfile(userId, updates) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      if (updates.bio) user.bio = updates.bio;
      if (updates.profilePic) user.profilePic = updates.profilePic;
      if (updates.location) user.location = updates.location;
      if (updates.dateOfBirth) user.dateOfBirth = updates.dateOfBirth;

      await user.save();

      return { success: true, message: '✅ تم تحديث الملف الشخصي!' };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false };
    }
  }

  /**
   * Get badges list with requirements
   */
  static getBadgesList() {
    return [
      {
        id: 'first_steps',
        name: '👣 الخطوات الأولى',
        description: 'أكمل أول 50 XP',
        requirement: 'xp >= 50'
      },
      {
        id: 'quran_master',
        name: '📖 حافظ القرآن',
        description: 'أكمل 10 ختمات',
        requirement: 'khatma >= 10'
      },
      {
        id: 'wealthy',
        name: '💰 الثروة',
        description: 'اجمع 10000 عملة',
        requirement: 'coins >= 10000'
      },
      {
        id: 'game_master',
        name: '🎮 بطل الألعاب',
        description: 'فز بـ 50 لعبة',
        requirement: 'wins >= 50'
      },
      {
        id: 'social_butterfly',
        name: '🦋 الناشر',
        description: 'احصل على 25 إحالة',
        requirement: 'referrals >= 25'
      },
      {
        id: 'charity_champion',
        name: '💝 بطل الخير',
        description: 'سجل 50 صدقة',
        requirement: 'charity >= 50'
      },
      {
        id: 'devoted',
        name: '🔥 المواظب',
        description: 'سجل دخول 100 يوم متتالي',
        requirement: 'streak >= 100'
      },
      {
        id: 'knowledge_seeker',
        name: '📚 طالب العلم',
        description: 'اقرأ من المكتبة 100 مرة',
        requirement: 'reads >= 100'
      }
    ];
  }

  /**
   * Format profile display
   */
  static formatProfile(profileData) {
    if (!profileData) return '❌ لم يتم العثور على الملف الشخصي';

    let message = `👤 <b>${profileData.firstName}</b>\n`;

    if (profileData.bio) {
      message += `<i>"${profileData.bio}"</i>\n\n`;
    } else {
      message += '\n';
    }

    // Level and XP
    const progressBar = this.getProgressBar(profileData.levelProgress);
    message += `📊 <b>المستوى ${profileData.level}</b>\n`;
    message += `${progressBar} ${Math.round(profileData.levelProgress)}%\n`;
    message += `XP: ${profileData.xp} / ${profileData.nextLevelXP}\n\n`;

    // Economy
    message += '💰 <b>الاقتصاد:</b>\n';
    message += `• الرصيد: ${profileData.coins.toLocaleString()} عملة\n`;
    message += `• المجموع المكسوب: ${profileData.totalEarned.toLocaleString()}\n\n`;

    // Statistics
    message += '📈 <b>الإحصائيات:</b>\n';
    message += `• الختمات: ${profileData.stats.totalKhatma}\n`;
    message += `• الألعاب: ${profileData.stats.totalGamesPlayed} (فوز: ${profileData.stats.totalGamesWon})\n`;
    message += `• معدل الفوز: ${profileData.stats.winRate}%\n`;
    message += `• الصدقات: ${profileData.stats.charities}\n`;
    message += `• الحفظ: ${profileData.stats.memorization} آية\n`;
    message += `• الأهداف النشطة: ${profileData.stats.goals}\n\n`;

    // Streaks and Social
    message += `🔥 <b>سجل الحضور:</b> ${profileData.stats.loginStreak} يوم\n`;
    message += `👥 <b>الإحالات:</b> ${profileData.referrals}\n`;
    message += `📅 <b>انضم:</b> ${new Date(profileData.joinDate).toLocaleDateString('ar-SA')}\n\n`;

    // Badges
    if (profileData.badges && profileData.badges.length > 0) {
      message += `🎖️ <b>الشارات (${profileData.badges.length}):</b>\n`;
      profileData.badges.forEach(badge => {
        message += `• ${badge.icon} ${badge.name}\n`;
      });
    } else {
      message += '🎖️ <b>لم تحصل على شارات بعد</b>\n';
    }

    return message;
  }

  /**
   * Format badges display
   */
  static formatBadgesDisplay(badges) {
    if (!badges || badges.length === 0) {
      return '🎖️ <b>الشارات</b>\n\n' +
             '📋 <b>الشارات المتاحة:</b>\n' +
             '• 👣 الخطوات الأولى - اجمع 50 XP\n' +
             '• 📖 حافظ القرآن - أكمل 10 ختمات\n' +
             '• 💰 الثروة - اجمع 10000 عملة\n' +
             '• 🎮 بطل الألعاب - فز بـ 50 لعبة\n' +
             '• 🦋 الناشر - احصل على 25 إحالة\n' +
             '• 💝 بطل الخير - سجل 50 صدقة\n' +
             '• 🔥 المواظب - سجل دخول 100 يوم\n' +
             '• 📚 طالب العلم - اقرأ 100 مرة\n\n' +
             '💡 استمر في الأنشطة لكسب الشارات!';
    }

    let message = `🎖️ <b>شاراتك (${badges.length})</b>\n\n`;

    badges.forEach(badge => {
      message += `${badge.icon} <b>${badge.name}</b>\n`;
      message += `   └ ${badge.description}\n`;
      const date = new Date(badge.earnedAt).toLocaleDateString('ar-SA');
      message += `   └ 📅 ${date}\n\n`;
    });

    return message;
  }

  /**
   * Get progress bar
   */
  static getProgressBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get comparative stats
   */
  static async getComparativeStats(userId, otherUserId) {
    try {
      const user1 = await this.getProfileData(userId);
      const user2 = await this.getProfileData(otherUserId);

      if (!user1 || !user2) return null;

      return {
        user1,
        user2,
        comparison: {
          levelDiff: user1.level - user2.level,
          xpDiff: user1.xp - user2.xp,
          coinsDiff: user1.coins - user2.coins,
          badgesDiff: (user1.badges?.length || 0) - (user2.badges?.length || 0),
          winRateDiff: parseFloat(user1.stats.winRate) - parseFloat(user2.stats.winRate)
        }
      };
    } catch (error) {
      console.error('Error getting comparative stats:', error);
      return null;
    }
  }
}

module.exports = AdvancedProfileSystem;
