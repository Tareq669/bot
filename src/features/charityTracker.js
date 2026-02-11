const { User } = require('../database/models');

class CharityTracker {
  /**
   * Record a charity/sadaqah
   */
  static async recordCharity(userId, charityData) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      // Initialize charity array if doesn't exist
      if (!user.charity) {
        user.charity = [];
      }

      const charity = {
        type: charityData.type, // 'مال', 'طعام', 'ملابس', 'وقت', 'علم', 'أخرى'
        description: charityData.description || '',
        amount: charityData.amount || 0,
        date: new Date(),
        isPrivate: charityData.isPrivate !== false, // Default to private
        category: charityData.category || 'عام'
      };

      user.charity.push(charity);

      // Award points for charity tracking
      const xpReward = 20;
      const coinsReward = 10;

      user.xp += xpReward;
      user.coins += coinsReward;

      await user.save();

      return {
        success: true,
        message: `✅ تم تسجيل الصدقة بنجاح!\n\n🎁 مكافأة: ${xpReward} XP + ${coinsReward} عملة`,
        charity,
        rewards: { xp: xpReward, coins: coinsReward }
      };
    } catch (error) {
      console.error('Error recording charity:', error);
      return { success: false, message: 'حدث خطأ أثناء التسجيل' };
    }
  }

  /**
   * Get user's charity history
   */
  static async getCharityHistory(userId, options = {}) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.charity) {
        return { success: true, charities: [], stats: this.getEmptyStats() };
      }

      let charities = user.charity;

      // Filter by date range
      if (options.startDate) {
        charities = charities.filter(c => c.date >= options.startDate);
      }
      if (options.endDate) {
        charities = charities.filter(c => c.date <= options.endDate);
      }

      // Filter by type
      if (options.type) {
        charities = charities.filter(c => c.type === options.type);
      }

      // Calculate statistics
      const stats = this.calculateCharityStats(charities);

      return {
        success: true,
        charities: charities.reverse(), // Newest first
        stats
      };
    } catch (error) {
      console.error('Error getting charity history:', error);
      return { success: false, charities: [], stats: this.getEmptyStats() };
    }
  }

  /**
   * Calculate charity statistics
   */
  static calculateCharityStats(charities) {
    const stats = {
      total: charities.length,
      totalAmount: 0,
      byType: {},
      thisMonth: 0,
      thisWeek: 0
    };

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    charities.forEach(charity => {
      // Total amount
      if (charity.amount) {
        stats.totalAmount += charity.amount;
      }

      // By type
      if (!stats.byType[charity.type]) {
        stats.byType[charity.type] = { count: 0, amount: 0 };
      }
      stats.byType[charity.type].count++;
      stats.byType[charity.type].amount += charity.amount || 0;

      // Time-based
      if (charity.date >= monthStart) stats.thisMonth++;
      if (charity.date >= weekAgo) stats.thisWeek++;
    });

    return stats;
  }

  /**
   * Get empty stats object
   */
  static getEmptyStats() {
    return {
      total: 0,
      totalAmount: 0,
      byType: {},
      thisMonth: 0,
      thisWeek: 0
    };
  }

  /**
   * Get charity leaderboard (public charities only)
   */
  static async getCharityLeaderboard(period = 'all', limit = 10) {
    try {
      let dateFilter = {};
      const now = new Date();

      if (period === 'month') {
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'week') {
        dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }

      const users = await User.find({ 'charity.0': { $exists: true } });

      const leaderboard = users.map(user => {
        let charities = user.charity.filter(c => !c.isPrivate);

        if (period !== 'all') {
          charities = charities.filter(c => c.date >= dateFilter);
        }

        return {
          userId: user.userId,
          username: user.username,
          firstName: user.firstName,
          charityCount: charities.length,
          totalAmount: charities.reduce((sum, c) => sum + (c.amount || 0), 0)
        };
      })
        .filter(u => u.charityCount > 0)
        .sort((a, b) => b.charityCount - a.charityCount)
        .slice(0, limit);

      return leaderboard;
    } catch (error) {
      console.error('Error getting charity leaderboard:', error);
      return [];
    }
  }

  /**
   * Format charity history display
   */
  static formatCharityHistory(data) {
    if (!data.success || data.charities.length === 0) {
      return '📊 لم تسجل أي صدقات بعد\n\nابدأ بتسجيل صدقاتك لتتبع أعمالك الخيرية! ❤️';
    }

    let message = '💝 <b>سجل الصدقات</b>\n\n';

    // Statistics
    message += '📊 <b>الإحصائيات:</b>\n';
    message += `• المجموع: ${data.stats.total} صدقة\n`;

    if (data.stats.totalAmount > 0) {
      message += `• القيمة المالية: ${data.stats.totalAmount.toLocaleString()} 💰\n`;
    }

    message += `• هذا الشهر: ${data.stats.thisMonth}\n`;
    message += `• هذا الأسبوع: ${data.stats.thisWeek}\n\n`;

    // By type
    if (Object.keys(data.stats.byType).length > 0) {
      message += '📋 <b>حسب النوع:</b>\n';
      Object.entries(data.stats.byType).forEach(([type, data]) => {
        const emoji = this.getCharityEmoji(type);
        message += `${emoji} ${type}: ${data.count}`;
        if (data.amount > 0) message += ` (${data.amount.toLocaleString()} ريال)`;
        message += '\n';
      });
      message += '\n';
    }

    // Recent charities (last 5)
    message += '📝 <b>آخر الصدقات:</b>\n';
    const recentCharities = data.charities.slice(0, 5);

    recentCharities.forEach((charity, index) => {
      const emoji = this.getCharityEmoji(charity.type);
      const date = new Date(charity.date).toLocaleDateString('ar-SA');

      message += `\n${index + 1}. ${emoji} <b>${charity.type}</b> - ${date}\n`;

      if (charity.description) {
        message += `   └ ${charity.description}\n`;
      }

      if (charity.amount) {
        message += `   └ القيمة: ${charity.amount.toLocaleString()} ريال\n`;
      }
    });

    return message;
  }

  /**
   * Format charity leaderboard
   */
  static formatCharityLeaderboard(leaderboard, period = 'all') {
    if (leaderboard.length === 0) {
      return '❌ لا توجد صدقات مسجلة بعد';
    }

    const periodText = period === 'month' ? 'هذا الشهر' : period === 'week' ? 'هذا الأسبوع' : 'على الإطلاق';

    let message = '💝 <b>لوحة المتصدرين - الصدقات</b>\n';
    message += `📅 ${periodText}\n\n`;

    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

      message += `${medal} ${user.firstName}\n`;
      message += `   └ ${user.charityCount} صدقة`;

      if (user.totalAmount > 0) {
        message += ` | ${user.totalAmount.toLocaleString()} ريال`;
      }

      message += '\n\n';
    });

    message += '\n💡 <i>"من تصدق بعدل تمرة من كسب طيب، ولا يقبل الله إلا الطيب"</i>';

    return message;
  }

  /**
   * Get charity type emoji
   */
  static getCharityEmoji(type) {
    const emojis = {
      'مال': '💰',
      'طعام': '🍽️',
      'ملابس': '👕',
      'وقت': '⏰',
      'علم': '📚',
      'دعاء': '🤲',
      'أخرى': '💝'
    };
    return emojis[type] || '💝';
  }

  /**
   * Get suggested charity types
   */
  static getCharityTypes() {
    return [
      { type: 'مال', emoji: '💰', description: 'صدقة مالية' },
      { type: 'طعام', emoji: '🍽️', description: 'إطعام مسكين' },
      { type: 'ملابس', emoji: '👕', description: 'كساء محتاج' },
      { type: 'وقت', emoji: '⏰', description: 'مساعدة أو تطوع' },
      { type: 'علم', emoji: '📚', description: 'نشر علم نافع' },
      { type: 'دعاء', emoji: '🤲', description: 'دعاء للمسلمين' },
      { type: 'أخرى', emoji: '💝', description: 'صدقة أخرى' }
    ];
  }
}

module.exports = CharityTracker;
