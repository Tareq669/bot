const { User } = require('../database/models');

class MemorizationSystem {
  /**
   * Add verses to memorization list
   */
  static async addMemorization(userId, data) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'مستخدم غير موجود' };

      if (!user.memorization) {
        user.memorization = {
          verses: [],
          reviewSchedule: [],
          stats: {
            totalVerses: 0,
            mastered: 0,
            reviewing: 0
          }
        };
      }

      const memorization = {
        surah: data.surah,
        surahName: data.surahName,
        fromAyah: data.fromAyah,
        toAyah: data.toAyah,
        status: 'memorizing', // 'memorizing', 'review', 'mastered'
        addedDate: new Date(),
        lastReview: null,
        reviewCount: 0,
        masteryLevel: 0, // 0-100
        notes: data.notes || ''
      };

      user.memorization.verses.push(memorization);
      user.memorization.stats.totalVerses += (data.toAyah - data.fromAyah + 1);

      await user.save();

      // Award XP for adding to memorization
      await this.awardMemorizationXP(userId, 10);

      return {
        success: true,
        message: '✅ تمت إضافة الآيات للحفظ بنجاح!',
        memorization
      };
    } catch (error) {
      console.error('Error adding memorization:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Record a review session
   */
  static async recordReview(userId, memorizationId, performance) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.memorization) {
        return { success: false, message: 'لا توجد آيات محفوظة' };
      }

      const verse = user.memorization.verses.id(memorizationId);
      if (!verse) {
        return { success: false, message: 'الآية غير موجودة' };
      }

      // Update verse data
      verse.lastReview = new Date();
      verse.reviewCount++;

      // Update mastery based on performance (1-5 rating)
      const masteryIncrease = performance * 5; // 5-25 points per review
      verse.masteryLevel = Math.min(100, verse.masteryLevel + masteryIncrease);

      // Update status based on mastery
      if (verse.masteryLevel >= 80) {
        verse.status = 'mastered';
        user.memorization.stats.mastered++;
      } else if (verse.masteryLevel >= 40) {
        verse.status = 'review';
        user.memorization.stats.reviewing++;
      }

      await user.save();

      // Award XP based on performance
      const xpReward = performance * 10;
      await this.awardMemorizationXP(userId, xpReward);

      // Schedule next review
      await this.scheduleNextReview(userId, memorizationId, verse.masteryLevel);

      return {
        success: true,
        message: `✅ تم تسجيل المراجعة!\n\n📊 مستوى الإتقان: ${verse.masteryLevel}%\n🎁 المكافأة: ${xpReward} XP`,
        verse,
        xpReward
      };
    } catch (error) {
      console.error('Error recording review:', error);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * Schedule next review based on spaced repetition
   */
  static async scheduleNextReview(userId, memorizationId, masteryLevel) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      // Calculate next review date based on mastery (spaced repetition)
      let daysUntilReview;
      if (masteryLevel < 30) daysUntilReview = 1;
      else if (masteryLevel < 50) daysUntilReview = 3;
      else if (masteryLevel < 70) daysUntilReview = 7;
      else if (masteryLevel < 90) daysUntilReview = 14;
      else daysUntilReview = 30;

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

      // Add to review schedule
      const scheduleEntry = {
        memorizationId,
        dueDate: nextReviewDate,
        notified: false
      };

      if (!user.memorization.reviewSchedule) {
        user.memorization.reviewSchedule = [];
      }

      user.memorization.reviewSchedule.push(scheduleEntry);
      await user.save();
    } catch (error) {
      console.error('Error scheduling review:', error);
    }
  }

  /**
   * Get due reviews
   */
  static async getDueReviews(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.memorization) return [];

      const now = new Date();
      const dueReviews = user.memorization.reviewSchedule.filter(
        r => r.dueDate <= now && !r.notified
      );

      // Get full verse data for each due review
      const dueVerses = dueReviews.map(review => {
        const verse = user.memorization.verses.id(review.memorizationId);
        return { ...verse.toObject(), scheduleId: review._id };
      });

      return dueVerses;
    } catch (error) {
      console.error('Error getting due reviews:', error);
      return [];
    }
  }

  /**
   * Get memorization statistics
   */
  static async getMemorizationStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.memorization) {
        return {
          totalVerses: 0,
          memorizing: 0,
          reviewing: 0,
          mastered: 0,
          dueReviews: 0,
          averageMastery: 0,
          streak: 0
        };
      }

      const verses = user.memorization.verses;
      const memorizing = verses.filter(v => v.status === 'memorizing').length;
      const reviewing = verses.filter(v => v.status === 'review').length;
      const mastered = verses.filter(v => v.status === 'mastered').length;

      const totalMastery = verses.reduce((sum, v) => sum + v.masteryLevel, 0);
      const averageMastery = verses.length > 0 ? Math.round(totalMastery / verses.length) : 0;

      const dueReviews = await this.getDueReviews(userId);

      return {
        totalVerses: user.memorization.stats.totalVerses,
        memorizing,
        reviewing,
        mastered,
        dueReviews: dueReviews.length,
        averageMastery,
        streak: this.calculateStreak(verses)
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Calculate review streak
   */
  static calculateStreak(verses) {
    if (verses.length === 0) return 0;

    const sortedReviews = verses
      .filter(v => v.lastReview)
      .sort((a, b) => b.lastReview - a.lastReview);

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const verse of sortedReviews) {
      const reviewDate = new Date(verse.lastReview);
      reviewDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate - reviewDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0 || daysDiff === 1) {
        streak++;
        currentDate = reviewDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Award XP for memorization activities
   */
  static async awardMemorizationXP(userId, amount) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      user.xp += amount;
      await user.save();
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  }

  /**
   * Format memorization display
   */
  static formatMemorization(verses) {
    if (!verses || verses.length === 0) {
      return '📖 لم تضف أي آيات للحفظ بعد\n\nابدأ رحلة الحفظ الآن! 🌟';
    }

    let message = '📖 <b>قائمة الحفظ</b>\n\n';

    verses.forEach((verse, index) => {
      const statusEmoji = verse.status === 'mastered' ? '✅' :
        verse.status === 'review' ? '🔄' : '📝';
      const masteryBar = this.getMasteryBar(verse.masteryLevel);

      message += `${index + 1}. ${statusEmoji} <b>${verse.surahName}</b>\n`;
      message += `   └ الآيات: ${verse.fromAyah}-${verse.toAyah}\n`;
      message += `   └ ${masteryBar} ${verse.masteryLevel}%\n`;

      if (verse.lastReview) {
        const daysSince = Math.floor((new Date() - verse.lastReview) / (1000 * 60 * 60 * 24));
        message += `   └ آخر مراجعة: منذ ${daysSince} يوم\n`;
      }

      message += '\n';
    });

    return message;
  }

  /**
   * Format memorization stats
   */
  static formatStats(stats) {
    if (!stats) return '❌ لا توجد إحصائيات';

    let message = '📊 <b>إحصائيات الحفظ</b>\n\n';

    message += `📖 إجمالي الآيات: ${stats.totalVerses}\n\n`;

    message += `📝 قيد الحفظ: ${stats.memorizing}\n`;
    message += `🔄 قيد المراجعة: ${stats.reviewing}\n`;
    message += `✅ متقن: ${stats.mastered}\n\n`;

    message += `⏰ مراجعات مستحقة: ${stats.dueReviews}\n`;
    message += `📈 متوسط الإتقان: ${stats.averageMastery}%\n`;
    message += `🔥 سلسلة المراجعة: ${stats.streak} يوم\n\n`;

    const masteryBar = this.getMasteryBar(stats.averageMastery);
    message += `${masteryBar}\n\n`;

    if (stats.dueReviews > 0) {
      message += `⚠️ لديك ${stats.dueReviews} مراجعة مستحقة اليوم!`;
    } else {
      message += '✨ أحسنت! لا توجد مراجعات مستحقة اليوم.';
    }

    return message;
  }

  /**
   * Get mastery progress bar
   */
  static getMasteryBar(level) {
    const filled = Math.floor(level / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get memorization tips
   */
  static getMemorizationTips() {
    return [
      '📚 احفظ في وقت الفجر - أفضل أوقات الحفظ',
      '🔄 راجع المحفوظ قبل حفظ الجديد',
      '📝 اكتب ما حفظته لتقوية الذاكرة',
      '🎯 حدد هدفاً يومياً صغيراً والتزم به',
      '🤲 ابدأ وختم بالدعاء',
      '💪 لا تستعجل - الثبات مع القلة خير من الكثرة مع الترك',
      '👥 شارك محفوظك مع صديق للتشجيع',
      '🎧 استمع للقارئ المفضل لديك'
    ];
  }
}

module.exports = MemorizationSystem;
