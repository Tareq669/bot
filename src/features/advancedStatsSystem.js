const { User } = require('../database/models');
const moment = require('moment-timezone');

class AdvancedStatsSystem {
  /**
   * Get comprehensive user statistics
   */
  static async getUserStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();

      // Calculate periods
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        // Basic Stats
        level: user.level || Math.floor(user.xp / 1000),
        xp: user.xp,
        coins: user.coins,

        // Progress Stats
        totalKhatma: user.khatmaProgress?.completionCount || 0,
        totalGames: user.gamesPlayed?.total || 0,
        totalWins: user.gamesPlayed?.wins || 0,
        winRate: user.gamesPlayed?.total ? (user.gamesPlayed.wins / user.gamesPlayed.total * 100).toFixed(1) : 0,

        // Time-based Stats
        loginStreak: user.streak?.current || user.dailyReward?.streak || 0,
        daysActive: user.khatmaProgress?.daysActive || 0,
        lastActive: user.lastActive,

        // Content Stats
        charities: (user.charity || []).length,
        goals: (user.goals || []).length,
        activeGoals: (user.goals || []).filter(g => g.status === 'active').length,
        memorizedVerses: user.memorization?.stats?.totalVerses || 0,
        masteredVerses: (user.memorization?.verses || []).filter(v => v.status === 'mastered').length,

        // Social Stats
        referrals: (user.referral?.referrals || []).length,
        referralTier: user.referral?.tier || 1,
        referralRewards: user.referral?.totalRewards || 0,

        // Badges
        badges: (user.badgeDetails || user.badges || []).length,

        // Achievements
        firstAchievement: user.achievements?.first,
        achievements: (user.achievements || []).length,

        // Period-specific
        thisMonth: {
          gamesPlayed: this.countByPeriod(user, 'games', monthStart),
          charities: this.countByPeriod(user, 'charity', monthStart),
          xpEarned: this.restoreMonthlyXP(user, currentMonth, currentYear) || 0
        },

        thisWeek: {
          gamesPlayed: this.countByPeriod(user, 'games', weekAgo),
          charities: this.countByPeriod(user, 'charity', weekAgo)
        },

        today: {
          logins: this.countLogins(user, todayStart),
          gamesPlayed: this.countByPeriod(user, 'games', todayStart)
        },

        joinDate: user.joinDate,
        accountAge: this.calculateAccountAge(user.joinDate)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Count items by period
   */
  static countByPeriod(user, type, startDate) {
    let items = [];

    switch (type) {
      case 'games':
        // Historical tracking needed in DB
        return 0;
      case 'charity':
        items = (user.charity || []).filter(c => c.date >= startDate);
        return items.length;
      default:
        return 0;
    }
  }

