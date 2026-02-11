const { User, Transaction } = require('../database/models');

class AnalyticsEngine {
  // Generate comprehensive user report
  static async generateUserReport(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return null;

      const report = {
        userId,
        generatedAt: new Date(),
        overview: this.generateOverview(user),
        gameStats: this.analyzeGameStats(user),
        readingStats: this.analyzeReadingStats(user),
        economyStats: this.analyzeEconomyStats(user),
        timeAnalysis: this.analyzeActivityTime(user),
        suggestions: this.generateSuggestions(user),
        comparison: this.compareWithAverage(user)
      };

      return report;
    } catch (error) {
      console.error('Report generation error:', error);
      return null;
    }
  }

  // Generate overview
  static generateOverview(user) {
    const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

    return {
      accountAge: `${accountAge} يوم`,
      totalLevel: user.level,
      totalXp: user.xp,
      totalCoins: user.coins,
      status: this.getUserStatus(user),
      joinDate: new Date(user.createdAt).toLocaleDateString('ar-SA')
    };
  }

  // Get user status based on activity
  static getUserStatus(user) {
    const activityIndex = ((user.gamesPlayed?.total || 0) + (user.khatmaProgress?.currentPage || 0)) / Math.max(1, (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

    if (activityIndex > 5) return 'نشط جداً 🔥';
    if (activityIndex > 2) return 'نشط 💪';
    if (activityIndex > 0.5) return 'معتدل 👍';
    return 'خامل 😴';
  }

  // Analyze game statistics
  static analyzeGameStats(user) {
    const total = user.gamesPlayed?.total || 0;
    const wins = user.gamesPlayed?.wins || 0;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return {
      totalGames: total,
      totalWins: wins,
      totalLosses: total - wins,
      winRate: `${winRate}%`,
      performance: this.getRatingPerformance(winRate),
      favoriteGame: user.gamesPlayed?.favorite || 'لم تحدد بعد',
      lastGameDate: user.gamesPlayed?.lastPlayDate || 'لم تلعب بعد'
    };
  }

  // Get performance rating
  static getRatingPerformance(winRate) {
    if (winRate >= 80) return '⭐⭐⭐⭐⭐ متفوق';
    if (winRate >= 70) return '⭐⭐⭐⭐ ممتاز';
    if (winRate >= 60) return '⭐⭐⭐ جيد';
    if (winRate >= 50) return '⭐⭐ متوسط';
    return '⭐ طازج';
  }

  // Analyze reading statistics
  static analyzeReadingStats(user) {
    const currentPage = user.khatmaProgress?.currentPage || 0;
    const progress = Math.round((currentPage / 114) * 100);
    const daysReading = user.khatmaProgress?.daysActive || 0;
    const avgPagesPerDay = daysReading > 0 ? Math.round(currentPage / daysReading * 10) / 10 : 0;

    return {
      currentPage: `${currentPage}/114`,
      progress: `${progress}%`,
      daysActive: daysReading,
      averagePerDay: avgPagesPerDay,
      status: this.getReadingStatus(currentPage),
      estimatedCompletion: this.estimateCompletion(currentPage, avgPagesPerDay)
    };
  }

  // Get reading status
  static getReadingStatus(currentPage) {
    if (currentPage === 114) return '✅ أكملت الختمة!';
    if (currentPage >= 80) return '🏁 في النهاية';
    if (currentPage >= 50) return '📖 في المنتصف';
    if (currentPage >= 20) return '📚 بدأت بقوة';
    if (currentPage > 0) return '🌱 في البداية';
    return '📕 لم تبدأ بعد';
  }

  // Estimate completion date
  static estimateCompletion(currentPage, avgPagesPerDay) {
    if (avgPagesPerDay === 0) return 'غير معروف';

    const remainingPages = 114 - currentPage;
    const daysNeeded = Math.round(remainingPages / avgPagesPerDay);

    if (daysNeeded <= 0) return 'تم!';
    if (daysNeeded === 1) return 'غداً';
    return `${daysNeeded} أيام`;
  }

  // Analyze economy statistics
  static analyzeEconomyStats(user) {
    const spendingPattern = this.analyzeSpending(user);

    return {
      currentBalance: user.coins,
      totalEarnings: user.totalEarnings || 0,
      totalSpending: user.totalSpending || 0,
      netBalance: (user.totalEarnings || 0) - (user.totalSpending || 0),
      wealthStatus: this.getWealthStatus(user.coins),
      spendingPattern,
      averageDaily: this.calculateDailyAverage(user)
    };
  }

  // Analyze spending pattern
  static analyzeSpending(user) {
    if (!user.totalSpending || user.totalSpending === 0) {
      return 'لم تنفق بعد 💰';
    }

    const ratio = user.totalSpending / (user.totalEarnings || 1);

    if (ratio > 0.9) return 'منفق 💸';
    if (ratio > 0.7) return 'معتدل النفقات 💰';
    if (ratio > 0.5) return 'موفر 🏦';
    return 'رابح عظيم 📈';
  }

  // Get wealth status
  static getWealthStatus(coins) {
    if (coins >= 2000) return 'ثري جداً 👑';
    if (coins >= 1000) return 'ثري 💎';
    if (coins >= 500) return 'مرتاح 😊';
    if (coins >= 100) return 'عادي 👍';
    return 'يحتاج دعم 💪';
  }

  // Calculate daily average
  static calculateDailyAverage(user) {
    const days = Math.max(1, Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)));
    const dailyAvg = Math.round((user.coins / days) * 10) / 10;
    return dailyAvg;
  }

  // Analyze activity time patterns
  static analyzeActivityTime(user) {
    const accountAge = Math.max(1, Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)));
    const lastActive = new Date(user.lastActive || user.createdAt);
    const hoursAgo = Math.floor((new Date() - lastActive) / (1000 * 60 * 60));

    return {
      accountAge: `${accountAge} يوم`,
      lastActive: this.formatLastActive(hoursAgo),
      consistency: this.calculateConsistency(user),
      peakTime: 'المساء 🌙',
      preferredDays: 'نهاية الأسبوع'
    };
  }

  // Format last active
  static formatLastActive(hoursAgo) {
    if (hoursAgo === 0) return 'الآن 🟢';
    if (hoursAgo < 24) return `قبل ${hoursAgo} ساعة`;
    if (hoursAgo < 168) return `قبل ${Math.floor(hoursAgo / 24)} أيام`;
    return `قبل ${Math.floor(hoursAgo / 168)} أسابيع`;
  }

  // Calculate consistency
  static calculateConsistency(user) {
    const streak = user.streak?.current || 0;

    if (streak >= 30) return '🔥🔥🔥 متسق جداً';
    if (streak >= 14) return '🔥🔥 متسق جداً';
    if (streak >= 7) return '🔥 متسق';
    if (streak >= 3) return '👍 بداية جيدة';
    return '💪 في التطور';
  }

  // Generate suggestions
  static generateSuggestions(user) {
    const suggestions = [];

    if ((user.gamesPlayed?.total || 0) < 10) {
      suggestions.push('🎮 العب المزيد من الألعاب لزيادة مستواك');
    }

    if ((user.khatmaProgress?.currentPage || 0) < 30) {
      suggestions.push('📖 ركز على قراءة القرآن يومياً');
    }

    if (user.coins < 100) {
      suggestions.push('💰 العب لجمع المزيد من العملات');
    }

    if ((user.gamesPlayed?.wins || 0) / Math.max(1, user.gamesPlayed?.total || 1) < 0.5) {
      suggestions.push('🎯 طور استراتيجيتك في الألعاب');
    }

    suggestions.push('🌟 استمر في هذا الزخم الرائع!');

    return suggestions;
  }

  // Compare with average
  static compareWithAverage(user) {
    // Mock average values
    const averageLevel = 5;
    const averageCoins = 300;
    const averageGames = 15;
    const averagePages = 40;

    return {
      levelComparison: this.getComparison(user.level, averageLevel),
      coinsComparison: this.getComparison(user.coins, averageCoins),
      gamesComparison: this.getComparison(user.gamesPlayed?.total || 0, averageGames),
      readingComparison: this.getComparison(user.khatmaProgress?.currentPage || 0, averagePages)
    };
  }

  // Get comparison text
  static getComparison(userValue, average) {
    const ratio = userValue / Math.max(1, average);

    if (ratio > 1.5) return '📈 أعلى من المتوسط بنسبة كبيرة';
    if (ratio > 1) return '📈 أعلى من المتوسط';
    if (ratio > 0.7) return '👍 قريب من المتوسط';
    return '💪 يحتاج عمل أكثر';
  }

  // Format report for display
  static formatReport(report) {
    if (!report) return null;

    const overview = report.overview;
    const games = report.gameStats;
    const reading = report.readingStats;
    const economy = report.economyStats;

    return `
📊 <b>تقريرك الشامل</b>

<b>📋 نظرة عامة:</b>
👤 الحالة: ${overview.status}
📅 منذ: ${overview.accountAge}
⭐ المستوى: ${overview.totalLevel}
💰 رصيدك: ${overview.totalCoins}

<b>🎮 الألعاب:</b>
🏆 الانتصارات: ${games.totalWins}/${games.totalGames}
📊 نسبة الفوز: ${games.winRate}
⭐ الأداء: ${games.performance}

<b>📖 القراءة:</b>
📚 التقدم: ${reading.currentPage} (${reading.progress})
🔄 متوسط يومي: ${reading.averagePerDay} صفحة
🎯 الانتظار المتوقع: ${reading.estimatedCompletion}

<b>💰 الاقتصاد:</b>
💵 إجمالي الأرباح: ${economy.totalEarnings}
💸 إجمالي الإنفاق: ${economy.totalSpending}
🏦 الحالة المالية: ${economy.wealthStatus}

<b>💡 اقتراحاتنا:</b>
${report.suggestions.map((s, i) => `${i + 1}️⃣ ${s}`).join('\n')}
`;
  }
}

module.exports = AnalyticsEngine;