  /**
   * Calculate account age
   */
  static calculateAccountAge(joinDate) {
    const now = new Date();
    const diff = now - joinDate;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years} سنة و${months % 12} شهر`;
    if (months > 0) return `${months} شهر و${days % 30} يوم`;
    return `${days} يوم`;
  }

  /**
   * Count logins on a specific date
   */
  static countLogins(user, startDate) {
    if (!user.loginHistory) return 0;

    return user.loginHistory.filter(login =>
      login >= startDate
    ).length;
  }

  /**
   * Restore historical monthly XP
   */
  static restoreMonthlyXP(user, month, year) {
    if (!user.monthlyStats) return 0;

    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    return user.monthlyStats[key]?.xpEarned || 0;
  }

  /**
   * Generate detailed statistics report
   */
  static async generateStatsReport(userId) {
    try {
      const stats = await this.getUserStats(userId);
      if (!stats) return null;

      return {
        summary: {
          level: stats.level,
          xp: stats.xp,
          coins: stats.coins,
          badges: stats.badges
        },

        performance: {
          totalGames: stats.totalGames,
          totalWins: stats.totalWins,
          winRate: `${stats.winRate}%`,
          averagePerGame: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames).toFixed(2) : 0
        },

        engagement: {
          daysActive: stats.daysActive,
          loginStreak: stats.loginStreak,
          accountAge: stats.accountAge,
          lastActive: new Date(stats.lastActive).toLocaleDateString('ar-SA')
        },

        islamic: {
          khatmaCompleted: stats.totalKhatma,
          charities: stats.charities,
          memorizedVerses: stats.memorizedVerses,
          masteredVerses: stats.masteredVerses,
          activeGoals: stats.activeGoals
        },

        social: {
          referrals: stats.referrals,
          referralTier: stats.referralTier,
          referralRewards: stats.referralRewards
        },

        comparison: {
          topCategory: this.getTopCategory(stats),
          strengths: this.getStrengths(stats),
          recommendations: this.getRecommendations(stats)
        }
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  }

  /**
   * Get user's top category
   */
  static getTopCategory(stats) {
    const categories = {
      'games': stats.totalWins,
      'islamic': stats.totalKhatma + stats.charities,
      'social': stats.referrals,
      'memorization': stats.memorizedVerses
    };

    return Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Get user strengths
   */
  static getStrengths(stats) {
    const strengths = [];

    if (stats.winRate > 50) strengths.push('🎮 لاعب ماهر');
    if (stats.totalKhatma > 5) strengths.push('📖 قارئ نشيط');
    if (stats.charities > 20) strengths.push('💝 كريم الخلق');
    if (stats.referrals > 10) strengths.push('👥 داعية نشيط');
    if (stats.masteredVerses > 50) strengths.push('✨ حافظ متقن');
    if (stats.loginStreak > 30) strengths.push('🔥 مواظب جداً');

    return strengths.length > 0 ? strengths : ['⭐ مستخدم نشيط'];
  }

  /**
   * Get recommendations
   */
  static getRecommendations(stats) {
    const recommendations = [];

    if (stats.totalKhatma < 5) {
      recommendations.push('ابدأ رحلة الختمة - اقرأ القرآن يومياً');
    }

    if (stats.charities < 10) {
      recommendations.push('سجل صدقاتك - كل عمل خير له أجر عند الله');
    }

    if (stats.winRate < 40 && stats.totalGames > 10) {
      recommendations.push('زيادة مهارات الألعاب - مارس اللعب أكثر');
    }

    if (stats.memorizedVerses < 50) {
      recommendations.push('ابدأ برنامج الحفظ - اختر آيات قصيرة');
    }

    if (stats.loginStreak < 7) {
      recommendations.push('حاول دخول البوت يومياً للحفاظ على السلسلة');
    }

    return recommendations.length > 0 ? recommendations : ['استمر في الأداء المميز!'];
  }

  /**
   * Compare users statistics
   */
  static async compareUsers(userId1, userId2) {
    try {
      const stats1 = await this.getUserStats(userId1);
      const stats2 = await this.getUserStats(userId2);

      if (!stats1 || !stats2) return null;

      return {
        user1: {
          stats: stats1,
          rank: { level: stats1.level, coins: stats1.coins }
        },
        user2: {
          stats: stats2,
          rank: { level: stats2.level, coins: stats2.coins }
        },
        differences: {
          levelDiff: stats1.level - stats2.level,
          xpDiff: stats1.xp - stats2.xp,
          coinsDiff: stats1.coins - stats2.coins,
          winRateDiff: parseFloat(stats1.winRate) - parseFloat(stats2.winRate)
        }
      };
    } catch (error) {
      console.error('Error comparing users:', error);
      return null;
    }
  }

  /**
   * Format statistics report
   */
  static formatStatsReport(report) {
    if (!report) return '❌ لم يتم العثور على الإحصائيات';

    let message = '📊 <b>تقرير الإحصائيات</b>\n\n';

    // Summary
    message += '📈 <b>الملخص:</b>\n';
    message += `• المستوى: ${report.summary.level}\n`;
    message += `• XP: ${report.summary.xp.toLocaleString()}\n`;
    message += `• العملات: ${report.summary.coins.toLocaleString()}\n`;
    message += `• الشارات: ${report.summary.badges}\n\n`;

    // Performance
    message += '🎮 <b>الأداء:</b>\n';
    message += `• إجمالي الألعاب: ${report.performance.totalGames}\n`;
    message += `• الفوز: ${report.performance.totalWins}\n`;
    message += `• معدل الفوز: ${report.performance.winRate}\n\n`;

    // Engagement
    message += '🔥 <b>الحضور:</b>\n';
    message += `• أيام نشطة: ${report.engagement.daysActive}\n`;
    message += `• سلسلة الحضور: ${report.engagement.loginStreak} يوم\n`;
    message += `• عمر الحساب: ${report.engagement.accountAge}\n\n`;

    // Islamic
    message += '🕌 <b>العبادات:</b>\n';
    message += `• الختمات: ${report.islamic.khatmaCompleted}\n`;
    message += `• الصدقات: ${report.islamic.charities}\n`;
    message += `• الحفظ: ${report.islamic.memorizedVerses} آية\n`;
    message += `• متقن: ${report.islamic.masteredVerses} آية\n\n`;

    // Strengths
    if (report.comparison.strengths.length > 0) {
      message += '⭐ <b>نقاط قوتك:</b>\n';
      report.comparison.strengths.forEach(s => message += `• ${s}\n`);
      message += '\n';
    }

    // Recommendations
    if (report.comparison.recommendations.length > 0) {
      message += '💡 <b>التوصيات:</b>\n';
      report.comparison.recommendations.forEach(r => message += `• ${r}\n`);
    }

    return message;
  }

  /**
   * Format comparison report
   */
  static formatComparisonReport(comparison) {
    if (!comparison) return '❌ لم يتم العثور على البيانات';

    let message = '⚔️ <b>مقارنة الإحصائيات</b>\n\n';

    const diff = comparison.differences;

    message += '📊 <b>المستوى:</b>\n';
    const levelWinner = diff.levelDiff > 0 ? '1️⃣' : diff.levelDiff < 0 ? '2️⃣' : '🤝';
    message += `${levelWinner} الفرق: ${Math.abs(diff.levelDiff)} مستوى\n\n`;

    message += '💰 <b>العملات:</b>\n';
    const coinsWinner = diff.coinsDiff > 0 ? '1️⃣' : diff.coinsDiff < 0 ? '2️⃣' : '🤝';
    message += `${coinsWinner} الفرق: ${Math.abs(diff.coinsDiff).toLocaleString()}\n\n`;

    message += '🎮 <b>معدل الفوز:</b>\n';
    const winRateWinner = diff.winRateDiff > 0 ? '1️⃣' : diff.winRateDiff < 0 ? '2️⃣' : '🤝';
    message += `${winRateWinner} الفرق: ${Math.abs(diff.winRateDiff).toFixed(1)}%\n\n`;

    return message;
  }

  /**
   * Track monthly statistics
   */
  static async trackMonthlyStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (!user.monthlyStats) {
        user.monthlyStats = {};
      }

      if (!user.monthlyStats[monthKey]) {
        user.monthlyStats[monthKey] = {
          xpEarned: 0,
          coinsEarned: 0,
          gamesPlayed: 0,
          charities: 0
        };
      }

      await user.save();
    } catch (error) {
      console.error('Error tracking monthly stats:', error);
    }
  }
}

module.exports = AdvancedStatsSystem;
